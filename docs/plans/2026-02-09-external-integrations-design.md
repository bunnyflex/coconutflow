# External Integrations Design: Firecrawl, Apify, MCP, Hugging Face

**Date:** 2026-02-09
**Status:** Approved
**Implementation:** Parallel team (7 agents), 4-week timeline

---

## Overview

This design adds **12 new node types** across 4 external services to CoconutFlow, enabling advanced data extraction, AI model inference, and tool integration capabilities. The implementation follows a **two-phase rollout** with core foundation nodes first, then specialized extensions.

### Services Integrated

1. **Firecrawl** — Web scraping to clean Markdown/JSON for RAG
2. **Apify** — 1,500+ pre-built actors for social media, maps, e-commerce
3. **MCP (Model Context Protocol)** — Anthropic's protocol for connecting AI to data sources
4. **Hugging Face** — 600k+ models, datasets, and Spaces

### Node Types Breakdown

**Phase 1 (Core - 4 nodes):**
- Firecrawl Scrape
- Apify Generic Actor
- MCP Generic Server
- Hugging Face Inference

**Phase 2 (Specialized - 8 nodes):**
- Firecrawl Research
- Apify Instagram/LinkedIn/Google Maps/Amazon/YouTube (5 nodes)
- MCP GitHub/Filesystem (2 nodes)
- Hugging Face Dataset/Spaces (2 nodes)

---

## Architecture Components

### 1. Credential Vault Service

**Purpose:** Secure, centralized API key management with encryption.

**Database Schema** (`migrations/002_create_credentials_table.sql`):

```sql
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'system',
    service_name TEXT NOT NULL,  -- "firecrawl", "apify", "huggingface", "mcp"
    credential_name TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,  -- Fernet-encrypted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, service_name, credential_name)
);
```

**Backend Implementation** (`backend/app/services/credential_vault.py`):
- `encrypt_credential(service: str, key: str) -> str`
- `decrypt_credential(credential_id: str) -> str`
- `get_credential_for_service(service: str, user_id: str) -> str`
- Uses `CREDENTIAL_VAULT_KEY` env var (32-byte Fernet key)

**API Endpoints** (`backend/app/api/credentials.py`):
- `POST /api/credentials` — Store encrypted credential
- `GET /api/credentials` — List credentials (names only, not keys)
- `DELETE /api/credentials/{id}` — Remove credential

**Runtime Resolution Pattern:**
```python
api_key = (
    node.config.api_key_override or  # Direct override (dev/testing)
    credential_vault.get_credential_for_service("firecrawl", user_id="system") or
    os.getenv("FIRECRAWL_API_KEY")  # Fallback to env
)
```

---

### 2. Retry Handler with Exponential Backoff

**Purpose:** Resilient external API calls with automatic retries.

**Implementation** (`backend/app/utils/retry.py`):

```python
import asyncio
import logging
from functools import wraps

def retry_with_backoff(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    exceptions: tuple = (Exception,)
):
    """Retry async function with exponential backoff."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        logging.error(f"{func.__name__} failed after {max_attempts} attempts: {e}")
                        raise
                    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                    logging.warning(f"{func.__name__} attempt {attempt} failed, retrying in {delay}s...")
                    await asyncio.sleep(delay)
        return wrapper
    return decorator
```

**Usage:**
```python
@retry_with_backoff(max_attempts=3, base_delay=1.0)
async def fetch_firecrawl_scrape(url: str, api_key: str) -> dict:
    # API call implementation
```

---

### 3. Normalized Output Wrapper

**Purpose:** Consistent data format for downstream node composability.

**Implementation** (`backend/app/services/output_normalizer.py`):

```python
from datetime import datetime
from typing import Any

class OutputEnvelope:
    """Normalized output wrapper for all external service responses."""

    @staticmethod
    def wrap(
        source: str,
        data: Any,
        metadata: dict[str, Any] | None = None,
        status: str = "success"
    ) -> dict[str, Any]:
        return {
            "source": source,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
            "metadata": metadata or {},
            "status": status,
        }
```

**Service Adapters:**
- `FirecrawlAdapter.normalize(response)` → envelope
- `ApifyAdapter.normalize(response)` → envelope
- `MCPAdapter.normalize(response)` → envelope
- `HuggingFaceAdapter.normalize(response)` → envelope

**Output Format:**
```json
{
  "source": "firecrawl_scrape",
  "timestamp": "2026-02-09T12:34:56.789Z",
  "data": { /* service-specific payload */ },
  "metadata": { "url": "...", "status_code": 200 },
  "status": "success"
}
```

---

## Phase 1 Nodes: Core Foundation

### 1. Firecrawl Scrape Node

**Purpose:** Convert websites to clean Markdown/JSON for RAG pipelines.

