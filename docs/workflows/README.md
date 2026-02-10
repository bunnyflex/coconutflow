# CoconutFlow Workflow Library

This directory contains pre-built workflow templates that demonstrate the power of CoconutFlow's external integrations. Each workflow is production-ready and showcases real-world use cases combining multiple node types.

## Quick Start

### Loading a Workflow

1. Start CoconutFlow frontend and backend servers:
   ```bash
   # Terminal 1 (Backend)
   cd backend && uvicorn app.main:app --reload --port 8000

   # Terminal 2 (Frontend)
   cd frontend && npm run dev
   ```

2. Open http://localhost:5173 in your browser

3. Click the **"Open"** button in the top toolbar (FlowManager)

4. Select a workflow JSON file from this directory (`docs/workflows/`)

5. The flow will load onto the canvas with all nodes and connections

6. Configure any required API keys (see Troubleshooting section)

7. Click **"Run"** in the Chat panel or use the Run button to execute

---

## Workflow Catalog

### 1. Competitive Intelligence Pipeline

**File:** `competitive-intelligence.json`

**Architecture:**
```
Input (Competitor Name)
  ↓
Web Search (Latest Updates)
  ↓
Firecrawl Scrape (Convert to Markdown)
  ↓
Knowledge Base (Store Content)
  ↓
LLM Agent (Generate Intelligence Report)
  ↓
Output (Analysis)
```

**Purpose:** Monitor competitor websites by searching for their latest updates, scraping content to markdown, storing in a knowledge base, and generating AI-powered intelligence reports.

**Use Cases:**
- Track competitor product launches
- Monitor blog posts and announcements
- Analyze market positioning trends
- Generate weekly competitive intelligence reports

**Status:** ✅ Tested

**Required Credentials:**
- `FIRECRAWL_API_KEY` (Firecrawl)
- `OPENAI_API_KEY` or other LLM provider (LLM Agent)
- `SUPABASE_URL` and `SUPABASE_KEY` (Knowledge Base)

---

### 2. Social Media Analytics Dashboard

**File:** `social-media-analytics.json`

**Architecture:**
```
Input (Instagram Username)
  ↓
Apify Actor (Instagram Scraper)
  ↓
LLM Agent (Analyze Engagement)
  ↓
Conditional (engagement_rate > 3%)
  ├─ TRUE → Output (High Engagement Report)
  └─ FALSE → Output (Low Engagement Alert)
```

**Purpose:** Scrape Instagram profiles using Apify, analyze engagement metrics with AI, and route results based on performance thresholds.

**Use Cases:**
- Influencer vetting for campaigns
- Track brand social media performance
- Identify trending content patterns
- Automate engagement alerts

**Status:** ✅ Tested

**Required Credentials:**
- `APIFY_API_KEY` (Apify Actor)
- `OPENAI_API_KEY` or other LLM provider (LLM Agent)

---

### 3. Code Review Assistant

**File:** `code-review-assistant.json`

**Architecture:**
```
MCP Server (GitHub - Fetch PR)
  ↓
LLM Agent (Review Code Changes)
  ↓
Conditional (approve_changes)
  ├─ TRUE → MCP Server (GitHub - Approve PR)
  └─ FALSE → MCP Server (GitHub - Request Changes)
```

**Purpose:** Automatically fetch GitHub pull requests, review code with AI, and post approval or change requests based on analysis.

**Use Cases:**
- Automated code review for style checks
- Security vulnerability detection
- Best practices enforcement
- PR triage and prioritization

**Status:** ✅ Tested

**Required Credentials:**
- GitHub Personal Access Token (MCP Server)
- `OPENAI_API_KEY` or other LLM provider (LLM Agent)

**Additional Setup:**
- Install MCP GitHub server: `npx -y @modelcontextprotocol/server-github`
- Configure server URL: `npx -y @modelcontextprotocol/server-github`

---

### 4. Multi-Model Translation Pipeline

**File:** `translation-pipeline.json`

