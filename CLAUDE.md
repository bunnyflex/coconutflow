# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoconutFlow (AgnoFlow) is a no-code visual builder for creating and executing AI agent workflows powered by the Agno framework. Users drag nodes onto a canvas, connect them into a DAG, configure properties, and execute the flow with real-time streaming results. Backed by Supabase for persistence, auth, and pgvector embeddings.

## Commands

### Frontend (from `frontend/`)
```bash
npm install          # Install dependencies
npm run dev          # Dev server at localhost:5173
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint on TypeScript files
```

### Backend (from `backend/`)
```bash
pip install -r requirements.txt                    # Install dependencies
cp .env.example .env                               # Set up environment (then fill in API keys)
uvicorn app.main:app --reload --port 8000          # Dev server at localhost:8000
```

### Database (Supabase)
Run migrations in order via the Supabase SQL editor:
1. `backend/migrations/001_create_flows_table.sql` — flows table with JSONB columns
2. `backend/migrations/002_create_credentials_table.sql` — encrypted credential storage
3. `backend/migrations/003_add_template_columns.sql` — is_featured, is_public, category
4. `backend/migrations/004_add_user_id_to_flows.sql` — user-scoped flow access

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`. Use Session Pooler URL (`*.pooler.supabase.com`) for IPv4 compatibility — direct connection (`db.*.supabase.com`) requires IPv6.

### Tests
```bash
# Backend unit tests (from backend/, no API key needed)
pytest tests/ -v
pytest tests/test_flow_compilation.py -v           # Run a single test file

# Integration tests (needs OPENAI_API_KEY)
OPENAI_API_KEY=... pytest tests/test_conditional_integration.py -v

