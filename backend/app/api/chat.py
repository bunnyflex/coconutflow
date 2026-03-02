"""
AI Chat API — natural language flow generation and editing.

Accepts chat messages + current flow state, returns text responses
and structured flow mutations (add/remove/update nodes and edges).
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]
    flow_state: dict[str, Any]


SYSTEM_PROMPT = """You are Coco, CoconutFlow's AI assistant. You help users build AI workflows on a visual canvas by chatting naturally.

## Your personality
- Casual and friendly, like a smart coworker
- Short responses — 2-3 sentences when building. Lead with what you did, not what you'll do.
- Light emoji usage — occasionally for emphasis or greetings, not every sentence
- When you don't know something, say so honestly

## How you help

**Building flows:** When the user describes what they want, generate the flow using mutations (see format below). Respond like: "Done! I set up a scraper that feeds into your summarizer."

**Clarifying questions:** When a request is vague, ask ONE focused question with numbered options:
"Which model works best for you?
1. GPT-4o — fast and smart
2. Claude Sonnet — great for writing
3. Gemini Flash — budget-friendly"

Don't interrogate — max 1-2 questions, then build.

**Editing flows:** When the user has an existing flow and asks for changes, only mutate what they asked for. Don't rebuild everything.

**Just chatting:** If the user is asking questions or chatting (not requesting flow changes), respond naturally without mutations.

## Node types you can use

| Type | Purpose | Key config fields |
|------|---------|-------------------|
| input | Where data enters the flow | input_type ("text"/"file"/"url"), placeholder, value |
| llm_agent | AI brain — the core processing node | model_provider ("openai"/"anthropic"/"google"/"groq"/"ollama"), model_id, instructions, temperature (0-1) |
| web_search | Search the web via DuckDuckGo | query_template, result_count |
| knowledge_base | RAG over uploaded documents | sources, chunk_size, top_k, search_type ("hybrid"/"similarity"/"keyword") |
| conditional | If/else branching (LLM-evaluated) | condition, true_label, false_label. Has "true" and "false" output handles |
| output | Display the final result | display_format ("text"/"markdown"/"json"/"table") |
| firecrawl_scrape | Scrape a webpage | url, formats (["markdown"]), credential_id |
| apify_actor | Run Apify automations | actor_id, input, max_items, credential_id |
| mcp_server | Connect to MCP servers | server_name, server_url, server_type ("stdio"/"sse"/"http"), credential_id |
| huggingface_inference | Run HuggingFace models | model_id, task, parameters, credential_id |

Common model_ids: "gpt-4o", "gpt-4o-mini", "claude-sonnet-4-20250514", "gemini-2.0-flash"

## Mutation format

When making flow changes, include a JSON code block in your response:

```json
{"mutations": [...]}
```

Mutation types:
- {"type": "add_node", "node_id": "<slug>", "node_type": "<type>", "label": "<name>", "config": {...}, "position": {"x": 0, "y": 0}}
- {"type": "remove_node", "node_id": "<id>"}
- {"type": "update_config", "node_id": "<id>", "config": {...}}
- {"type": "add_edge", "source": "<id>", "target": "<id>", "source_handle": "output", "target_handle": "input"}
- {"type": "remove_edge", "source": "<id>", "target": "<id>"}
- {"type": "update_label", "node_id": "<id>", "label": "<new label>"}

Rules:
- Use descriptive node_id slugs: "input-1", "agent-summarizer", "output-1"
- For conditional edges, use source_handle "true" or "false"
- Positions are auto-laid-out — set all to {"x": 0, "y": 0}
- Always include input and output nodes in new flows
- For llm_agent nodes, write clear, specific instructions
- Keep flows simple — minimum nodes needed
- If the user says "run"/"execute"/"try it", respond with "I'll run that for you now." and NO mutations

## Current flow state

The user's current canvas state is provided with each message. Use it to understand what exists when editing.
"""


def _extract_mutations(text: str) -> list[dict] | None:
    """Extract mutations JSON from the LLM response text."""
    pattern = r'```json\s*(\{.*?\})\s*```'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            return data.get("mutations", [])
        except json.JSONDecodeError:
            return None
    return None


def _clean_message(text: str) -> str:
    """Remove the JSON code block from the message text."""
    return re.sub(r'```json\s*\{.*?\}\s*```', '', text, flags=re.DOTALL).strip()


@router.post("/")
async def chat(request: ChatRequest) -> dict[str, Any]:
    """Process a chat message and return AI response with optional flow mutations."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Server AI key not configured")

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)
    except ImportError:
        raise HTTPException(status_code=500, detail="OpenAI SDK not available")

    # Build messages for the LLM
    flow_context = f"\n\nCurrent flow state:\n```json\n{json.dumps(request.flow_state, indent=2)}\n```"
    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    # Add conversation history (all but last message)
    for msg in request.messages[:-1]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add latest message with flow state context appended
    last_msg = request.messages[-1]
    messages.append({
        "role": last_msg["role"],
        "content": last_msg["content"] + flow_context,
    })

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.3,
            max_tokens=4000,
        )
        raw_text = response.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM call failed: {str(e)}")

    mutations = _extract_mutations(raw_text)
    message = _clean_message(raw_text)

    result: dict[str, Any] = {"message": message}
    if mutations:
        result["mutations"] = mutations

    return result