**Backend** (`backend/app/compiler/nodes/firecrawl_scrape_compiler.py`):

```python
class FirecrawlScrapeNodeCompiler(BaseNodeCompiler):
    @property
    def node_type(self) -> str:
        return "firecrawl_scrape"

    def compile(self, node: FlowNode, context: dict) -> dict:
        config = node.config.firecrawl_scrape

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "url": config.url,  # Supports {{upstream}} templates
            "formats": config.formats,  # ["markdown", "html", "screenshot"]
            "include_metadata": config.include_metadata,
            "credential_id": config.credential_id,
        }
```

**Pydantic Model:**
```python
class FirecrawlScrapeConfig(BaseModel):
    url: str
    formats: list[str] = ["markdown"]
    include_metadata: bool = True
    credential_id: str | None = None
```

**Frontend:**
- Component: `FirecrawlScrapeNode.tsx` (icon: `FileText`)
- Config: `FirecrawlScrapeConfig.tsx` (URL input, format checkboxes, credential selector)

**API:** `POST https://api.firecrawl.dev/v1/scrape`

**Dependencies:** `firecrawl-py>=0.0.16`

---

### 2. Apify Generic Actor Node

**Purpose:** Run any of Apify's 1,500+ pre-built scrapers (actors).

**Backend** (`backend/app/compiler/nodes/apify_actor_compiler.py`):

```python
class ApifyActorNodeCompiler(BaseNodeCompiler):
    @property
    def node_type(self) -> str:
        return "apify_actor"

    def compile(self, node: FlowNode, context: dict) -> dict:
        config = node.config.apify_actor

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "actor_id": config.actor_id,  # e.g., "apify/instagram-scraper"
            "input": config.input,  # JSON object with actor-specific params
            "max_items": config.max_items,
            "timeout_secs": config.timeout_secs,
            "credential_id": config.credential_id,
        }
```

**Pydantic Model:**
```python
class ApifyActorConfig(BaseModel):
    actor_id: str
    input: dict[str, Any] = {}
    max_items: int = 100
    timeout_secs: int = 300
    credential_id: str | None = None
```

**Frontend:**
- Component: `ApifyActorNode.tsx` (icon: `Bot`)
- Config: `ApifyActorConfig.tsx` (actor ID autocomplete, JSON editor, max items, timeout)

**Execution Flow:**
1. POST to `https://api.apify.com/v2/acts/{actor_id}/runs`
2. Poll run status until complete or timeout
3. Fetch dataset: `GET /v2/datasets/{dataset_id}/items`
4. Normalize output

**Dependencies:** `apify-client>=1.0.0`

---

### 3. MCP Generic Server Node

**Purpose:** Connect to any MCP server and use its tools in Agno agents.

**Backend** (`backend/app/compiler/nodes/mcp_server_compiler.py`):

```python
class MCPServerNodeCompiler(BaseNodeCompiler):
    @property
    def node_type(self) -> str:
        return "mcp_server"

    def compile(self, node: FlowNode, context: dict) -> dict:
        from agno.agent import Agent
        from agno.models.openai import OpenAIChat

        config = node.config.mcp_server

        mcp_tools = self._create_mcp_tools(
            server_url=config.server_url,
            server_type=config.server_type,  # "stdio", "sse", "http"
            credential_id=config.credential_id
        )

        agent = Agent(
            name=f"MCP Agent ({config.server_name})",
            model=OpenAIChat(id="gpt-4o"),
            tools=mcp_tools,
            instructions=config.instructions or "Use available MCP tools.",
            markdown=True,
        )

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "agent": agent,
            "server_name": config.server_name,
        }
```

**Pydantic Model:**
```python
class MCPServerConfig(BaseModel):
    server_name: str
    server_url: str  # e.g., "npx -y @modelcontextprotocol/server-github"
    server_type: Literal["stdio", "sse", "http"] = "stdio"
    instructions: str | None = None
    credential_id: str | None = None
```

**Frontend:**
- Component: `MCPServerNode.tsx` (icon: `Plug`)
- Config: `MCPServerConfig.tsx` (name, URL, type selector, instructions, "Test Connection" button)

**Dependencies:** `mcp>=1.0.0`

---

### 4. Hugging Face Inference Node

**Purpose:** Run inference on 600k+ models (text gen, embeddings, classification, etc.).

**Backend** (`backend/app/compiler/nodes/huggingface_inference_compiler.py`):

```python
class HuggingFaceInferenceNodeCompiler(BaseNodeCompiler):
    @property
    def node_type(self) -> str:
        return "huggingface_inference"

    def compile(self, node: FlowNode, context: dict) -> dict:
        config = node.config.huggingface_inference

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "model_id": config.model_id,  # e.g., "meta-llama/Llama-3.2-3B"
            "task": config.task,  # "text-generation", "embeddings", etc.
            "parameters": config.parameters,
            "input_key": config.input_key,  # Template: {{upstream.data}}
            "credential_id": config.credential_id,
        }
```