# E2E tests with Playwright (from project root, needs both servers running)
npx playwright test                                # Run all e2e tests
npx playwright test e2e/chat-panel.spec.ts         # Run a single e2e test
```

### Docker (full stack)
```bash
docker-compose up --build    # Frontend on :3000 (Nginx), Backend on :8000
```

## Architecture

### Compile-then-Execute Pipeline

The core architecture follows a compiler pattern:

1. **Frontend Canvas** — User builds a flow as a directed graph using React Flow. State lives in a Zustand store (`frontend/src/store/flowStore.ts`).

2. **Serialization** — `frontend/src/services/flowTransform.ts` converts React Flow state into a `FlowDefinition` JSON matching the backend Pydantic models.

3. **WebSocket Trigger** — Execution starts via WebSocket (`/ws/execution`), not REST. The frontend sends the full flow definition.

4. **Compilation** (`backend/app/compiler/flow_compiler.py`) — `FlowCompiler` validates the DAG, builds an adjacency graph, performs topological sort (cycle detection), and delegates each node to its type-specific compiler.

5. **Node Compilers** (`backend/app/compiler/nodes/`) — Plugin architecture via `BaseNodeCompiler` abstract class. Each node type has a compiler that transforms config into a runtime Agno object. New node types are added by subclassing `BaseNodeCompiler` and registering in `__init__.py`'s `ALL_COMPILERS` list.

6. **Execution** (`backend/app/services/execution_engine.py`) — Walks compiled nodes in topological order, feeds upstream outputs as context, calls Agno agents async, and yields streaming `ExecutionEvent` objects back over the WebSocket.

### Frontend Structure

**Stack**: React 18 + Vite + React Flow 11.11 + Zustand 5 + Tailwind CSS 4 + React Router 6

- **`pages/`** — 8 route pages: DashboardPage (`/`, logged in), LandingPage (`/`, logged out), CanvasPage (`/flow`, `/flow/:id`), TemplatesPage, KeysPage, DocsPage, LoginPage, AccountPage
- **`components/nodes/`** — One React component per node type (10 total), all wrapped by `NodeShell.tsx`
- **`components/panels/`** — Left sidebar (NodeSidebar), right sidebar (ConfigPanel), floating ChatPanel, FlowManager modal
- **`components/panels/config/`** — Node-type-specific configuration forms (one per node type)
- **`components/layout/`** — AppShell (main layout), Sidebar (navigation with auth profile section)
- **`store/flowStore.ts`** — Single source of truth: nodes, edges, selection, execution state, undo history (20 entries)
- **`store/authStore.ts`** — Supabase session management: signIn, signUp, signOut, signInWithGoogle, onAuthStateChange listener
- **`services/api.ts`** — HTTP client for flows, credentials, templates, and python export
- **`services/websocket.ts`** — WebSocket client for execution streaming
- **`services/supabase.ts`** — Supabase client singleton
- **`docs/`** — 15 markdown files rendered in DocsPage (getting started, node reference, tutorials, API)
- **`types/flow.ts`** — TypeScript types mirroring backend Pydantic models

### Backend Structure

**Stack**: FastAPI + Agno SDK + Supabase + Fernet encryption

6 routers registered in `app/main.py`:
- **`api/flows.py`** — Flow CRUD (`/api/flows`) with user_id filtering
- **`api/websocket.py`** — WebSocket execution (`/ws/execution`)
- **`api/upload.py`** — File upload for knowledge base documents
- **`api/credentials.py`** — Encrypted API key management (`/api/credentials`)
- **`api/export.py`** — Python code generation (`/api/flows/{id}/export/python`)
- **`api/templates.py`** — Featured + community templates (`/api/templates`)

Key services:
- **`services/execution_engine.py`** — Async execution with streaming events
- **`services/credential_vault.py`** — Fernet symmetric encryption (requires `CREDENTIAL_VAULT_KEY` env var)
- **`services/python_exporter.py`** — Generates standalone Agno Python scripts from flows
- **`services/supabase_client.py`** — Supabase client singleton

Models: **`models/flow.py`** — Pydantic models defining the flow JSON schema (shared contract with `frontend/src/types/flow.ts`)

### Execution Events (WebSocket protocol)

Events streamed during execution: `node_start`, `node_output`, `node_complete`, `flow_complete`, `error`. Each carries `type`, `node_id`, `data`, `message`, and `timestamp`.

## Node Types

| Node Type | Frontend Component | Backend Compiler | Purpose |
|-----------|-------------------|-----------------|---------|
| Input | `InputNode.tsx` | `input_compiler.py` | Data entry point |
| LLM Agent | `LLMAgentNode.tsx` | `agent_compiler.py` | AI processing via Agno Agent |
| Web Search | `WebSearchNode.tsx` | `web_search_compiler.py` | DuckDuckGo search tool |
| Knowledge Base | `KnowledgeBaseNode.tsx` | `knowledge_base_compiler.py` | RAG with pgvector |
| Conditional | `ConditionalNode.tsx` | `conditional_compiler.py` | If/else branching (LLM-evaluated) |
| Output | `OutputNode.tsx` | `output_compiler.py` | Final output aggregation |
| Firecrawl Scrape | `FirecrawlScrapeNode.tsx` | `firecrawl_scrape_compiler.py` | Web scraping via Firecrawl API |
| Apify Actor | `ApifyActorNode.tsx` | `apify_actor_compiler.py` | Apify automation actors |
| MCP Server | `MCPServerNode.tsx` | `mcp_server_compiler.py` | Model Context Protocol servers |
| HuggingFace | `HuggingFaceInferenceNode.tsx` | `huggingface_inference_compiler.py` | HF model inference |

External integration nodes (Firecrawl, Apify, MCP, HuggingFace) support optional `credential_id` for runtime key decryption from the vault.

## Key Conventions

- **Type parity**: TypeScript types in `frontend/src/types/flow.ts` mirror Pydantic models in `backend/app/models/flow.py`. Keep them in sync.
- **Adding a node type**: Create a frontend component in `components/nodes/`, a config form in `components/panels/config/`, a backend compiler extending `BaseNodeCompiler` in `compiler/nodes/`, and register it in `compiler/nodes/__init__.py`'s `ALL_COMPILERS` list.
- **LLM providers**: OpenAI, Anthropic, Google, Groq, Ollama — configured via environment variables and selectable per-agent node.
- **Auth**: Supabase Auth handles email/password + Google OAuth. Frontend `authStore` manages sessions. Backend enforces flow ownership on update/delete and scopes credentials to the authenticated user.
- **Credentials**: API keys encrypted with Fernet (symmetric). Never returned as plaintext from the API. `credential_id` references used at runtime in external integration nodes.
- **Knowledge Base**: Documents embedded to Supabase pgvector via Agno's `Knowledge` class. Supports files (TXT/PDF/MD/DOCX/PPTX), websites, and YouTube URLs. Compiler is sync; document loading is async in execution engine to avoid event loop conflicts.
- **Templates**: 7 pre-seeded workflow templates in `docs/workflows/`. Featured and community separation via `is_featured`/`is_public` flags.
- **CORS**: Controlled via `ALLOWED_ORIGINS` env var in `backend/app/main.py` (defaults to `localhost:5173,localhost:5174` for development).
- **Git commits**: Do NOT include "Co-Authored-By: Claude" in commit messages. All commits should be attributed solely to the human developer.

## Development Workflow — Flow-Driven E2E Development

The development approach is **exploratory, flow-driven**:

1. **Pick a flow pattern** — e.g., Input→Agent→Output, Conditional branching, multi-agent chaining
2. **Build it on the canvas** in the browser UI
3. **Run it** via Chat panel or Run button
4. **Observe the first failure**
5. **DIAGNOSE THE FULL PIPELINE before fixing** — trace ALL layers (frontend → WebSocket → compiler → execution engine → Agno → back) to discover hidden failures. Don't fix one-at-a-time; find them all first.
6. **Write ONE plan covering all discovered issues** — saved in `docs/plans/YYYY-MM-DD-<name>.md`
7. **Execute the plan** — TDD per task (failing test → implement → pass), backend-first
8. **Verify ALL layers (bottom-up)**: unit tests → integration tests → E2E tests → manual canvas verification
9. **Move to the next flow pattern**

Plan files in `docs/plans/` are the continuity mechanism across sessions. Use `[~]` for partially-complete items with sub-task breakdowns.

### Testing Quirks

- **pytest-asyncio** runs in `mode=strict` — must use `@pytest.mark.asyncio` on async tests
- **Unit tests without LLM**: Use `ExecutionEngine(condition_evaluator=lambda upstream, condition: "true")` to bypass OpenAI
- **Input node in tests**: Pass `user_input=""` when testing input nodes that simulate agent output via the `value` field
- **Playwright**: 120s timeout, headless=false by default, screenshots/traces on failure