**Architecture:**
```
Input (English Text)
  ↓
Hugging Face Inference (Translation Model)
  ↓
LLM Agent (Quality Check Translation)
  ↓
Conditional (quality_score > 0.8)
  ├─ TRUE → Output (Approved Translation)
  └─ FALSE → Output (Needs Review)
```

**Purpose:** Translate text using open-source Hugging Face models, validate quality with LLM, and route based on confidence scores.

**Use Cases:**
- Multi-language content localization
- Translation quality assurance
- Batch document translation
- Low-cost translation with fallback to human review

**Status:** ✅ Tested

**Required Credentials:**
- `HUGGINGFACE_API_KEY` (Hugging Face Inference)
- `OPENAI_API_KEY` or other LLM provider (LLM Agent)

**Recommended Models:**
- `Helsinki-NLP/opus-mt-en-es` (English to Spanish)
- `Helsinki-NLP/opus-mt-en-fr` (English to French)
- `facebook/nllb-200-distilled-600M` (Multi-language)

---

### 5. Research Synthesis Engine

**File:** `research-synthesis.json`

**Architecture:**
```
Input (Research Topic)
  ↓
Web Search (Find Articles)
  ↓
Firecrawl Scrape (Extract Content)
  ↓
Hugging Face Inference (Generate Embeddings)
  ↓
Knowledge Base (Store Vectors)
  ↓
LLM Agent (Synthesize Findings)
  ↓
Output (Research Report)
```

**Purpose:** The most comprehensive workflow - searches the web, scrapes content, generates embeddings, stores in vector DB, and produces AI-synthesized research reports.

**Use Cases:**
- Academic literature reviews
- Market research reports
- Technology trend analysis
- Due diligence investigations

**Status:** ✅ Tested

**Required Credentials:**
- `FIRECRAWL_API_KEY` (Firecrawl)
- `HUGGINGFACE_API_KEY` (Embeddings)
- `OPENAI_API_KEY` or other LLM provider (LLM Agent)
- `SUPABASE_URL` and `SUPABASE_KEY` (Knowledge Base)

**Recommended Embedding Models:**
- `sentence-transformers/all-MiniLM-L6-v2` (Fast, 384-dim)
- `BAAI/bge-small-en-v1.5` (High quality, 384-dim)
- `intfloat/e5-large-v2` (State-of-the-art, 1024-dim)

---

### 6. Local Development Helper

**File:** `local-dev-helper.json`

**Architecture:**
```
MCP Server (Filesystem - Read File)
  ↓
LLM Agent (Analyze Code + Generate Fix)
  ↓
MCP Server (Filesystem - Write File)
  ↓
Output (Confirmation)
```

**Purpose:** Read local files, analyze code with AI, apply fixes automatically, and confirm changes - a fully automated dev assistant.

**Use Cases:**
- Quick bug fixes in local codebases
- Refactoring automation
- Code style corrections
- Documentation generation

**Status:** ✅ Tested

**Required Credentials:**
- `OPENAI_API_KEY` or other LLM provider (LLM Agent)

**Additional Setup:**
- Install MCP Filesystem server: `npx -y @modelcontextprotocol/server-filesystem`
- Configure allowed directories (IMPORTANT for security):
  ```json
  {
    "allowed_directories": ["/path/to/your/project"]
  }
  ```

**Security Warning:** Always whitelist specific directories. Never allow `/`, `/etc`, or system directories.

---

### 7. Lead Enrichment Pipeline

**File:** `lead-enrichment.json`

**Architecture:**
```
Input (Company Name)
  ├─ Apify Actor (LinkedIn Company Scraper)
  └─ Firecrawl Scrape (Company Website)
       ↓ (both outputs merge)
    Knowledge Base (Store Company Data)
       ↓
    LLM Agent (Generate Enrichment Report)
       ↓
    Output (Lead Profile)
```

**Purpose:** Enrich sales leads by scraping LinkedIn and company websites in parallel, storing in knowledge base, and generating comprehensive profiles.

**Use Cases:**
- Sales lead qualification
- Account-based marketing research
- Investor due diligence
- Partnership prospecting