**Pydantic Model:**
```python
class HuggingFaceInferenceConfig(BaseModel):
    model_id: str
    task: Literal["text-generation", "embeddings", "classification", "ner", "translation", "summarization", "image-generation"]
    parameters: dict[str, Any] = {}
    input_key: str = "{{upstream.data}}"
    credential_id: str | None = None
```

**Frontend:**
- Component: `HuggingFaceInferenceNode.tsx` (icon: `Sparkles`)
- Config: `HuggingFaceInferenceConfig.tsx` (model search, task selector, dynamic params, input key)

**Execution:** Uses `huggingface_hub.InferenceClient`

**Dependencies:** `huggingface_hub>=0.20.0`

---

## Phase 2 Nodes: Specialized Extensions

### 1. Firecrawl Research Node

**Purpose:** Autonomous multi-page research with AI agent.

**Backend** (`backend/app/compiler/nodes/firecrawl_research_compiler.py`):

Creates an Agno Agent with custom Firecrawl research tool that wraps `/research` endpoint.

**Config:**
- `research_query`: Topic to research
- `max_pages`: Limit pages (default: 10)
- `include_citations`: Boolean
- `credential_id`

---

### 2. Pre-configured Apify Actors (5 Nodes)

Each node supports **hybrid mode**:
- **Pre-configured mode:** User-friendly fields for specific actor
- **Custom actor mode:** Override with any actor ID + JSON input

**Nodes:**
1. **Apify Instagram** (`apify/instagram-scraper`)
   - Config: username, post_limit, include_comments
2. **Apify LinkedIn** (`apify/linkedin-profile-scraper`)
   - Config: profile_url, include_posts, max_posts
3. **Apify Google Maps** (`apify/google-maps-scraper`)
   - Config: search_query, location, max_results
4. **Apify Amazon** (`apify/amazon-product-scraper`)
   - Config: product_urls[], include_reviews, max_reviews
5. **Apify YouTube** (`apify/youtube-scraper`)
   - Config: video_urls[], include_transcripts, include_comments

**Hybrid Mode Implementation:**
```python
class ApifyInstagramConfig(BaseModel):
    # Pre-configured fields
    username: str = ""
    post_limit: int = 50
    include_comments: bool = False

    # Custom actor override
    custom_actor_id: str | None = None
    custom_input: dict[str, Any] = {}

    # Common fields
    max_items: int = 100
    credential_id: str | None = None
```

**Frontend:** Toggle checkbox to switch between modes.

---

### 3. Pre-configured MCP Servers (2 Nodes)

**MCP GitHub Node:**
- Pre-configured: `npx -y @modelcontextprotocol/server-github`
- Config: repository (optional scope), instructions, credential_id (GitHub PAT)
- Tools: create_file, search_repos, create_issue, create_pr, fork_repo, etc.

**MCP Filesystem Node:**
- Pre-configured: `npx -y @modelcontextprotocol/server-filesystem`
- Config: allowed_directories (security whitelist), instructions
- Tools: read_file, write_file, list_directory, create_directory, move_file, etc.

---

### 4. Hugging Face Extensions (2 Nodes)

**HF Dataset Node:**
- Purpose: Load datasets from Hugging Face Hub
- Config: dataset_id, split, subset, max_samples, streaming
- Uses: `datasets.load_dataset()`

**HF Spaces Node:**
- Purpose: Run Gradio/Streamlit apps hosted on Hugging Face Spaces
- Config: space_id, api_name, inputs
- Uses: `gradio_client.Client`
- Example: Run Stable Diffusion for image generation

**Dependencies:** `datasets>=2.0.0`, `gradio_client>=0.7.0`

---

## Testing Strategy

### Unit Tests (Backend)

**Pattern:** `backend/tests/test_<node>_compiler.py`

```python
@pytest.mark.asyncio
async def test_firecrawl_scrape_compiler():
    node = FlowNode(
        id="test",
        type="firecrawl_scrape",
        config=NodeConfig(
            firecrawl_scrape=FirecrawlScrapeConfig(
                url="https://example.com",
                formats=["markdown"]
            )
        )
    )

    compiler = FirecrawlScrapeNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["node_type"] == "firecrawl_scrape"
    assert result["url"] == "https://example.com"
```

**Infrastructure Tests:**
- `test_credential_vault.py` — Encryption/decryption
- `test_retry_handler.py` — Retry logic with backoff
- `test_output_normalizer.py` — Envelope wrapping

### Integration Tests (Real APIs)

**Pattern:** `backend/tests/integration/test_<service>_integration.py`

Requires API keys:
```bash
FIRECRAWL_API_KEY=... APIFY_API_KEY=... HF_API_KEY=... pytest tests/integration/
```

