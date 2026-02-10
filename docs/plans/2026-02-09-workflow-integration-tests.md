# Workflow Integration Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and test 7 real-world workflows that showcase external integrations (Firecrawl, Apify, MCP, Hugging Face) combined with existing nodes.

**Architecture:** Manual flow-driven E2E testing approach. Each workflow is built on the canvas UI, executed via Chat/WebSocket, and verified for correct output. Follows the project's "exploratory, flow-driven" development pattern. We'll create JSON flow definitions for each workflow that can be loaded via the FlowManager.

**Tech Stack:** React Flow (frontend), WebSocket execution, Agno framework (backend), External APIs (Firecrawl, Apify, MCP, Hugging Face)

---

## Prerequisites

Before starting workflow tests, verify:
- ✅ Frontend dev server running on http://localhost:5173
- ✅ Backend dev server running on http://localhost:8000
- ✅ All 10 nodes visible in sidebar (6 original + 4 external)
- ✅ API keys configured in `.env` file

**Required API Keys:**
```bash
OPENAI_API_KEY=sk-...           # For LLM Agent nodes
FIRECRAWL_API_KEY=fc-...        # For Firecrawl Scrape nodes
APIFY_API_KEY=apify_api_...     # For Apify Actor nodes
HUGGINGFACE_API_KEY=hf_...      # For Hugging Face nodes
```

---

## Task 1: Verify UI Shows All 10 Nodes

**Files:**
- Browser: http://localhost:5173
- Verify: `frontend/src/types/flow.ts:234-277` (NODE_TYPE_CATALOG)

**Step 1: Open the application**

Action: Open http://localhost:5173 in Chrome/Firefox
Expected: Canvas loads, left sidebar shows node library

**Step 2: Verify all 10 nodes visible**

Check left sidebar has these categories and nodes:

**Input / Output:**
- ✓ Input
- ✓ Output

**Processing:**
- ✓ LLM Agent
- ✓ Conditional

**Tools:**
- ✓ Web Search
- ✓ Knowledge Base
- ✓ Firecrawl Scrape (🔥 icon)
- ✓ Apify Actor (▶️ icon)
- ✓ MCP Server (🧱 icon)
- ✓ Hugging Face (🧠 icon)

**Step 3: Test drag-and-drop**

Action: Drag "Firecrawl Scrape" node onto canvas
Expected: Node appears with orange accent color, subtitle "markdown"

Action: Click the node
Expected: Right config panel opens with URL input, format checkboxes

**Step 4: Clean up test**

Action: Delete the test node, refresh page
Expected: Clean canvas ready for workflow building

---

## Task 2: Workflow 1 - Competitive Intelligence Pipeline

**Workflow:** Input → Web Search → Firecrawl Scrape → Knowledge Base → LLM Agent → Output

**Files:**
- Create: `docs/workflows/competitive-intelligence.json` (flow definition)
- Test: Manual execution via UI

**Step 1: Build the flow on canvas**

1. Drag **Input** node to canvas (x: 100, y: 200)
   - Config: input_type = "text", placeholder = "Enter competitor name"

2. Drag **Web Search** node to canvas (x: 300, y: 200)
   - Config: query_template = "{{upstream}} latest blog posts product updates"
   - Connect: Input.output → Web Search.input

3. Drag **Firecrawl Scrape** node to canvas (x: 500, y: 200)
   - Config: url = "{{upstream}}", formats = ["markdown"], include_metadata = true
   - Connect: Web Search.output → Firecrawl Scrape.input

4. Drag **Knowledge Base** node to canvas (x: 700, y: 200)
   - Config: sources = ["{{upstream}}"], chunk_size = 1000, top_k = 5
   - Connect: Firecrawl Scrape.output → Knowledge Base.input

5. Drag **LLM Agent** node to canvas (x: 900, y: 200)
   - Config: model = "gpt-4o", instructions = "Analyze competitor updates and identify key trends, product changes, and strategic shifts. Provide a concise competitive intelligence report."
   - Connect: Knowledge Base.output → LLM Agent.input

6. Drag **Output** node to canvas (x: 1100, y: 200)
   - Config: display_format = "markdown"
   - Connect: LLM Agent.output → Output.input

**Step 2: Save the flow**

Action: Click "Save" button, name = "Competitive Intelligence Pipeline"
Expected: Flow saved to Supabase, confirmation toast

**Step 3: Execute the workflow**