**Status:** ✅ Tested

**Required Credentials:**
- `APIFY_API_KEY` (Apify Actor)
- `FIRECRAWL_API_KEY` (Firecrawl)
- `OPENAI_API_KEY` or other LLM provider (LLM Agent)
- `SUPABASE_URL` and `SUPABASE_KEY` (Knowledge Base)

**Note:** This workflow demonstrates parallel node execution - both Apify and Firecrawl run simultaneously for faster results.

---

## Configuration Guide

### Setting Up API Keys

All workflows require API keys configured in `backend/.env`:

```bash
# Required for most workflows
OPENAI_API_KEY=sk-your-openai-key

# External integrations (as needed)
FIRECRAWL_API_KEY=fc-your-firecrawl-key
APIFY_API_KEY=apify_api_your-apify-key
HUGGINGFACE_API_KEY=hf_your-huggingface-key

# Supabase (for Knowledge Base workflows)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Credential encryption (if using Credentials API)
CREDENTIAL_VAULT_KEY=your-fernet-encryption-key
```

### Alternative: Using Credentials API

For production deployments, use the encrypted Credentials API instead of `.env`:

```bash
# Create encrypted credential
POST http://localhost:8000/api/credentials
Content-Type: application/json

{
  "service_name": "firecrawl",
  "credential_name": "production",
  "api_key": "fc-your-api-key"
}
```

See `docs/external-integrations.md` for full Credentials API documentation.

---

## Troubleshooting Guide

### Firecrawl Scrape Errors

#### Error: "Invalid API key"
**Solution:**
1. Verify `FIRECRAWL_API_KEY` is set in `backend/.env`
2. Get a valid key from https://firecrawl.dev
3. Check key format: should start with `fc-`

#### Error: "Failed to scrape URL"
**Solution:**
1. Verify the URL is accessible (test in browser)
2. Check for JavaScript-heavy sites (Firecrawl may struggle)
3. Try different formats (markdown, html, screenshot)
4. Ensure `include_metadata` is enabled if extracting meta tags

#### Error: "Rate limit exceeded"
**Solution:**
1. Check your Firecrawl plan limits
2. Add delays between requests (use conditional nodes)
3. Upgrade to higher tier plan

---

### Apify Actor Errors

#### Error: "Actor not found"
**Solution:**
1. Verify actor ID format: `apify/actor-name` (not a URL)
2. Check actor exists: https://apify.com/store
3. Ensure you have access (some actors are paid)

#### Error: "Invalid input"
**Solution:**
1. Check actor documentation for required input fields
2. Verify JSON syntax in config panel
3. Common fields: `urls`, `maxItems`, `startUrls`
4. Example:
   ```json
   {
     "username": "example_user",
     "resultsLimit": 10
   }
   ```

#### Error: "Actor timeout"
**Solution:**
1. Increase timeout in node config (default 300s)
2. Reduce `maxItems` to fetch fewer results
3. Check actor run status in Apify dashboard
4. Some actors (e.g., Google Maps) can take 5-10 minutes

---

### MCP Server Errors

#### Error: "MCP server not found"
**Solution:**
1. Install the MCP server package:
   ```bash
   # GitHub
   npx -y @modelcontextprotocol/server-github

   # Filesystem
   npx -y @modelcontextprotocol/server-filesystem
   ```

2. Verify server URL in node config matches installation

#### Error: "Connection refused"
**Solution:**
1. Check server type (stdio, SSE, HTTP) matches actual server
2. For stdio: Verify command can run in terminal
3. For SSE/HTTP: Check server is running and port is correct
4. Test manually:
   ```bash
   npx -y @modelcontextprotocol/server-github
   ```

#### Error: "Unauthorized" (GitHub MCP)
**Solution:**
1. Create GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Generate new token (classic)
   - Scopes: `repo`, `read:org`, `read:user`
2. Add to credential config in MCP node

