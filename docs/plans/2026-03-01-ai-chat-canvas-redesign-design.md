# AI Chat Panel & Canvas Layout Redesign — Design Doc

**Date:** 2026-03-01
**Status:** Approved
**Goal:** Replace the drag-and-drop-first UX with an AI-chat-first experience. Users describe what they want to build in natural language; the AI generates and edits flows on the canvas. The canvas layout is reorganized to make room for a persistent AI chat panel.

---

## Problem

The current UX assumes users know what nodes to use and how to connect them. Most users know their *problem* ("I want to scrape competitors and summarize findings") but not the *architecture* (Firecrawl → LLM Agent → Output). The drag-and-drop canvas is powerful for editing, but it's a poor entry point.

## Solution

Two changes shipped in three phases:

1. **Canvas layout redesign** — bigger canvas, controls at bottom, node library moved to collapsible `+` on right, left side freed for AI chat
2. **AI chat panel** — persistent left panel that generates, edits, and executes flows through natural language conversation

---

## Layout Redesign

### Current Layout

```
┌─────────┬─────────────────────┬──────────┐
│ Node    │     Canvas          │ Config   │
│ Sidebar │  [toolbar - top]    │ Panel    │
│ (left)  │  [ChatPanel-float]  │ (right)  │
└─────────┴─────────────────────┴──────────┘
```

### New Layout

```
┌──────────────┬──────────────────────────[+]┐
│              │                              │
│  AI Chat     │         CANVAS              │
│  Panel       │       (full area)            │
│              │                              │
│  always open │                              │
│  collapsible │                              │
│              │                              │
│              ├──────────────────────────────│
│              │  [ toolbar / controls ]      │
└──────────────┴──────────────────────────────┘
```

### Element Changes

| Element | Current | New |
|---------|---------|-----|
| Node Sidebar | Left, always expanded | Right, collapsed by default (just a `+` icon). Expands as overlay/drawer |
| Canvas | Squeezed between panels | Full remaining width |
| Toolbar | Top of canvas | Bottom of canvas |
| Config Panel | Right on node click | Stays right, opens on node click (overlays the `+` area) |
| AI Chat | Doesn't exist | New left panel, always open by default, collapsible |
| Old ChatPanel | Floating execution chat | Removed — merged into AI Chat |

---

## AI Chat Panel — Behavior

### Three Modes (same panel, context-aware)

**Mode 1: Flow Generation (empty canvas)**
- Opens with "What would you like to build?"
- User describes the problem in natural language
- AI asks clarifying questions if needed
- AI generates the full flow — nodes, edges, positions, configs — and places them on canvas

**Mode 2: Flow Editing (existing flow)**
- "Add a web search before the summarizer" → AI adds node + edges
- "Change the model to Claude on the second agent" → AI updates config
- "Remove the conditional branch" → AI deletes nodes/edges
- Bidirectional: user manually edits canvas → AI sees changes and can reference them

**Mode 3: Flow Execution**
- "Run it" or "run it with 'latest AI trends'" → triggers execution
- Results stream back into same chat thread
- Node status updates inline
- "Change the prompt and run again" works naturally

### Canvas State Awareness

Every AI request includes the current flow state (nodes, edges, configs). Manual canvas edits and chat edits are always in sync. The AI never has a stale view.

### Chat Persistence

Chat history is per-flow, saved with the flow. New flow = fresh conversation. Loading existing flow restores chat history.

---

## Technical Architecture

### Backend — New Endpoint

```
POST /api/chat
Body: {
  "messages": [...chat history...],
  "flow_state": { nodes, edges },
  "action": "chat" | "execute"
}
Response: SSE stream — text reply and/or flow mutations
```

Server-side LLM key (our cost for now — credits/subscription model later). The backend sends chat + flow state to the LLM with a system prompt that teaches it the 10 node types, their configs, and the mutation format.

### LLM Response Format

The AI returns text messages and/or structured flow mutations:

```json
{
  "message": "I've added a web scraper and connected it to your summarizer.",
  "mutations": [
    { "type": "add_node", "node_type": "firecrawl_scrape", "config": {...}, "position": { "x": 200, "y": 300 } },
    { "type": "add_edge", "source": "node_1", "target": "new_node_id" },
    { "type": "update_config", "node_id": "node_2", "config": { "instructions": "..." } },
    { "type": "remove_node", "node_id": "node_3" },
    { "type": "remove_edge", "edge_id": "edge_1" }
  ]
}
```

### Frontend — Applying Mutations

Mutations map to existing flowStore actions:
- `add_node` → `addNode()`
- `remove_node` → `deleteNode()`
- `update_config` → `updateNodeConfig()`
- `add_edge` → `addEdge()`
- `remove_edge` → `deleteEdge()`

Undo works naturally via existing undo history (20 entries).

### Auto-Layout

When generating multiple nodes, use a simple left-to-right DAG layout: topological order → assign x by depth, y by index at that depth. Reasonable spacing so nodes don't overlap.

### Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Protocol | REST with SSE streaming | Simpler than WebSocket for request/response. Existing WS stays for execution |
| LLM for chat | Server-side key (our cost) | Free credits initially, BYOK/subscription later |
| Mutation format | Structured JSON actions | Frontend validates and applies atomically. Undo works naturally |
| Flow state passing | Send full state each request | Stateless backend, no sync issues. Flow state < 50KB |

---

## Phasing

### Phase 1: Layout Redesign (no AI yet)
- Move node sidebar to right (collapsible `+`)
- Move toolbar to bottom
- Add left panel shell (chat UI with no AI backend yet)
- Remove old floating ChatPanel
- **Independently shippable** — cleaner layout, bigger canvas

### Phase 2: AI Chat — Flow Generation & Editing
- `/api/chat` backend endpoint with server-side LLM
- System prompt with node type knowledge
- Mutation format: add/remove/update nodes and edges
- Auto-layout for generated flows
- Canvas state awareness
- Chat history per flow

### Phase 3: Unified Execution
- "Run it" detection in chat → delegates to existing WebSocket execution engine
- Execution results stream inline in chat
- Node status updates in chat
- Old ChatPanel fully replaced

Each phase is independently shippable. Phase 1 is pure frontend, Phase 2 is the core feature, Phase 3 ties it together.

## Implementation Note

Implementation will use Claude Code agent teams for parallel development across phases.