Action: Open Chat panel, type "OpenAI" (competitor name), click Run
Expected:
- Input node: completes with "OpenAI"
- Web Search: finds 5 relevant URLs
- Firecrawl Scrape: converts URLs to markdown
- Knowledge Base: embeds documents
- LLM Agent: generates intelligence report
- Output: displays markdown report with trends

**Step 4: Verify output quality**

Expected output should include:
- Recent product announcements
- Feature updates
- Strategic direction insights
- Competitive positioning

**Step 5: Document results**

Create: `docs/workflows/competitive-intelligence.json`

```json
{
  "name": "Competitive Intelligence Pipeline",
  "description": "Monitor competitor websites and analyze product updates",
  "nodes": [...],
  "edges": [...],
  "test_input": "OpenAI",
  "expected_output": "Markdown report with competitive insights"
}
```

---

## Task 3: Workflow 2 - Social Media Analytics Dashboard

**Workflow:** Input → Apify Actor → LLM Agent → Conditional → Output (Positive) / Output (Negative)

**Files:**
- Create: `docs/workflows/social-media-analytics.json`

**Step 1: Build the flow on canvas**

1. Drag **Input** node (x: 100, y: 250)
   - Config: input_type = "text", placeholder = "Instagram username"

2. Drag **Apify Actor** node (x: 300, y: 250)
   - Config: actor_id = "apify/instagram-profile-scraper"
   - Config: input = {"username": "{{upstream}}"}, max_items = 50
   - Connect: Input.output → Apify Actor.input

3. Drag **LLM Agent** node (x: 500, y: 250)
   - Config: instructions = "Analyze Instagram profile data and calculate sentiment score 0-100. Output format: {score: number, summary: string}"
   - Connect: Apify Actor.output → LLM Agent.input

4. Drag **Conditional** node (x: 700, y: 250)
   - Config: condition = "sentiment score > 60"
   - Connect: LLM Agent.output → Conditional.input

5. Drag **Output** node (x: 900, y: 150) [True branch]
   - Label: "Positive Brand"
   - Config: display_format = "markdown"
   - Connect: Conditional.true → Output.input

6. Drag **Output** node (x: 900, y: 350) [False branch]
   - Label: "Negative Feedback"
   - Config: display_format = "markdown"
   - Connect: Conditional.false → Output.input

**Step 2: Save the flow**

Action: Save as "Social Media Analytics Dashboard"

**Step 3: Execute workflow**

Action: Enter "nike" in chat, run
Expected: Apify scrapes Nike's Instagram, LLM analyzes sentiment, branches to appropriate output

**Step 4: Test both branches**

Test 1: Positive brand (e.g., "nike") → should route to "Positive Brand" output
Test 2: Controversial brand → might route to "Negative Feedback" output

**Step 5: Verify Apify integration**

Expected Apify output structure:
```json
{
  "username": "nike",
  "followers": 306000000,
  "posts": [...],
  "engagement_rate": 0.05
}
```

---

## Task 4: Workflow 3 - Code Review Assistant

**Workflow:** MCP Server (GitHub) → LLM Agent → Conditional → MCP Server (GitHub)

**Files:**
- Create: `docs/workflows/code-review-assistant.json`

**Step 1: Build the flow on canvas**

1. Drag **MCP Server** node (x: 100, y: 200) [Read PR]
   - Label: "Read GitHub PR"
   - Config: server_name = "github", server_url = "npx @modelcontextprotocol/server-github"
   - Config: instructions = "Fetch PR diff for {{upstream}}"

2. Drag **LLM Agent** node (x: 300, y: 200)
   - Config: instructions = "Review code for: bugs, security issues, style violations, and performance. Output JSON: {issues: [...], severity: 'low'|'medium'|'high', approve: boolean}"

3. Drag **Conditional** node (x: 500, y: 200)
   - Config: condition = "approve is false"

4. Drag **MCP Server** node (x: 700, y: 150) [Post Comment]
   - Label: "Post Review"
   - Config: instructions = "Post review comment with issues"
   - Connect: Conditional.true → MCP Server.input

5. Drag **MCP Server** node (x: 700, y: 250) [Approve PR]
   - Label: "Approve PR"
   - Config: instructions = "Approve PR"
   - Connect: Conditional.false → MCP Server.input

**Step 2: Save the flow**

Action: Save as "Code Review Assistant"

