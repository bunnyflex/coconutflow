# AgnoFlow — No-Code Visual Builder for Agno AI Agents

**Product Requirements Document — V1 MVP**
**Affinity Labs | February 2025 | Confidential**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision and Goals](#3-vision-and-goals)
4. [Target Users](#4-target-users)
5. [Core Features — V1 MVP](#5-core-features--v1-mvp)
6. [Agno SDK Integration — Verified API Reference](#6-agno-sdk-integration--verified-api-reference)
7. [System Architecture](#7-system-architecture)
8. [Flow Compilation Pipeline — How Visual Nodes Become Agno Code](#8-flow-compilation-pipeline--how-visual-nodes-become-agno-code)
9. [API Design](#9-api-design)
10. [Flow JSON Schema](#10-flow-json-schema)
11. [UI/UX Specifications](#11-uiux-specifications)
12. [Technology Stack](#12-technology-stack)
13. [MVP User Stories](#13-mvp-user-stories)
14. [Success Metrics](#14-success-metrics)
15. [Roadmap — Beyond V1](#15-roadmap--beyond-v1)
16. [Development Plan — V1 Sprint Breakdown](#16-development-plan--v1-sprint-breakdown)
17. [Risks and Mitigations](#17-risks-and-mitigations)
18. [Open Questions](#18-open-questions)

---

## 1. Executive Summary

AgnoFlow is a no-code visual builder that empowers non-technical users to create, configure, and run AI agent workflows powered by the Agno framework. It combines the intelligence and flexibility of Agno agents with an intuitive drag-and-drop canvas interface, enabling anyone to build sophisticated agentic pipelines without writing a single line of Python.

The V1 MVP focuses on delivering the smallest valuable product: a visual canvas where users can assemble a single-chain agent flow (input → agent processing → output), configure each node through a simple UI panel, and execute the flow in real-time from the browser. No deployment, scheduling, or multi-user collaboration is included in V1; the goal is to validate the core interaction model and demonstrate immediate utility for internal workflows at Affinity Labs.

---

## 2. Problem Statement

AI agent frameworks like Agno are powerful but require Python proficiency to use. This creates a bottleneck: only developers can build and iterate on agent workflows, even when the use cases are well-understood by non-technical team members. Existing visual tools like Langflow are tightly coupled to LangChain, which is heavier and more complex than Agno. There is currently no visual builder for Agno, leaving a clear gap in the ecosystem.

At Affinity Labs, workflows like job scraping pipelines, content processing, and candidate matching could be built and iterated on much faster if non-technical team members could visually compose agent flows. AgnoFlow solves this by abstracting Agno's capabilities behind an intuitive visual interface.

---

## 3. Vision and Goals

### Product Vision

AgnoFlow becomes the default way to build, test, and deploy Agno-powered AI workflows — for teams of any technical level. Long-term, it evolves into a marketplace where users share and remix agent templates.

### V1 Goals

1. Validate the core interaction model: drag, connect, configure, run.
2. Enable a non-developer to build and execute a working agent flow end-to-end in under 10 minutes.
3. Prove internal utility by replacing at least one manual workflow at Affinity Labs.
4. Establish a modular architecture that supports incremental addition of new node types and features.

### Non-Goals for V1

- Multi-user collaboration or real-time co-editing
- One-click deployment as hosted APIs or webhooks
- Scheduled or triggered flow execution
- User authentication or team management
- Template marketplace or community sharing
- Mobile-responsive canvas interface

---

## 4. Target Users

| Persona | Description | Primary Need |
|---------|-------------|--------------|
| Non-Technical Operator | Team members at Affinity Labs who understand workflows but cannot code Python | Build and run agent pipelines without developer dependency |
| Technical Founder / CTO | Developers like Sunny who want to prototype agent flows quickly before hardcoding | Rapid visual prototyping and iteration on agent architectures |
| Creator / Solopreneur | Future target: creators in the creator economy who want AI-powered automation | Self-serve AI workflow building for content, outreach, research |

---

## 5. Core Features — V1 MVP

### 5.1 Visual Flow Canvas

The canvas is the centrepiece of AgnoFlow. It is a full-screen, pannable, zoomable workspace where users drag nodes from a sidebar and connect them with edges to define their agent flow. The canvas is built on React Flow, an industry-standard library for node-based UIs.

Users interact with the canvas by dragging node types from a left sidebar onto the workspace, drawing connections between node handles (output of one node to input of another), clicking any node to open its configuration panel on the right sidebar, and pressing a global Run button to execute the entire flow.

The canvas enforces a directed acyclic graph (DAG) structure in V1 — no loops or cycles. Each node has typed input and output handles, and the system validates connections to prevent incompatible types from being linked.

### 5.2 Node Types

V1 ships with six foundational node types. Each maps directly to a verified Agno SDK primitive:

| Node | Purpose | Configuration | Agno SDK Mapping |
|------|---------|---------------|------------------|
| **Input** | Entry point for user data (text, file upload, or URL) | Input type selector, placeholder text, file upload zone | Flow input parameter — passed as `message` string to `agent.run()` |
| **LLM Agent** | Core AI processing node | Model selector, system prompt (plain English), temperature slider, toggle tools | `agno.agent.Agent` with `model=`, `instructions=`, `tools=[]` |
| **Web Search** | Searches the web and returns structured results | Query template (can reference upstream node output), result count | `agno.tools.duckduckgo.DuckDuckGoTools()` attached to an Agent |
| **Knowledge Base** | RAG node: upload documents for context-aware retrieval | File upload (PDF, DOCX, TXT, CSV), chunk size, top-k results | `agno.knowledge.knowledge.Knowledge` with `agno.vectordb.pgvector.PgVector` |
| **Conditional** | If/else branching based on upstream output | Condition expression in plain English (interpreted by a lightweight LLM call), two output handles: True and False | Python conditional compiled from LLM interpretation |
| **Output** | Displays the final result to the user | Display format (text, markdown, JSON, table), copy-to-clipboard button | Flow output renderer |

### 5.3 Node Configuration Panel

When a user clicks any node on the canvas, a right-hand configuration panel slides open. This panel is context-aware and renders different form fields depending on the node type. All configuration uses plain English and simple UI controls — no code, no JSON, no YAML.

For the LLM Agent node, users write their instructions in natural language (for example: "You are a recruitment specialist. Analyse the job description and extract key requirements."). The panel validates inputs in real-time and shows inline error messages if required fields are missing.

### 5.4 Flow Execution Engine

When the user presses the Run button, the frontend serialises the flow graph (nodes, edges, and configurations) into a JSON payload and sends it to the backend. The backend's Flow Compiler parses this JSON and generates the equivalent Agno Python code dynamically. The Runtime Engine then executes the compiled flow, walking the DAG from input nodes to output nodes, passing data along edges.

Execution is streamed back to the frontend via WebSocket. As each node completes, its border colour changes (grey for pending, blue for running, green for success, red for error), and the output is available for inspection by clicking the node. The Output node streams its result in real-time, supporting token-by-token streaming for LLM responses.

If any node fails, execution halts at that node, the error message is displayed in the configuration panel, and upstream successful nodes retain their outputs for debugging.

### 5.5 Flow Persistence

Users can save flows with a name and description. Flows are stored as JSON in Supabase and can be loaded, duplicated, renamed, and deleted from a simple flow management dashboard. Each save creates a version snapshot, but V1 does not include version history or rollback — only the latest save is accessible.

---

## 6. Agno SDK Integration — Verified API Reference

This section documents the exact Agno SDK classes, imports, and patterns that AgnoFlow's backend compiler must use. All imports and patterns have been verified against the current Agno documentation and source code (agno PyPI package, docs.agno.com, and GitHub agno-agi/agno).

### 6.1 Core Imports

```python
# Agent — the fundamental building block
from agno.agent import Agent

# Models — model-agnostic, one class per provider
from agno.models.openai import OpenAIChat
from agno.models.anthropic import Claude
from agno.models.google import Gemini
from agno.models.ollama import Ollama          # local models
from agno.models.groq import Groq              # Groq inference

# Tools — 100+ built-in toolkits
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.yfinance import YFinanceTools
from agno.tools.reasoning import ReasoningTools
from agno.tools.github import GithubTools

# Knowledge & RAG
from agno.knowledge.knowledge import Knowledge
from agno.knowledge.pdf import PDFKnowledgeBase
from agno.knowledge.pdf_url import PDFUrlKnowledgeBase
from agno.knowledge.website import WebsiteKnowledgeBase

# Vector Databases
from agno.vectordb.pgvector import PgVector, SearchType
from agno.vectordb.lancedb import LanceDb
from agno.vectordb.qdrant import Qdrant

# Storage
from agno.storage.sqlite import SqliteStorage
from agno.db.sqlite import SqliteDb

# Teams (multi-agent orchestration)
from agno.team import Team
```

### 6.2 Agent Creation Pattern — What the Compiler Generates

The flow compiler translates each visual LLM Agent node into this pattern:

```python
# Basic agent (maps to LLM Agent node with no tools toggled)
agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    instructions="You are a helpful assistant that summarises documents.",
    markdown=True,
)

# Agent with tools (maps to LLM Agent + Web Search nodes connected)
agent = Agent(
    name="Research Agent",
    model=Claude(id="claude-sonnet-4-20250514"),
    tools=[DuckDuckGoTools()],
    instructions="Search the web for the latest information on the given topic.",
    show_tool_calls=True,
    markdown=True,
)

# Execution — how AgnoFlow backend runs the agent
response = agent.run(message="What are the latest AI trends?")
# response.content contains the text output

# Streaming execution (for real-time token streaming to frontend)
response = agent.run(message="Summarise this document.", stream=True)
for chunk in response:
    # Send each chunk via WebSocket to frontend
    pass

# Async execution (recommended for production)
response = await agent.arun(message="Analyse this job description.")
```

### 6.3 Knowledge Base Pattern — RAG Node Compilation

When a user connects a Knowledge Base node, the compiler generates:

```python
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.pgvector import PgVector, SearchType

db_url = "postgresql+psycopg://user:pass@localhost:5532/agnoflow"

# Create knowledge base with vector store
knowledge_base = Knowledge(
    vector_db=PgVector(
        table_name="user_documents_flow_123",
        db_url=db_url,
        search_type=SearchType.hybrid,
    ),
)

# Load uploaded documents (triggered when user uploads files)
knowledge_base.add_content(
    url="path/to/uploaded_document.pdf"
)

# Attach to agent
agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    knowledge=knowledge_base,
    instructions="Answer questions using the provided documents.",
    read_chat_history=True,
    markdown=True,
)

response = agent.run(message="What are the key requirements?")
```

**Alternative for file-based knowledge (PDF specifically):**

```python
from agno.knowledge.pdf import PDFKnowledgeBase

pdf_knowledge = PDFKnowledgeBase(
    path="/path/to/uploaded/pdfs/",
    vector_db=PgVector(
        table_name="pdf_docs_flow_123",
        db_url=db_url,
        search_type=SearchType.hybrid,
    ),
)
pdf_knowledge.load()  # Chunks, embeds, and stores in vector DB

agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    knowledge=pdf_knowledge,
    markdown=True,
)
```

### 6.4 Model ID Reference — Valid Model Strings

The LLM Agent node's model selector must map to these exact Agno model IDs:

| Provider | Agno Class | Valid Model IDs |
|----------|-----------|-----------------|
| OpenAI | `OpenAIChat` | `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o3-mini` |
| Anthropic | `Claude` | `claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001` |
| Google | `Gemini` | `gemini-2.0-flash`, `gemini-1.5-pro` |
| Groq | `Groq` | `llama-3.3-70b-versatile`, `mixtral-8x7b-32768` |
| Ollama (local) | `Ollama` | `llama3.2`, `mistral`, `phi3` |

**Shorthand format also works:** `"claude:sonnet-4"`, `"openai:gpt-4o"` — but we use the explicit class pattern for reliability.

### 6.5 Tools Reference — What Each Tool Node Compiles To

| Visual Node | Agno Tool | Import | Instantiation |
|-------------|-----------|--------|---------------|
| Web Search | DuckDuckGoTools | `from agno.tools.duckduckgo import DuckDuckGoTools` | `DuckDuckGoTools()` |
| Finance Data | YFinanceTools | `from agno.tools.yfinance import YFinanceTools` | `YFinanceTools(stock_price=True, company_info=True)` |
| Reasoning | ReasoningTools | `from agno.tools.reasoning import ReasoningTools` | `ReasoningTools(add_instructions=True)` |
| GitHub | GithubTools | `from agno.tools.github import GithubTools` | `GithubTools(search_repositories=True)` |

**Note:** In Agno, tools are attached to Agents via the `tools=[]` parameter. A standalone "Web Search" node on the canvas is compiled as an Agent with DuckDuckGoTools attached — not as an independent tool call.

### 6.6 Team Pattern — Future V1.2 (Multi-Agent Node)

For reference, the multi-agent team compilation (V1.2 roadmap) would use:

```python
from agno.team import Team

agent_team = Team(
    mode="coordinate",
    members=[web_agent, finance_agent],
    model=OpenAIChat(id="gpt-4o"),
    instructions="Coordinate research between agents and produce a unified report.",
    show_tool_calls=True,
    markdown=True,
)

agent_team.print_response("Analyse NVDA stock performance", stream=True)
```

### 6.7 Critical Agno Patterns to Respect

These patterns must be respected by the flow compiler to avoid runtime errors:

1. **Agent is the atomic unit.** Everything in Agno flows through `Agent`. Tools, knowledge, and memory are attached to an Agent — they don't exist as standalone callable entities.

2. **`agent.run()` returns a `RunResponse` object.** Access the text via `response.content`. For structured output, use `response.content` with `output_schema` on the Agent.

3. **`agent.arun()` is the async equivalent.** Use this in the FastAPI backend for non-blocking execution. Agno is async-first.

4. **Streaming uses `stream=True`.** The response becomes an iterator of chunks. Each chunk has `.content` for incremental text.

5. **Knowledge must be loaded before agent runs.** Call `knowledge_base.load()` or `knowledge_base.add_content()` before attaching to an agent. This is a one-time operation per document set.

6. **Tools are classes, not functions.** Instantiate them: `DuckDuckGoTools()`, not `DuckDuckGoTools`. Some tools accept configuration: `YFinanceTools(stock_price=True)`.

7. **Model IDs are provider-specific strings.** Always use exact strings from the provider. Agno does not normalise model names across providers.

8. **Environment variables for API keys.** Agno expects `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` etc. to be set as environment variables. The flow compiler does not need to pass keys explicitly.

9. **`instructions` accepts both strings and lists of strings.** Lists are concatenated. Use plain English — Agno passes them as the system prompt.

10. **`show_tool_calls=True` is useful for debugging.** Enable it during development; disable in production for cleaner output.

---

## 7. System Architecture

### 7.1 High-Level Architecture

AgnoFlow follows a clean client-server architecture with three layers: the Frontend (React SPA), the Backend (FastAPI), and the Data Layer (Supabase). The frontend handles all visual interaction and flow building. The backend handles flow compilation, Agno agent execution, and API management. The data layer persists flow definitions, user data, and uploaded knowledge base files.

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| Frontend | React 18 + React Flow + Tailwind CSS + Zustand | Visual canvas, node configuration, flow management UI, real-time execution feedback |
| Backend | FastAPI + Agno SDK + WebSocket | Flow compilation (JSON → Agno code), agent execution, streaming results, file handling |
| Data Layer | Supabase (Postgres + Storage + Auth) | Flow JSON storage, knowledge base file storage, user sessions (future) |
| Vector Store | Supabase pgvector | Embeddings for Knowledge Base RAG nodes via `agno.vectordb.pgvector.PgVector` |
| Infra | Docker + Railway or Fly.io | Containerised deployment, auto-scaling |

### 7.2 Data Flow Between Nodes

Each node produces a typed output that is passed along edges to downstream nodes:

- **Input node** → produces raw text string or file content
- **LLM Agent node** → calls `agent.run(message=upstream_output)`, produces `response.content` (string)
- **Web Search node** → wraps an Agent with `DuckDuckGoTools`, produces search result text
- **Knowledge Base node** → loads documents into PgVector, attaches `Knowledge` to the downstream Agent's `knowledge=` parameter
- **Conditional node** → evaluates condition via lightweight LLM call, routes to True or False output handle
- **Output node** → consumes any upstream string and renders it in the UI

When a downstream node receives input from multiple upstream nodes, the inputs are merged into a single context string with labelled sections.

---

## 8. Flow Compilation Pipeline — How Visual Nodes Become Agno Code

This is the critical backend system. When a Run request arrives, the compiler:

**Step 1: Validate** — Check the flow graph for structural correctness (no cycles, all required inputs connected, no orphan nodes).

**Step 2: Topological Sort** — Determine execution order using topological sort on the DAG.

**Step 3: Compile Nodes** — For each node in order, generate the corresponding Agno object:

```python
# Example: Input → LLM Agent (with Web Search) → Output

# Step 3a: Input node — extract user input
user_input = "What are the latest trends in AI hiring?"

# Step 3b: LLM Agent node (with Web Search tool toggled on)
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.duckduckgo import DuckDuckGoTools

agent_node_1 = Agent(
    model=OpenAIChat(id="gpt-4o"),
    tools=[DuckDuckGoTools()],
    instructions="You are a research assistant. Search the web and provide a comprehensive summary.",
    markdown=True,
)

# Step 3c: Execute agent with upstream input
response = await agent_node_1.arun(message=user_input)

# Step 3d: Output node — return response.content to frontend
output = response.content
```

**Step 4: Wire Data** — Output of each node becomes the `message` parameter for the next node's `agent.run()` call.

**Step 5: Stream Results** — Send execution status and streamed output via WebSocket.

**Important:** Compilation is dynamic — no Python files are written to disk. The compiler constructs Agno objects in memory and executes them within the FastAPI process.

---

## 9. API Design

The backend exposes a RESTful API for flow management and a WebSocket endpoint for real-time execution.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flows` | Create a new flow (saves JSON to Supabase) |
| GET | `/api/flows` | List all saved flows for the current session |
| GET | `/api/flows/{id}` | Retrieve a specific flow by ID |
| PUT | `/api/flows/{id}` | Update an existing flow |
| DELETE | `/api/flows/{id}` | Delete a flow |
| POST | `/api/flows/{id}/run` | Execute a flow (returns WebSocket URL for streaming) |
| POST | `/api/upload` | Upload files for Knowledge Base nodes |
| WS | `/ws/execution/{run_id}` | WebSocket for real-time execution status and streaming output |

### WebSocket Message Format

```json
{
  "type": "node_status",
  "node_id": "node_123",
  "status": "running | completed | error",
  "output": "partial or complete text output",
  "error": null
}
```

---

## 10. Flow JSON Schema

Every flow is serialised as a JSON document that captures the complete state of the canvas.

```json
{
  "id": "uuid",
  "name": "My Research Flow",
  "description": "Searches web and summarises results",
  "nodes": [
    {
      "id": "node_1",
      "type": "input",
      "position": { "x": 100, "y": 200 },
      "config": {
        "input_type": "text",
        "placeholder": "Enter your research question..."
      }
    },
    {
      "id": "node_2",
      "type": "llm_agent",
      "position": { "x": 400, "y": 200 },
      "config": {
        "model_provider": "openai",
        "model_id": "gpt-4o",
        "instructions": "You are a research assistant. Summarise findings clearly.",
        "temperature": 0.7,
        "tools": ["web_search"]
      }
    },
    {
      "id": "node_3",
      "type": "output",
      "position": { "x": 700, "y": 200 },
      "config": {
        "display_format": "markdown"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "source_handle": "output",
      "target": "node_2",
      "target_handle": "input"
    },
    {
      "id": "edge_2",
      "source": "node_2",
      "source_handle": "output",
      "target": "node_3",
      "target_handle": "input"
    }
  ],
  "metadata": {
    "created_at": "2025-02-05T12:00:00Z",
    "updated_at": "2025-02-05T14:30:00Z",
    "version": 1
  }
}
```

---

## 11. UI/UX Specifications

### Layout

The application uses a three-panel layout:

- **Left sidebar** (240px, collapsible) — node library organised by category, with drag handles and icons for each node type, plus a search/filter bar at the top.
- **Centre canvas** — fully pannable and zoomable, with a minimap in the bottom-right corner, grid lines for alignment, and a floating toolbar with Run, Save, Clear, and Undo buttons.
- **Right sidebar** (320px, collapsible) — appears when a node is selected, contains the configuration panel with context-appropriate form fields.

### Interaction Design

- **Adding nodes:** Drag from sidebar to canvas, or double-click canvas to open a quick-add search menu.
- **Connecting nodes:** Click and drag from an output handle to an input handle; valid targets highlight in green, invalid targets in red.
- **Configuring nodes:** Single-click a node to open the right panel; double-click to quick-edit the primary field.
- **Deleting:** Select and press Backspace/Delete, or right-click for a context menu.
- **Running:** The Run button is always visible in the top toolbar; it triggers execution with a single click.

### Visual Feedback During Execution

| Status | Visual |
|--------|--------|
| Pending | Grey border |
| Running | Blue animated pulse border |
| Completed | Green border + checkmark badge |
| Error | Red border + error icon (click to see details) |
| Data flowing | Subtle animated pulse along the edge connection |

---

## 12. Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend Framework | React 18 with TypeScript | Industry standard, vast ecosystem, strong typing |
| Canvas Library | React Flow | Purpose-built for node-based editors, handles pan/zoom/connections natively |
| State Management | Zustand | Lightweight, minimal boilerplate, works well with React Flow |
| Styling | Tailwind CSS | Rapid UI development, consistent design system |
| Backend Framework | FastAPI (Python) | Async-native, excellent WebSocket support, aligns with Agno's Python SDK |
| Agent Framework | Agno SDK (`pip install agno`) | Core execution engine — lightweight, model-agnostic, 10,000x faster than LangGraph for instantiation |
| Database | Supabase (PostgreSQL) | Already in use at Affinity Labs, built-in auth, storage, pgvector |
| Vector Store | Supabase pgvector via `agno.vectordb.pgvector.PgVector` | Native Agno integration, no additional infrastructure for V1 |
| File Storage | Supabase Storage | For knowledge base uploads (PDFs, documents) |
| Real-time | WebSocket (FastAPI native) | Streaming execution results and status updates |
| Deployment | Docker + Railway | Simple containerised deployment, easy to scale later |

### Key Dependencies (requirements.txt)

```
agno[openai,anthropic,google,ddg,pgvector,pdf]
fastapi[all]
uvicorn
websockets
supabase
python-multipart
```

---

## 13. MVP User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-01 | As a user, I can drag nodes from the sidebar onto the canvas so I can start building a flow | All 6 node types available. Dragging creates a node at drop position. Node displays type icon and label. |
| US-02 | As a user, I can connect nodes by drawing edges between handles | Connections snap to valid handles. Invalid connections rejected with visual feedback. Edges render as smooth curves. |
| US-03 | As a user, I can configure any node by clicking it and filling in the right panel | Panel shows context-appropriate fields. All required fields validated. Changes reflected on node in real-time. |
| US-04 | As a user, I can run my flow and see results streamed in real-time | Run button triggers execution. Node borders animate to show progress. Output streams token-by-token. Errors displayed clearly. |
| US-05 | As a user, I can save my flow and load it later | Save stores flow to Supabase. Flow list shows all saved flows. Loading restores exact canvas state. |
| US-06 | As a user, I can use a Knowledge Base node to upload documents for RAG | File upload supports PDF, DOCX, TXT, CSV. Documents chunked and embedded via PgVector. Agent retrieves relevant chunks during execution. |
| US-07 | As a user, I can use conditional branching to route data | Conditional node has True/False output handles. Condition expressed in plain English. Only matching branch executes. |
| US-08 | As a user, I can delete nodes and edges to modify my flow | Select + Delete removes element. Connected edges removed when node deleted. Undo restores last action. |

---

## 14. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Flow | Under 10 minutes for a non-developer | Timed user testing sessions |
| Flow Completion Rate | 80% of started flows successfully run | Backend analytics |
| Internal Adoption | At least 3 team members build flows independently | Usage logs in Supabase |
| Workflow Replacement | At least 1 manual workflow replaced | Qualitative team feedback |
| Error Rate | Less than 10% of runs fail due to system errors | Backend error logging |
| Iteration Speed | Modify and re-run a flow in under 2 minutes | Timed user testing |

---

## 15. Roadmap — Beyond V1

| Phase | Features | Timeline |
|-------|----------|----------|
| **V1.1** | Additional tool nodes (Email, Slack, HTTP API, Database query). Flow version history. Retry logic on errors. | V1 + 4 weeks |
| **V1.2** | Multi-agent Team node using `agno.team.Team(mode="coordinate")`. Loop/iteration node. Flow templates library. | V1 + 8 weeks |
| **V2.0** | User auth + team workspaces. Deploy flows as API endpoints via Agno's `AgentOS` with FastAPI runtime. Scheduled execution. | V1 + 14 weeks |
| **V2.5** | Community template marketplace. Custom node builder for developers. Integration marketplace (Notion, Airtable, Google Sheets). | V1 + 20 weeks |
| **V3.0** | Visual debugging with step-through. Cost estimation. Performance recommendations. Enterprise features (SSO, audit logs, RBAC). | V1 + 28 weeks |

---

## 16. Development Plan — V1 Sprint Breakdown

The V1 MVP is scoped for a 6-week development cycle, broken into three 2-week sprints.

| Sprint | Duration | Focus | Deliverables |
|--------|----------|-------|-------------|
| **Sprint 1** | Weeks 1–2 | Canvas Foundation | React Flow canvas with pan/zoom/grid. Left sidebar with 6 draggable node types. Node connection system with validation. Right-side config panel (Input and Output nodes). Zustand state management. |
| **Sprint 2** | Weeks 3–4 | Backend + Execution | FastAPI backend with flow compiler. Agno integration: Agent creation from JSON, `agent.arun()` execution, WebSocket streaming. Knowledge Base node with PgVector. File upload via Supabase Storage. Conditional node. |
| **Sprint 3** | Weeks 5–6 | Polish + Persistence | Flow save/load (Supabase). Flow management dashboard. Execution status visualisation. Error handling and user-facing messages. End-to-end testing. Internal pilot launch. |

---

## 17. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Flow compilation complexity grows with new node types | High | Medium | Plugin-based node architecture from day one. Each node type is a self-contained module with a standard `compile()` interface. |
| Agno SDK breaking changes | Medium | Low | Pin Agno version in requirements. Abstract Agno calls behind an internal adapter layer. Monitor Agno releases. |
| WebSocket reliability for long-running flows | Medium | Medium | Heartbeat pings, automatic reconnection, execution state recovery. |
| Knowledge Base RAG quality varies by document type | Medium | High | Start with well-supported formats (PDF, TXT). Use `SearchType.hybrid` for best results. Show chunk previews for user verification. |
| Non-technical users find the canvas intimidating | High | Medium | Onboarding tutorial with guided first flow. 2–3 starter templates. Clear labels and tooltips. |
| Scope creep beyond V1 | High | High | This PRD defines clear non-goals. All feature requests beyond V1 go to backlog. |
| API key costs with shared keys | Medium | Medium | Implement usage tracking per flow run. Set daily limits. Consider per-user API keys for V2. |

---

## 18. Open Questions

1. **Model API Key Management:** Should users provide their own API keys for LLM providers, or should AgnoFlow use a shared Affinity Labs key for V1? Agno expects keys as environment variables (`OPENAI_API_KEY`, etc.) — shared keys simplify onboarding but introduce cost risk.

2. **Branding:** Is "AgnoFlow" the final product name, or a working title? Alternatives: Agno Studio, FlowAgno, AgentCanvas.

3. **Open Source Strategy:** Should AgnoFlow be open-sourced to build community adoption (similar to Langflow), or kept proprietary as a competitive advantage?

4. **Hosting for V1 Pilot:** Railway, Fly.io, or self-hosted on AWS? Decision impacts cost, complexity, and scaling path.

5. **Agno Version Pinning:** Which Agno version should V1 target? The framework is actively evolving — `agno>=1.1.0` is recommended as the baseline. The import path changed from `phi.*` to `agno.*` after the Phidata → Agno rebrand.

6. **Vector DB for V1:** Supabase pgvector (already in stack) vs. LanceDB (local, zero-config) for the MVP pilot? PgVector requires a running Postgres instance; LanceDB can run embedded.

---

*— End of Document —*