Tests real API calls with retry logic.

### E2E Tests (Playwright)

**Pattern:** `e2e/external-integrations.spec.ts`

Test flow patterns on canvas:
- Firecrawl Scrape → Agent → Output
- Apify Instagram → HF Sentiment → Output
- MCP GitHub → Agent → Output
- HF Dataset → HF Inference → Output

---

## Team Task Breakdown

### Phase 1 (Week 1-2): Core Foundation

**Team Lead:**
- Set up credential vault (migration, service, API)
- Implement retry handler utility
- Implement output normalizer service
- Create team structure (7 agents)
- Coordinate reviews

**Backend-Firecrawl Agent:**
- `FirecrawlScrapeNodeCompiler` + API client + tests

**Backend-Apify Agent:**
- `ApifyActorNodeCompiler` + API client + polling + tests

**Backend-MCP Agent:**
- `MCPServerNodeCompiler` + MCP SDK integration + tool wrapper + tests

**Backend-HuggingFace Agent:**
- `HuggingFaceInferenceNodeCompiler` + Inference API client + tests

**Frontend-DataExtraction Agent:**
- Firecrawl + Apify components and config panels
- Credential selector component (reusable)

**Frontend-AIServices Agent:**
- MCP + Hugging Face components and config panels
- Test connection feature

**Deliverables:** 4 core nodes + infrastructure (credential vault, retry, normalization)

---

### Phase 2 (Week 3-4): Specialized Extensions

**Backend Agents:**
- Firecrawl: Research node
- Apify: 5 pre-configured actors (hybrid mode)
- MCP: GitHub + Filesystem nodes
- HuggingFace: Dataset + Spaces nodes

**Frontend Agents:**
- DataExtraction: Firecrawl Research + 5 Apify UIs (with toggle)
- AIServices: 2 MCP UIs + 2 HF UIs

**Team Lead:**
- Create example flow templates
- Final E2E testing
- Documentation

**Deliverables:** 8 specialized nodes + example templates

---

## Timeline

**Total Duration:** 4 weeks

- **Week 1-2:** Phase 1 (Core foundation)
- **Week 3-4:** Phase 2 (Specialized extensions)

**Final Deliverable:** 12 new node types, credential vault, normalized outputs, full test coverage

---

## Dependencies

### Backend
```txt
# Add to requirements.txt
firecrawl-py>=0.0.16
apify-client>=1.0.0
mcp>=1.0.0
huggingface_hub>=0.20.0
datasets>=2.0.0  # Phase 2
gradio_client>=0.7.0  # Phase 2
cryptography>=41.0.0  # For Fernet encryption
```

### Frontend
```json
// Add to package.json
{
  "dependencies": {
    "@monaco-editor/react": "^4.6.0"  // JSON editor for Apify inputs
  }
}
```

---

## Security Considerations

1. **Credential Vault:**
   - Uses Fernet symmetric encryption
   - Keys never exposed in API responses
   - Env var `CREDENTIAL_VAULT_KEY` must be 32-byte key
   - Rotation strategy: re-encrypt all credentials with new key

2. **MCP Filesystem:**
   - Requires `allowed_directories` whitelist
   - Prevent path traversal attacks
   - Validate all file paths before operations

3. **API Rate Limits:**
   - Retry handler respects rate limit headers
   - Max attempts: 3 (prevents infinite loops)
   - Exponential backoff prevents API abuse

4. **User Input Validation:**
   - URL validation for Firecrawl
   - JSON schema validation for Apify inputs
   - Model ID validation for Hugging Face

---

## Future Enhancements

1. **Template Marketplace:**
   - Pre-built flows for common use cases
   - Community-contributed templates
   - One-click deploy

2. **Cost Tracking:**
   - Track API usage per node
   - Budget alerts
   - Cost analytics dashboard

3. **Caching Layer:**
   - Cache Firecrawl scrapes (TTL-based)
   - Cache HF inference results
   - Redis integration

4. **Additional MCP Servers:**
   - Slack, Database, Notion, Linear
   - Community MCP server registry

5. **Apify Actor Templates:**
   - Expand pre-configured actors
   - Custom actor builder UI

---

## Success Metrics

- **Node Adoption:** 80% of users try at least one new integration within 2 weeks
- **Flow Complexity:** Average flow uses 2+ external integrations
- **Error Rate:** <5% API call failures (retry handler target)
- **Performance:** P95 execution time <10s for scraping nodes
- **Security:** Zero credential leaks, 100% encrypted storage

---

## References

- [Firecrawl API Documentation](https://docs.firecrawl.dev/)
- [Apify API Documentation](https://docs.apify.com/api/v2)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/)
- [CLAUDE.md Workflow Guidelines](../../CLAUDE.md)
