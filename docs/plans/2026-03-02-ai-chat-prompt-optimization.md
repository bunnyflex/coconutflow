# AI Chat Prompt Optimization & Markdown Rendering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix raw markdown stars in chat responses by adding `react-markdown` rendering, and rewrite the system prompt with a "Coco" persona that's casual, asks numbered-option questions, and produces clean short responses.

**Architecture:** Two independent changes: (1) Frontend — update `MessageBubble` to render assistant messages through `ReactMarkdown` with Tailwind prose styling. (2) Backend — rewrite `SYSTEM_PROMPT` in `chat.py` with Coco persona, slimmed node reference, and option-based clarifying question behavior. Also update AIChatPanel welcome text to reference Coco.

**Tech Stack:** react-markdown (already installed), @tailwindcss/typography (already installed), remark-gfm (needs install), Tailwind `prose prose-invert` classes

---

## Task 1: Add markdown rendering to MessageBubble

Render assistant and system messages through `react-markdown` so bold, lists, and code blocks display properly. User messages stay as plain text.

**Files:**
- Modify: `frontend/src/components/panels/AIChatPanel.tsx:202-219` (MessageBubble component)
- Modify: `frontend/package.json` (add remark-gfm)

**Step 1: Install remark-gfm**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
PATH="/opt/homebrew/bin:$PATH" npm install remark-gfm
```

`react-markdown` and `@tailwindcss/typography` are already installed. `remark-gfm` adds GitHub-flavored markdown support (tables, strikethrough, task lists).

**Step 2: Update MessageBubble to render markdown**

In `frontend/src/components/panels/AIChatPanel.tsx`, add the import at the top:

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
```

Then replace the `MessageBubble` function (around line 202-219) with:

```tsx
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600/80 text-white'
            : message.role === 'system'
              ? 'bg-red-900/30 border border-red-800/50 text-red-300'
              : 'bg-gray-800/80 text-gray-200'
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
```

Key details:
- `prose prose-invert prose-sm` — dark theme, small text matching the chat UI
- `max-w-none` — prevent prose from adding its own max-width (the parent already constrains to 85%)
- `prose-p:my-1 prose-ul:my-1 ...` — tighten spacing for chat-appropriate density
- User messages render as plain text (no markdown processing needed)
- Assistant and system messages both go through ReactMarkdown

**Step 3: Verify TypeScript compilation**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/package.json frontend/package-lock.json frontend/src/components/panels/AIChatPanel.tsx
git commit -m "feat: render markdown in AI chat messages with react-markdown"
```

---

## Task 2: Rewrite system prompt with Coco persona

Replace the current verbose system prompt with a personality-driven prompt for "Coco" — casual, chatty (light emoji), asks numbered-option clarifying questions, and produces short actionable responses.

**Files:**
- Modify: `backend/app/api/chat.py:25-105` (NODE_TYPES_REFERENCE and SYSTEM_PROMPT)

**Step 1: Replace NODE_TYPES_REFERENCE and SYSTEM_PROMPT**

In `backend/app/api/chat.py`, replace the `NODE_TYPES_REFERENCE` (lines 25-59) and `SYSTEM_PROMPT` (lines 61-105) with:

```python
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
```

**Step 2: Run backend tests**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/backend && python3 -m pytest tests/test_chat_api.py -v
```

Expected: All tests pass (the tests check `_extract_mutations` and `_clean_message`, not the prompt content).

**Step 3: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add backend/app/api/chat.py
git commit -m "feat: rewrite AI chat system prompt with Coco persona"
```

---

## Task 3: Update AIChatPanel welcome message for Coco

Change the empty state welcome text from generic "What would you like to build?" to Coco-branded messaging.

**Files:**
- Modify: `frontend/src/components/panels/AIChatPanel.tsx:155-163` (empty state section)

**Step 1: Update the welcome message**

In `frontend/src/components/panels/AIChatPanel.tsx`, find the empty state block (around line 155):

```tsx
{messages.length === 0 && (
  <div className="text-center py-8 space-y-2">
    <Sparkles size={24} className="text-indigo-400/60 mx-auto" />
    <p className="text-sm text-gray-400">What would you like to build?</p>
    <p className="text-xs text-gray-600">Describe your workflow and I'll create it on the canvas.</p>
  </div>
)}
```

Replace with:

```tsx
{messages.length === 0 && (
  <div className="text-center py-8 space-y-2">
    <span className="text-2xl block">🥥</span>
    <p className="text-sm text-gray-300 font-medium">Hey, I'm Coco!</p>
    <p className="text-xs text-gray-500">Tell me what you want to build and I'll set it up on the canvas for you.</p>
  </div>
)}
```

Also update the header title from "AI Assistant" to "Coco" (around line 143):

```tsx
<h3 className="text-sm font-semibold text-gray-200">Coco</h3>
```

**Step 2: Verify TypeScript compilation**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/components/panels/AIChatPanel.tsx
git commit -m "feat: brand AI chat panel as Coco with updated welcome message"
```

---

## Summary

| Task | What it delivers |
|------|-----------------|
| 1 | Markdown rendering in chat (fixes stars) — `react-markdown` + `prose` styling |
| 2 | Coco persona system prompt — casual, option-based questions, slim node reference |
| 3 | Coco-branded welcome message and panel header |

Total: 3 tasks. Tasks 1 and 2 are independent (frontend vs backend). Task 3 depends on Task 1 (same file).
