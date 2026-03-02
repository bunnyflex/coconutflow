# AI Chat Prompt Optimization & Markdown Rendering — Design Doc

**Date:** 2026-03-02
**Status:** Approved
**Goal:** Fix raw markdown stars showing in chat responses, rewrite the system prompt with a "Coco" persona that's casual, smart, and asks clarifying questions as numbered options.

---

## Problem

Two issues with the current AI chat:

1. **Stars in responses**: The LLM (GPT-4o) responds with markdown formatting (`**bold**`, `*italic*`, lists), but `MessageBubble` renders `{message.content}` as raw text. Users see literal asterisks.

2. **System prompt is generic**: The current prompt is a wall of config schemas with no personality. It doesn't guide the AI on tone, question-asking behavior, or response length.

---

## Solution

### Part 1: Markdown Rendering

- Install `react-markdown` + `remark-gfm` (GitHub-flavored markdown)
- Update `MessageBubble` to render **assistant** messages through `<ReactMarkdown>`
- User messages stay as plain text
- Style with Tailwind `prose` classes (dark variant) for headings, lists, code blocks, bold

### Part 2: Coco Persona & System Prompt Rewrite

**Persona:**
- Name: **Coco** — CoconutFlow's AI flow builder
- Tone: Casual and chatty, like a smart coworker. Light emoji usage (welcome messages, occasional emphasis) — not every sentence.
- Short responses: 2-3 sentences when building. Lead with what you did, not what you're about to do.

**Clarifying behavior:**
- When a request is vague, ask clarifying questions as **numbered options**
- Example: "Which model do you want?\n1. GPT-4o — fast & smart\n2. Claude Sonnet — great at writing\n3. Gemini Flash — budget-friendly"
- Max 1-2 questions before building. Don't interrogate.

**Node reference (slimmed down):**
- Brief purpose-focused descriptions instead of full config schemas
- Keep detailed configs in a compact reference section (the AI needs them for accurate generation, but they shouldn't dominate the prompt)

**Response rules:**
- Use markdown formatting for readability (bold, lists, short code)
- When building: lead with result ("Done! Added a web scraper..."), not intent ("I'm going to add...")
- When asking questions: numbered options, easy to pick
- When chatting: be helpful, don't force flow-building

**Welcome message update:**
- Change AIChatPanel empty state from "What would you like to build?" to Coco-branded welcome

---

## Files to Change

| File | Change |
|------|--------|
| `frontend/package.json` | Add `react-markdown`, `remark-gfm` |
| `frontend/src/components/panels/AIChatPanel.tsx` | Render markdown in MessageBubble, update welcome message |
| `backend/app/api/chat.py` | Rewrite `SYSTEM_PROMPT` with Coco persona |

---

## What's NOT Changing

- Mutation format stays the same (JSON code blocks)
- `_extract_mutations` / `_clean_message` logic stays the same
- LLM model (GPT-4o) and parameters (temp=0.3, max_tokens=4000) stay the same
- No function calling migration (future improvement)