**Step 3: Setup MCP GitHub server**

Action: Install MCP GitHub server
```bash
npm install -g @modelcontextprotocol/server-github
```

**Step 4: Test with mock PR**

Since this requires GitHub API integration, we'll test with simulated diff input:

Action: Input = "PR #123 diff: [code changes]"
Expected: LLM reviews code, branches based on approval decision

**Step 5: Document MCP requirements**

Note: Full GitHub integration requires:
- GitHub token in environment
- MCP server running
- PR number format standardization

---

## Task 5: Workflow 4 - Multi-Model Translation Pipeline

**Workflow:** Input → Hugging Face (Translation) → LLM Agent (Quality Check) → Conditional → Output

**Files:**
- Create: `docs/workflows/translation-pipeline.json`

**Step 1: Build the flow on canvas**

1. Drag **Input** node (x: 100, y: 200)
   - Config: placeholder = "Enter text to translate (English → Spanish)"

2. Drag **Hugging Face** node (x: 300, y: 200)
   - Config: model_id = "Helsinki-NLP/opus-mt-en-es"
   - Config: task = "translation", input_key = "{{upstream}}"

3. Drag **LLM Agent** node (x: 500, y: 200) [Quality Check]
   - Config: instructions = "Evaluate translation quality 0-100. Check: accuracy, fluency, grammar. Output JSON: {score: number, translation: string}"

4. Drag **Conditional** node (x: 700, y: 200)
   - Config: condition = "quality score > 80"

5. Drag **Output** node (x: 900, y: 150) [High Quality]
   - Label: "Approved Translation"
   - Connect: Conditional.true → Output.input

6. Drag **Output** node (x: 900, y: 250) [Low Quality]
   - Label: "Needs Revision"
   - Connect: Conditional.false → Output.input

**Step 2: Save the flow**

Action: Save as "Multi-Model Translation Pipeline"

**Step 3: Execute workflow**

Action: Input = "Hello, how are you today?"
Expected:
- Hugging Face translates to Spanish
- LLM evaluates quality
- Routes to appropriate output based on score

**Step 4: Test edge cases**

Test 1: Simple sentence → high quality score
Test 2: Complex idiom → might get low quality score
Test 3: Technical jargon → test translation accuracy

**Step 5: Verify Hugging Face output**

Expected format:
```json
{
  "translation_text": "Hola, ¿cómo estás hoy?"
}
```

---

## Task 6: Workflow 5 - Research Synthesis Engine

**Workflow:** Input → Web Search → Firecrawl Scrape → Hugging Face (Embeddings) → Knowledge Base → LLM Agent → Output

**Files:**
- Create: `docs/workflows/research-synthesis.json`

**Step 1: Build the flow on canvas**

1. Drag **Input** node (x: 100, y: 250)
   - Config: placeholder = "Research question"

2. Drag **Web Search** node (x: 250, y: 250)
   - Config: query_template = "{{upstream}}", result_count = 10

3. Drag **Firecrawl Scrape** node (x: 400, y: 250)
   - Config: url = "{{upstream}}", formats = ["markdown"]

4. Drag **Hugging Face** node (x: 550, y: 250)
   - Config: model_id = "sentence-transformers/all-MiniLM-L6-v2"
   - Config: task = "feature-extraction"

5. Drag **Knowledge Base** node (x: 700, y: 250)
   - Config: sources = ["{{upstream}}"], top_k = 10

6. Drag **LLM Agent** node (x: 850, y: 250)
   - Config: instructions = "Synthesize research findings with citations. Format: ## Summary\n[synthesis]\n\n## Sources\n[numbered list]"

7. Drag **Output** node (x: 1000, y: 250)
   - Config: display_format = "markdown"

**Step 2: Save the flow**

Action: Save as "Research Synthesis Engine"

**Step 3: Execute workflow**

Action: Input = "What are the latest developments in LLM agent architectures?"
Expected:
- Web Search finds 10 articles
- Firecrawl converts to markdown
- Hugging Face generates embeddings
- Knowledge Base stores vectors
- LLM synthesizes findings
- Output displays report with citations

**Step 4: Verify output quality**

Expected output structure:
```markdown
## Summary
Recent developments include...

## Key Findings
1. ReAct pattern...
2. Tool use improvements...

## Sources
[1] https://...
[2] https://...
```

**Step 5: Test embedding quality**

Verify Knowledge Base receives properly formatted embeddings from Hugging Face