#### Error: "Path not allowed" (Filesystem MCP)
**Solution:**
1. Check `allowed_directories` in server config
2. Add your project path to whitelist
3. Never allow system directories (`/`, `/etc`, `/var`)
4. Example safe config:
   ```json
   {
     "allowed_directories": [
       "/Users/you/projects/my-app",
       "/tmp/uploads"
     ]
   }
   ```

---

### Hugging Face Inference Errors

#### Error: "Invalid API key"
**Solution:**
1. Get token from https://huggingface.co/settings/tokens
2. Add to `backend/.env`: `HUGGINGFACE_API_KEY=hf_...`
3. Check token has `read` permission (not write-only)

#### Error: "Model not found"
**Solution:**
1. Verify model ID format: `author/model-name`
2. Check model exists: https://huggingface.co/models
3. Ensure model supports your chosen task type
4. Example valid IDs:
   - `meta-llama/Llama-3.2-3B` (text-generation)
   - `sentence-transformers/all-MiniLM-L6-v2` (embeddings)

#### Error: "Task not supported"
**Solution:**
1. Check model card on Hugging Face for supported tasks
2. Match task type in node config:
   - Embeddings models → `embeddings` task
   - Generative models → `text-generation` task
   - Classifier models → `classification` task

#### Error: "Inference timeout"
**Solution:**
1. First request to a model takes longer (cold start)
2. Large models (7B+) may time out on free tier
3. Use smaller models:
   - Instead of `meta-llama/Llama-3-8B` → `meta-llama/Llama-3.2-3B`
   - Instead of `BAAI/bge-large-en-v1.5` → `BAAI/bge-small-en-v1.5`
4. Upgrade to Hugging Face Pro for faster inference

---

### Knowledge Base Errors

#### Error: "Supabase connection failed"
**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_KEY` in `backend/.env`
2. Use Session Pooler URL (ends with `.pooler.supabase.com`) for IPv4
3. Check Supabase project is active (not paused)
4. Test connection:
   ```bash
   curl https://your-project.supabase.co/rest/v1/
   ```

#### Error: "pgvector extension not found"
**Solution:**
1. Enable pgvector in Supabase dashboard:
   - Go to Database → Extensions
   - Enable `vector` extension
2. Restart backend server

#### Error: "No embeddings found"
**Solution:**
1. Ensure documents were uploaded before running flow
2. Check Knowledge Base node has valid sources
3. Verify embeddings were generated (check Supabase `documents` table)
4. For file sources: upload via `/api/upload`
5. For URL sources: ensure URLs are accessible

---

### LLM Agent Errors

#### Error: "OpenAI API key not found"
**Solution:**
1. Add `OPENAI_API_KEY=sk-...` to `backend/.env`
2. Restart backend server
3. Alternative: Use other providers (Anthropic, Google, Groq)

#### Error: "Rate limit exceeded"
**Solution:**
1. Upgrade to paid OpenAI tier
2. Add delays between requests (use conditional nodes)
3. Switch to other LLM providers:
   - Anthropic Claude (add `ANTHROPIC_API_KEY`)
   - Google Gemini (add `GOOGLE_API_KEY`)
   - Groq (add `GROQ_API_KEY`)
   - Ollama (local models, no API key needed)

#### Error: "Context length exceeded"
**Solution:**
1. Reduce upstream data (use fewer search results)
2. Summarize content before passing to LLM
3. Use models with larger context windows:
   - OpenAI: `gpt-4-turbo-preview` (128k tokens)
   - Anthropic: `claude-3-5-sonnet-20241022` (200k tokens)

---

### General Execution Errors

#### Error: "Node skipped"
**Behavior:** This is normal for conditional branches. The "skipped" path won't execute.

**Example:**
```
Conditional (score > 80)
  ├─ TRUE → Output A (executes)
  └─ FALSE → Output B (skipped)
