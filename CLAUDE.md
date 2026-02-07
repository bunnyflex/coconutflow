# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoconutFlow (AgnoFlow) is a no-code visual builder for creating and executing AI agent workflows powered by the Agno framework. Users drag nodes onto a canvas, connect them into a DAG, configure properties, and execute the flow with real-time streaming results.

## Commands

### Frontend (from `frontend/`)
```bash
npm install          # Install dependencies
npm run dev          # Dev server at localhost:5173
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint on TypeScript files
```

### Backend (from `backend/`)
```bash
pip install -r requirements.txt                    # Install dependencies
cp .env.example .env                               # Set up environment (then fill in API keys)
uvicorn app.main:app --reload --port 8000          # Dev server at localhost:8000
```

### Docker (full stack)
```bash
docker-compose up --build    # Frontend on :3000 (Nginx), Backend on :8000
```

### E2E Tests (from project root)
```bash
npx playwright test                        # Run all e2e tests
npx playwright test e2e/chat-panel.spec.ts # Run a single test file
```

## Architecture

### Compile-then-Execute Pipeline

The core architecture follows a compiler pattern:

1. **Frontend Canvas** — User builds a flow as a directed graph of nodes and edges using React Flow. State lives in a single Zustand store (`frontend/src/store/flowStore.ts`).

2. **Serialization** — `frontend/src/services/flowTransform.ts` converts the React Flow state into a `FlowDefinition` JSON matching the backend Pydantic models.

3. **WebSocket Trigger** — Execution starts via WebSocket (`/ws/execution`), not REST. The frontend sends the full flow definition.

4. **Compilation** (`backend/app/compiler/flow_compiler.py`) — `FlowCompiler` validates the DAG, builds an adjacency graph, performs topological sort (cycle detection), and delegates each node to its type-specific compiler.

5. **Node Compilers** (`backend/app/compiler/nodes/`) — Plugin architecture via `BaseNodeCompiler` abstract class. Each node type has a compiler that transforms config into a runtime Agno object (Agent, Tool, etc.). New node types are added by subclassing `BaseNodeCompiler` and registering in `__init__.py`.

6. **Execution** (`backend/app/services/execution_engine.py`) — Walks compiled nodes in topological order, feeds upstream outputs as context, calls Agno agents async, and yields streaming `ExecutionEvent` objects back over the WebSocket.

### Frontend Structure

- **`components/nodes/`** — One React component per node type, all wrapped by `NodeShell.tsx`
- **`components/panels/`** — Left sidebar (node library), right sidebar (config panel), floating chat panel
- **`components/panels/config/`** — Node-type-specific configuration forms (one per node type)
- **`store/flowStore.ts`** — Zustand store: single source of truth for nodes, edges, selection, and execution state. Includes undo history (20 entries).
- **`services/api.ts`** — HTTP client for flow CRUD; `services/websocket.ts` — WebSocket client for execution streaming

### Backend Structure

- **`api/flows.py`** — REST endpoints for flow CRUD (`/api/flows`)
- **`api/websocket.py`** — WebSocket endpoint for flow execution (`/ws/execution`)
- **`api/upload.py`** — File upload for knowledge base documents
- **`models/flow.py`** — Pydantic models defining the flow JSON schema (shared contract with frontend TypeScript types in `frontend/src/types/flow.ts`)
- **`compiler/`** — Flow compilation with plugin-based node compilers
- **`services/execution_engine.py`** — Async execution engine with streaming events

### Execution Events (WebSocket protocol)

Events streamed during execution: `node_start`, `node_output`, `node_complete`, `flow_complete`, `error`. Each carries `type`, `node_id`, `data`, `message`, and `timestamp`.

## Node Types (V1)

| Node Type | Frontend Component | Backend Compiler | Purpose |
|-----------|-------------------|-----------------|---------|
| Input | `InputNode.tsx` | `input_compiler.py` | Data entry point |
| LLM Agent | `LLMAgentNode.tsx` | `agent_compiler.py` | AI processing via Agno Agent |
| Web Search | `WebSearchNode.tsx` | `web_search_compiler.py` | DuckDuckGo search tool |
| Knowledge Base | `KnowledgeBaseNode.tsx` | `knowledge_base_compiler.py` | RAG with pgvector |
| Conditional | `ConditionalNode.tsx` | `conditional_compiler.py` | If/else branching (LLM-evaluated) |
| Output | `OutputNode.tsx` | `output_compiler.py` | Final output aggregation |

## Key Conventions

- **Type parity**: TypeScript types in `frontend/src/types/flow.ts` mirror Pydantic models in `backend/app/models/flow.py`. Keep them in sync.
- **Adding a node type**: Create a frontend component in `components/nodes/`, a config form in `components/panels/config/`, a backend compiler extending `BaseNodeCompiler` in `compiler/nodes/`, and register it in `compiler/nodes/__init__.py`.
- **LLM providers**: OpenAI, Anthropic, Google, Groq, Ollama — configured via environment variables and selectable per-agent node.
- **Flow storage is in-memory** on the backend (dict-based). Supabase persistence is planned but not yet wired.
- **CORS is wide open** in `backend/app/main.py` — needs lockdown for production.