---

## Task 7: Workflow 6 - Local Development Helper

**Workflow:** MCP Server (Filesystem) → LLM Agent → MCP Server (Filesystem) → Output

**Files:**
- Create: `docs/workflows/local-dev-helper.json`

**Step 1: Build the flow on canvas**

1. Drag **MCP Server** node (x: 100, y: 200) [Read Files]
   - Label: "Read Source Code"
   - Config: server_name = "filesystem"
   - Config: server_url = "npx @modelcontextprotocol/server-filesystem /path/to/code"
   - Config: instructions = "Read source files: {{upstream}}"

2. Drag **LLM Agent** node (x: 300, y: 200)
   - Config: instructions = "Generate comprehensive unit tests with pytest. Include: happy path, edge cases, error handling. Follow existing test patterns."

3. Drag **MCP Server** node (x: 500, y: 200) [Write Tests]
   - Label: "Write Test Files"
   - Config: server_name = "filesystem"
   - Config: instructions = "Write test files to tests/ directory"

4. Drag **Output** node (x: 700, y: 200)
   - Config: display_format = "text"

**Step 2: Save the flow**

Action: Save as "Local Development Helper"

**Step 3: Setup MCP Filesystem server**

Action: Install and configure filesystem MCP server
```bash
npm install -g @modelcontextprotocol/server-filesystem
```

**Step 4: Execute workflow**

Action: Input = "src/utils/validation.py"
Expected:
- MCP reads source file
- LLM generates test code
- MCP writes test file
- Output confirms test creation

**Step 5: Verify generated tests**

Action: Check tests/ directory for new test file
Expected: Valid pytest test file with comprehensive coverage

---

## Task 8: Workflow 8 - Lead Enrichment Pipeline

**Workflow:** Input → Apify Actor (LinkedIn) → Firecrawl Scrape (Website) → Knowledge Base → LLM Agent → Output

**Files:**
- Create: `docs/workflows/lead-enrichment.json`

**Step 1: Build the flow on canvas**

1. Drag **Input** node (x: 100, y: 250)
   - Config: placeholder = "Company name"

2. Drag **Apify Actor** node (x: 250, y: 150) [LinkedIn]
   - Label: "LinkedIn Data"
   - Config: actor_id = "apify/linkedin-company-scraper"
   - Config: input = {"company": "{{upstream}}"}

3. Drag **Firecrawl Scrape** node (x: 250, y: 350) [Website]
   - Label: "Company Website"
   - Config: url = "{{upstream}}.com", formats = ["markdown"]

4. Both connect to **Knowledge Base** node (x: 450, y: 250)
   - Config: sources = ["{{upstream}}"], chunk_size = 1000

5. Drag **LLM Agent** node (x: 650, y: 250)
   - Config: instructions = "Generate lead enrichment profile: ## Company Overview\n## Key Products\n## Recent News\n## Sales Talking Points"

6. Drag **Output** node (x: 850, y: 250)
   - Config: display_format = "markdown"

**Step 2: Save the flow**

Action: Save as "Lead Enrichment Pipeline"

**Step 3: Execute workflow**

Action: Input = "Anthropic"
Expected:
- Apify scrapes LinkedIn company page
- Firecrawl scrapes company website
- Knowledge Base stores both sources
- LLM generates enriched lead profile
- Output displays lead card

**Step 4: Verify output structure**

Expected:
```markdown
## Company Overview
Anthropic is an AI safety company...

## Key Products
- Claude (AI assistant)
- Constitutional AI

## Recent News
- Series C funding...

## Sales Talking Points
1. Focus on safety and reliability
2. Enterprise-grade solutions
```

**Step 5: Test with multiple companies**

Test different company sizes:
- Enterprise: "Microsoft"
- Mid-market: "Notion"
- Startup: "Linear"

---

## Task 9: Create Workflow Test Summary Document

**Files:**
- Create: `docs/workflows/README.md`

**Step 1: Document all workflows**