```

If condition is TRUE, Output B is skipped (greyed out in UI).

#### Error: "Circular dependency detected"
**Solution:**
1. Check for loops in your flow (Node A → B → C → A)
2. CoconutFlow requires DAG (Directed Acyclic Graph)
3. Remove cycles by restructuring flow

#### Error: "No upstream data"
**Solution:**
1. Ensure previous nodes completed successfully
2. Check WebSocket execution events in browser console
3. Verify all required nodes have connections

---

## Best Practices

### Workflow Design

1. **Start Simple:** Begin with 3-4 nodes, test, then add complexity
2. **Use Templates:** Leverage upstream data with `{{upstream}}` syntax
3. **Add Conditionals:** Route failures to error handling outputs
4. **Test Incrementally:** Run flow after adding each node

### Performance Optimization

1. **Parallel Execution:** Multiple nodes with same upstream parent run in parallel (e.g., Workflow #7)
2. **Reduce API Calls:** Use Knowledge Base to cache scraped content
3. **Batch Processing:** Set `max_results` and `maxItems` appropriately
4. **Use Smaller Models:** Hugging Face distilled models are 3-5x faster

### Security

1. **Never Commit Keys:** Use `.env` files (in `.gitignore`)
2. **Rotate Credentials:** Change API keys every 90 days
3. **Whitelist Paths:** MCP Filesystem requires `allowed_directories`
4. **Validate Inputs:** Sanitize user input before passing to web scrapers

### Cost Management

1. **Monitor Usage:** Track API costs per workflow run
2. **Set Limits:** Use `maxItems`, `max_results`, `timeout` configs
3. **Free Tiers:** Many services offer free tiers for testing
4. **Use Local Models:** Ollama for development (no API costs)

---

## Workflow Modification Guide

### Adapting Workflows

All workflows can be customized:

1. **Change LLM Provider:**
   - Open LLM Agent node config
   - Select different provider (OpenAI, Anthropic, Google, Groq, Ollama)
   - Update API key in `.env`

2. **Add Nodes:**
   - Drag new node from left sidebar
   - Connect to existing flow
   - Configure properties

3. **Remove Nodes:**
   - Select node (click)
   - Press `Delete` or `Backspace`
   - Connections auto-remove

4. **Change Parameters:**
   - Click node to select
   - Right sidebar shows config panel
   - Modify settings
   - Auto-saves to store

### Creating New Workflows

To create from scratch:

1. Click "New" in FlowManager (clears canvas)
2. Drag Input node onto canvas (always start with Input)
3. Add processing nodes (LLM, Tools, External Integrations)
4. Add Output node (always end with Output)
5. Connect nodes (drag from handle to handle)
6. Configure each node (click → right sidebar)
7. Save (click "Save" button, name your flow)

---

## Resources

### Documentation
- [Main CoconutFlow Docs](../../README.md)
- [External Integrations Setup](../external-integrations.md)
- [CLAUDE.md Development Guide](../../CLAUDE.md)

### External Services
- [Firecrawl Dashboard](https://firecrawl.dev/dashboard) - API keys and usage
- [Apify Console](https://console.apify.com/) - Actors and runs
- [Hugging Face Models](https://huggingface.co/models) - Browse 600k+ models
- [MCP Servers](https://modelcontextprotocol.io/) - Available servers
- [Supabase Dashboard](https://app.supabase.com/) - Database management

### Support
- GitHub Issues: Report bugs and request features
- Discord Community: Get help from other users (coming soon)
- Email Support: contact@coconutflow.dev (for enterprise)

---

## Changelog

**2026-02-10** - Initial workflow library release
- Added 7 production-ready workflows
- Created comprehensive documentation
- Validated all workflows with E2E tests

---

## Contributing

Want to add your workflow to the library?

1. Build and test your flow in CoconutFlow
2. Export to JSON (Save button)
3. Add to `docs/workflows/` directory
4. Update this README with:
   - Architecture diagram
   - Purpose/use cases
   - Required credentials
5. Submit Pull Request with workflow and docs

**Criteria for inclusion:**
- Must use at least 2 external integrations
- Real-world use case (not toy example)
- Complete configuration (no placeholders)
- Tested end-to-end
- Clear documentation

---

## License

All workflows in this library are MIT licensed. Feel free to use, modify, and distribute in your projects.
