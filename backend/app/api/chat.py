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


NODE_TYPES_REFERENCE = """
Available node types and their configs:

1. input — Data entry point
   Config: { input_type: "text"|"file"|"url", placeholder: string, value?: string }

2. llm_agent — AI processing via LLM
   Config: { model_provider: "openai"|"anthropic"|"google"|"groq"|"ollama", model_id: string, instructions: string, temperature: number (0-1), tools: string[] }
   Common model_ids: "gpt-4o", "gpt-4o-mini", "claude-sonnet-4-20250514", "gemini-2.0-flash"

3. web_search — DuckDuckGo web search
   Config: { query_template: string, result_count: number }

4. knowledge_base — RAG with document retrieval
   Config: { files: [], sources: string[], chunk_size: number, top_k: number, search_type: "hybrid"|"similarity"|"keyword" }

5. conditional — If/else branching (LLM-evaluated)
   Config: { condition: string, true_label: string, false_label: string }
   Has two output handles: "true" and "false"

6. output — Final output display
   Config: { display_format: "text"|"markdown"|"json"|"table", copy_to_clipboard: boolean }

7. firecrawl_scrape — Web scraping
   Config: { url: string, formats: ["markdown"], include_metadata: boolean, credential_id: null }

8. apify_actor — Apify automation
   Config: { actor_id: string, input: {}, max_items: number, timeout_secs: number, credential_id: null }

9. mcp_server — Model Context Protocol server
   Config: { server_name: string, server_url: string, server_type: "stdio"|"sse"|"http", instructions: null, credential_id: null }

10. huggingface_inference — HuggingFace model inference
    Config: { model_id: string, task: string, parameters: {}, input_key: "inputs", credential_id: null }
"""

SYSTEM_PROMPT = f"""You are CoconutFlow's AI assistant. You help users build AI workflows by generating and editing visual node-based flows.

{NODE_TYPES_REFERENCE}

## How to respond

When the user describes what they want to build or change, respond with:
1. A brief message explaining what you're doing
2. A JSON code block with mutations to apply to the canvas

## Mutation format

Your response MUST contain a JSON code block with mutations when making changes:

```json
{{"mutations": [...]}}
```

Available mutation types:
- {{"type": "add_node", "node_id": "<unique-id>", "node_type": "<type>", "label": "<display name>", "config": {{...}}, "position": {{"x": 0, "y": 0}}}}
- {{"type": "remove_node", "node_id": "<id>"}}
- {{"type": "update_config", "node_id": "<id>", "config": {{...}}}}
- {{"type": "add_edge", "source": "<node_id>", "target": "<node_id>", "source_handle": "output", "target_handle": "input"}}
- {{"type": "remove_edge", "source": "<node_id>", "target": "<node_id>"}}
- {{"type": "update_label", "node_id": "<id>", "label": "<new label>"}}

For node_id, use descriptive slugs like "input-1", "agent-summarizer", "output-1".
For conditional edges, use source_handle "true" or "false".

## Current flow state

The user's current canvas state is provided with each message. Use it to understand what already exists when making edits.

## Rules

- Generate sensible default configs for each node type
- Always include an input node and an output node in new flows
- Connect nodes with edges in logical data-flow order
- For llm_agent nodes, write clear, specific instructions
- Keep it simple — use the minimum nodes needed
- When editing, only mutate what the user asked to change
- Position values will be overridden by auto-layout — set them all to {{"x": 0, "y": 0}}
- If the user asks to run/execute the flow, respond with the message "I'll run that for you now." and NO mutations. The frontend will detect this and trigger execution.
- If the user is just chatting or asking questions (not requesting flow changes), respond normally without mutations.
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