```markdown
# CoconutFlow Workflows

This directory contains real-world workflow examples showcasing external integrations.

## Tested Workflows (7 total)

### 1. Competitive Intelligence Pipeline
**Nodes:** Input → Web Search → Firecrawl → KB → LLM → Output
**Purpose:** Monitor competitor updates
**Status:** ✅ Tested
**File:** `competitive-intelligence.json`

### 2. Social Media Analytics Dashboard
**Nodes:** Input → Apify → LLM → Conditional → Output (2)
**Purpose:** Analyze brand sentiment
**Status:** ✅ Tested
**File:** `social-media-analytics.json`

### 3. Code Review Assistant
**Nodes:** MCP (GitHub) → LLM → Conditional → MCP (GitHub)
**Purpose:** Automated PR reviews
**Status:** ✅ Tested
**File:** `code-review-assistant.json`

### 4. Multi-Model Translation Pipeline
**Nodes:** Input → Hugging Face → LLM → Conditional → Output
**Purpose:** Quality-checked translation
**Status:** ✅ Tested
**File:** `translation-pipeline.json`

### 5. Research Synthesis Engine
**Nodes:** Input → Web Search → Firecrawl → HF → KB → LLM → Output
**Purpose:** Deep research with citations
**Status:** ✅ Tested
**File:** `research-synthesis.json`

### 6. Local Development Helper
**Nodes:** MCP (FS) → LLM → MCP (FS) → Output
**Purpose:** Generate tests from source
**Status:** ✅ Tested
**File:** `local-dev-helper.json`

### 8. Lead Enrichment Pipeline
**Nodes:** Input → Apify + Firecrawl → KB → LLM → Output
**Purpose:** Sales lead research
**Status:** ✅ Tested
**File:** `lead-enrichment.json`

## Loading Workflows

1. Open http://localhost:5173
2. Click "Open" button
3. Select workflow JSON file
4. Flow loads onto canvas
5. Configure API keys if needed
6. Click Run in Chat panel
```

**Step 2: Add troubleshooting guide**

```markdown
## Troubleshooting

### Firecrawl Errors
- Check `FIRECRAWL_API_KEY` in .env
- Verify URL is accessible
- Check format selection (markdown/html)

### Apify Errors
- Check `APIFY_API_KEY` in .env
- Verify actor ID format: `apify/actor-name`
- Check input JSON structure

### MCP Errors
- Install MCP server: `npm install -g @modelcontextprotocol/server-*`
- Check server_url command
- Verify server_type (stdio/sse/http)

### Hugging Face Errors
- Check `HUGGINGFACE_API_KEY` in .env
- Verify model_id exists on HF Hub
- Check task type matches model

### Knowledge Base Errors
- Verify Supabase connection
- Check pgvector extension enabled
- Verify source format (file/URL/YouTube)
```

**Step 3: Commit the documentation**

```bash
git add docs/workflows/
git commit -m "docs: add 7 workflow integration test examples

- Competitive Intelligence Pipeline
- Social Media Analytics Dashboard
- Code Review Assistant
- Multi-Model Translation Pipeline
- Research Synthesis Engine
- Local Development Helper
- Lead Enrichment Pipeline

All workflows tested manually via UI and documented."
```

---

## Task 10: Optional - Create E2E Playwright Tests

**Files:**
- Create: `e2e/workflows.spec.ts`

**Note:** This is optional since the project uses manual flow-driven testing. However, automated E2E tests would improve regression testing.

**Step 1: Write Playwright test skeleton**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Workflow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="canvas"]');
  });

  test('Workflow 1: Competitive Intelligence Pipeline', async ({ page }) => {
    // Drag nodes onto canvas
    // Connect edges
    // Configure nodes
    // Execute via chat
    // Verify output
  });

  // ... 6 more workflow tests
});
```

**Step 2: Implement if desired**

This is optional - manual testing via UI is sufficient per project conventions.

---

## Success Criteria

✅ **All 10 nodes visible in sidebar**
✅ **All 7 workflows built on canvas**
✅ **All 7 workflows execute successfully**
✅ **All 7 workflows produce expected output**
✅ **Documentation created in docs/workflows/**
✅ **API integrations verified (Firecrawl, Apify, MCP, HF)**
✅ **No console errors during execution**
✅ **WebSocket streaming works for all workflows**

---

## Notes

- **Manual testing approach:** Per project conventions, we use flow-driven E2E testing via the UI rather than automated tests
- **API key requirement:** Most workflows need real API keys to test properly
- **Execution time:** Each workflow test takes 1-3 minutes depending on API response times
- **Failure diagnosis:** If a workflow fails, trace through all layers: frontend → WebSocket → compiler → execution engine → Agno
- **Save flows:** Use FlowManager to save each workflow for future reference

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-09-workflow-integration-tests.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
