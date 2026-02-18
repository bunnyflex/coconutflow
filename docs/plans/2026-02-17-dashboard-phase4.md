# Dashboard Phase 4 — Keys + Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add API credentials manager (Keys page) and internal documentation (Docs page) to the CoconutFlow dashboard.

**Architecture:** Keys page calls the already-implemented backend credentials API. Docs page loads markdown files via Vite's `?raw` import and renders them with react-markdown + @tailwindcss/typography. Both dependencies already installed. No new backend work needed.

**Tech Stack:** react-markdown v10, @tailwindcss/typography, lucide-react, existing CoconutFlow design system. Backend credentials API already implemented at `/api/credentials`.

---

## Status

- [ ] Task 1: Frontend credentials API service
- [ ] Task 2: KeysPage component
- [ ] Task 3: Docs markdown content files
- [ ] Task 4: DocsPage component
- [ ] Task 5: Wire up /keys and /docs routes + update Sidebar

---

## Pre-flight: Confirmed existing state

**`frontend/src/services/api.ts`** — Has `flowApi` with a shared `request()` helper. `credentialsApi` goes after `flowApi`, reusing the same helper. Pattern: `request('/api/credentials/', { method: 'POST', body: JSON.stringify(data) })`.

**`frontend/src/components/layout/Sidebar.tsx`** — `NAV_ITEMS` array. Keys entry: `{ to: '/keys', icon: Key, label: 'Keys', comingSoon: true }`. Docs entry: `{ to: '/docs', icon: FileText, label: 'Docs', comingSoon: true }`. Both need `comingSoon: true` removed.

**`frontend/src/App.tsx`** — Currently has routes for `/`, `/flow`, `/flow/:id`, `/templates`, and catch-all `*`. Add `/keys` and `/docs` routes before the catch-all.

**`frontend/package.json`** — `react-markdown: ^10.1.0` and `@tailwindcss/typography: ^0.5.19` are already in `dependencies`. No installs needed.

**`backend/app/api/credentials.py`** — Fully implemented. Three endpoints:
- `POST /api/credentials/` — creates a credential (encrypts key with Fernet, stores encrypted_key, returns `CredentialResponse` without the key)
- `GET /api/credentials/` — lists credentials ordered by `created_at desc`, returns metadata only (id, service_name, credential_name, created_at)
- `DELETE /api/credentials/{credential_id}` — 204 on success, 404 if not found

---

## Task 1: Frontend credentials API service

**File:** Modify `frontend/src/services/api.ts`

**What to do:** Add `credentialsApi` export and its supporting TypeScript interfaces after the closing brace of `flowApi`. The `request<T>()` helper at the top of the file is shared — do not duplicate it.

**Read the file first**, then append the following after line 109 (after the closing `};` of `flowApi`):

```typescript
// ---------------------------------------------------------------------------
// Credentials API
// ---------------------------------------------------------------------------

export interface Credential {
  id: string;
  service_name: string;
  credential_name: string;
  created_at: string;
}

export interface CredentialCreate {
  service_name: string;
  credential_name: string;
  api_key: string;
}

export const credentialsApi = {
  /** List all saved credentials (keys never returned) */
  list(): Promise<Credential[]> {
    return request('/api/credentials/');
  },

  /** Store a new encrypted credential */
  create(data: CredentialCreate): Promise<Credential> {
    return request('/api/credentials/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Delete a credential by ID */
  delete(id: string): Promise<void> {
    return request(`/api/credentials/${id}`, { method: 'DELETE' });
  },
};
```

**Verify:** Run `npx tsc --noEmit` — expect 0 errors.

**Commit:**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/services/api.ts
git commit -m "feat: add credentialsApi service for Keys page"
```

---

## Task 2: KeysPage component

**File:** Create `frontend/src/pages/KeysPage.tsx`

This is a new file. No existing file to read first.

**Full implementation:**

```tsx
import { useEffect, useState } from 'react';
import { Trash2, Plus, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { credentialsApi, type Credential } from '../services/api';

const SERVICES = ['OpenAI', 'Anthropic', 'Firecrawl', 'Apify', 'HuggingFace', 'Other'];

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

export function KeysPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Credential | null>(null);

  // Form state
  const [service, setService] = useState('OpenAI');
  const [credName, setCredName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { loadCredentials(); }, []);

  async function loadCredentials() {
    try {
      setLoading(true);
      setError(null);
      setCredentials(await credentialsApi.list());
    } catch {
      setError('Failed to load credentials. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const created = await credentialsApi.create({
        service_name: service,
        credential_name: credName,
        api_key: apiKey,
      });
      setCredentials((prev) => [created, ...prev]);
      setShowForm(false);
      setCredName('');
      setApiKey('');
      setService('OpenAI');
    } catch {
      setFormError('Failed to save credential. Check backend is running.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cred: Credential) {
    setDeleting(cred.id);
    try {
      await credentialsApi.delete(cred.id);
      setCredentials((prev) => prev.filter((c) => c.id !== cred.id));
    } catch {
      setError('Failed to delete credential.');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">API Keys</h1>
            <p className="text-gray-400 text-sm mt-1">
              Stored encrypted. Keys are never shown after saving.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'Add Key'}
          </button>
        </div>

        {/* Add Key Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 bg-gray-800/50 border border-gray-700/60 rounded-xl p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Service</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  value={credName}
                  onChange={(e) => setCredName(e.target.value)}
                  placeholder="e.g. Production"
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  required
                  className="w-full px-3 py-2 pr-9 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {formError && <p className="text-xs text-red-400">{formError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save Key
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading keys...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && credentials.length === 0 && !error && (
          <div className="text-center py-16 text-gray-500 text-sm">
            No API keys saved yet. Add your first key above.
          </div>
        )}

        {/* Credentials table */}
        {!loading && credentials.length > 0 && (
          <div className="border border-gray-700/60 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/60 bg-gray-800/30">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Service</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Key</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred, i) => (
                  <tr
                    key={cred.id}
                    className={i < credentials.length - 1 ? 'border-b border-gray-700/40' : ''}
                  >
                    <td className="px-4 py-3 text-white font-medium">{cred.service_name}</td>
                    <td className="px-4 py-3 text-gray-300">{cred.credential_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">••••••••••••</td>
                    <td className="px-4 py-3 text-gray-500">{timeAgo(cred.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDelete(cred)}
                        disabled={deleting === cred.id}
                        className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {deleting === cred.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Confirm delete dialog */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 max-w-sm w-full">
              <h3 className="text-white font-medium mb-2">Delete API Key?</h3>
              <p className="text-gray-400 text-sm mb-4">
                Remove{' '}
                <strong className="text-white">
                  {confirmDelete.service_name} — {confirmDelete.credential_name}
                </strong>
                ? This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

**Verify:** Run `cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && npx tsc --noEmit` — expect 0 errors.

**Commit:**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/pages/KeysPage.tsx
git commit -m "feat: add KeysPage with credentials table, add form, and delete confirmation"
```

---

## Task 3: Docs markdown content files

**Files:** Create `frontend/src/docs/` directory and 15 markdown files.

All files should contain real, useful content (150–300 words). Use headers and code blocks where relevant.

### `frontend/src/docs/getting-started.md`

```markdown
# What is CoconutFlow?

CoconutFlow is a no-code visual builder for creating AI agent workflows. You connect nodes on a canvas to form a directed graph — each node represents a step in your pipeline, such as receiving user input, calling an LLM, searching the web, or querying a knowledge base.

## The Canvas

The canvas is the main workspace. You can:

- **Add nodes** by clicking the "+" button in the left panel and dragging node types onto the canvas
- **Connect nodes** by dragging from an output handle (right side) to an input handle (left side) of another node
- **Configure nodes** by clicking on any node to open the configuration panel on the right
- **Run flows** by opening the Chat panel (bottom-right) and sending a message, or clicking the Run button

## Execution Model

When you run a flow, the backend compiles your graph into a topologically sorted execution plan. Nodes run in order, and each node receives the output of all upstream nodes as context. Results stream back in real-time over a WebSocket connection.

## Saving Flows

Flows are saved automatically as you make changes. Use the Flow Manager (toolbar) to give your flow a name, open saved flows, or create a copy.

## Next Steps

- Follow the [Your First Flow](first-flow) guide to build a working pipeline in under 5 minutes
- Browse the [Node Reference](nodes/input) to understand what each node type does
```

### `frontend/src/docs/first-flow.md`

```markdown
# Your First Flow

This guide walks you through building a simple Input → LLM Agent → Output pipeline.

## Step 1: Add an Input node

1. Click the "+" button in the left sidebar
2. Drag the **Input** node onto the canvas
3. Click the node to open its config panel
4. Set the label to `User Question`

## Step 2: Add an LLM Agent node

1. Drag an **LLM Agent** node onto the canvas to the right of your Input node
2. In the config panel, select your provider (e.g., OpenAI) and model (e.g., `gpt-4o-mini`)
3. Set a system prompt, for example: `You are a helpful assistant. Answer concisely.`
4. Make sure your API key is set — either in the Keys page or in the backend `.env` file

## Step 3: Add an Output node

1. Drag an **Output** node to the right of the Agent node
2. Set its label to `Answer`

## Step 4: Connect the nodes

1. Drag from the right handle of **Input** to the left handle of **LLM Agent**
2. Drag from the right handle of **LLM Agent** to the left handle of **Output**

## Step 5: Run the flow

1. Click the chat icon (bottom-right) to open the Chat panel
2. Type a question and press Enter
3. Watch the nodes light up as execution progresses
4. The answer appears in the chat panel when complete

## What Just Happened

Your input was passed as context to the LLM Agent, which called the OpenAI API and returned a response. The Output node collected and displayed the final result.
```

### `frontend/src/docs/nodes/input.md`

```markdown
# Input Node

The Input node is the entry point for your flow. It receives data from the user and passes it downstream to connected nodes.

## Configuration

| Field | Description |
|-------|-------------|
| Label | A display name shown on the node and in execution logs |
| Default Value | Optional pre-filled value; used when no runtime input is provided |

## Behaviour

- During **Chat panel** execution, the Input node receives the text the user typed into the chat box
- During **Run button** execution (no chat), the Input node uses its configured Default Value
- The raw string value is passed as context to all directly connected downstream nodes

## Multiple Input Nodes

You can have more than one Input node in a flow. Each will receive the same user input text. This is useful for flows where you want to fan out to multiple parallel branches from a single user message.

## Output Format

The Input node outputs a plain string. Downstream nodes that accept context (LLM Agent, Knowledge Base, Conditional) receive this string merged into their context window.

## Tips

- Give Input nodes descriptive labels (`User Question`, `Search Query`) to make execution logs easier to read
- If your flow has no Input node, the LLM Agent will run with no user context — only its system prompt
```

### `frontend/src/docs/nodes/llm-agent.md`

```markdown
# LLM Agent Node

The LLM Agent node calls an AI language model to process input and produce text output. It is the core intelligence node in most flows.

## Configuration

| Field | Description |
|-------|-------------|
| Provider | AI provider: OpenAI, Anthropic, Google, Groq, or Ollama |
| Model | Model ID (e.g. `gpt-4o`, `claude-3-5-sonnet-20241022`, `gemini-2.0-flash`) |
| System Prompt | Instructions that define the agent's role and behaviour |
| Temperature | Sampling temperature (0 = deterministic, 1 = creative) |

## Supported Providers

- **OpenAI** — Requires `OPENAI_API_KEY` in backend `.env`
- **Anthropic** — Requires `ANTHROPIC_API_KEY`
- **Google** — Requires `GOOGLE_API_KEY` (Gemini models)
- **Groq** — Requires `GROQ_API_KEY` (fast Llama/Mixtral inference)
- **Ollama** — Runs locally; set `OLLAMA_HOST` if not on localhost

## Context Handling

All upstream node outputs are automatically injected into the agent's user message as context. You do not need to manually wire context — the execution engine handles this.

## Multi-Agent Chaining

You can connect one LLM Agent's output to another LLM Agent's input. The second agent receives the first agent's response as part of its context.

## Example System Prompts

```
You are a research assistant. Summarise the provided information concisely.
```

```
You are a code reviewer. Identify bugs and suggest improvements.
```
```

### `frontend/src/docs/nodes/web-search.md`

```markdown
# Web Search Node

The Web Search node runs a DuckDuckGo search query and returns the top results as structured text. No API key required.

## Configuration

| Field | Description |
|-------|-------------|
| Max Results | Number of search results to return (default: 5, max: 20) |

## Behaviour

- The search query is taken from upstream node output (typically an Input node)
- Results include title, URL, and snippet for each result
- All results are concatenated and passed downstream as a single text block

## Typical Usage

Connect an Input node directly to a Web Search node, then feed the results into an LLM Agent to summarise or analyse:

```
Input -> Web Search -> LLM Agent -> Output
```

The LLM Agent receives the raw search results as context and can synthesise an answer.

## Limitations

- DuckDuckGo results are snippets only — not full page content. For full page scraping, use the Firecrawl node instead.
- Search results may vary by region and DuckDuckGo's index freshness
- Rate limits apply if you run many searches in rapid succession

## Tips

- Keep queries concise and specific for better results
- Use an LLM Agent upstream to reformulate the user's question into a better search query before passing it to Web Search
```

### `frontend/src/docs/nodes/knowledge-base.md`

```markdown
# Knowledge Base Node

The Knowledge Base node enables Retrieval-Augmented Generation (RAG). It embeds documents into a pgvector database and retrieves the most relevant chunks at query time.

## Configuration

| Field | Description |
|-------|-------------|
| Name | A unique identifier for this knowledge base |
| Sources | Files, website URLs, or YouTube video URLs to embed |

## Supported Source Types

| Type | Examples |
|------|---------|
| Files | PDF, TXT, MD, DOCX, PPTX — uploaded via the node's file picker |
| Websites | Any `http://` or `https://` URL — content is scraped and embedded |
| YouTube | YouTube video URLs — transcript is extracted and embedded |

## Requirements

- Supabase with the `pgvector` extension enabled
- `SUPABASE_URL` and `SUPABASE_KEY` set in backend `.env`
- Use the Session Pooler URL for `SUPABASE_URL` (IPv4 compatible)

## How It Works

1. On first execution, documents are loaded and split into chunks
2. Each chunk is embedded using the configured LLM provider's embedding model
3. At query time, the user's input is embedded and the most similar chunks are retrieved
4. Retrieved chunks are passed downstream as context to an LLM Agent

## Typical Pipeline

```
Input -> Knowledge Base -> LLM Agent -> Output
```

## Tips

- Give each Knowledge Base node a unique name — it maps to a separate collection in pgvector
- Large PDFs may take 30–60 seconds to embed on first run
- Websites are scraped once at execution time; they are not continuously updated
```

### `frontend/src/docs/nodes/conditional.md`

```markdown
# Conditional Node

The Conditional node evaluates a condition using an LLM and routes execution down either the true or false path. It enables if/else branching in your flow.

## Configuration

| Field | Description |
|-------|-------------|
| Condition | A natural-language question the LLM answers with "true" or "false" |
| Provider / Model | The LLM used to evaluate the condition |

## How It Works

1. At execution time, the Conditional node receives upstream context (e.g. the user's input)
2. It sends the condition question to the configured LLM along with that context
3. The LLM responds with "true" or "false"
4. Nodes connected to the **true** output handle execute if the answer is "true"
5. Nodes connected to the **false** output handle execute if the answer is "false"
6. The skipped branch's nodes are marked as skipped and do not produce output

## Example Conditions

```
Does the user's message contain a question?
Is the user asking about pricing?
Is the sentiment of the input negative?
```

## Output Handles

The Conditional node has two output handles:
- **True** (green) — connect nodes that should run when the condition is true
- **False** (red) — connect nodes that should run when the condition is false

## Tips

- Phrase your condition as a yes/no question for reliable LLM evaluation
- Use a fast, cheap model (e.g. `gpt-4o-mini`) for condition evaluation to keep latency low
- Cascading conditionals work — you can chain multiple Conditional nodes
```

### `frontend/src/docs/nodes/output.md`

```markdown
# Output Node

The Output node marks the end of a flow branch. It collects the output of all directly upstream nodes and presents it as the final result.

## Configuration

| Field | Description |
|-------|-------------|
| Label | Display name shown in the execution results panel |

## Behaviour

- Aggregates all upstream node outputs into a single result
- When the Chat panel is open, the output appears as the assistant's reply
- Multiple Output nodes are allowed — each represents a separate final result

## Multiple Outputs

You can have more than one Output node in a flow. This is typical for Conditional flows where you want different outputs for the true and false branches:

```
Conditional -> LLM Agent A -> Output (True Path)
            -> LLM Agent B -> Output (False Path)
```

Only the Output node on the active branch produces a result; the other is marked as skipped.

## Execution Results

Each Output node's result is shown in the right-side execution panel after a flow completes. Results are labelled using the Output node's configured label.

## Tips

- Label your Output nodes descriptively (`Final Answer`, `Error Response`, `Summary`) to make results easier to identify
- If no Output node is connected to the last node in a chain, the Chat panel still displays results — it falls back to the output of the last completed node
```

### `frontend/src/docs/nodes/firecrawl.md`

```markdown
# Firecrawl Scrape Node

The Firecrawl node scrapes a web page and returns its content as clean markdown. It is useful when you need full page content rather than search snippets.

## Configuration

| Field | Description |
|-------|-------------|
| URL | The web page to scrape (can be a static URL or taken from upstream output) |
| API Key | Your Firecrawl API key (get one at firecrawl.dev) |

## Requirements

- A Firecrawl account and API key — sign up at [firecrawl.dev](https://firecrawl.dev)
- The target URL must be publicly accessible

## Output

Returns the page content as clean markdown, with navigation, ads, and boilerplate removed. Well-structured pages produce the best results.

## Typical Usage

```
Input (URL) -> Firecrawl -> LLM Agent -> Output
```

Or as part of a research pipeline:

```
Input -> Web Search -> Firecrawl -> LLM Agent (Summariser) -> Output
```

## Tips

- Store your Firecrawl API key in the Keys page so it is available without hardcoding
- Firecrawl handles JavaScript-rendered pages; DuckDuckGo Web Search does not
- For bulk scraping (multiple URLs), consider the Apify node with an appropriate actor
```

### `frontend/src/docs/nodes/apify.md`

```markdown
# Apify Actor Node

The Apify node runs any Apify actor and returns its output as structured data. Apify offers hundreds of pre-built scrapers and automation actors.

## Configuration

| Field | Description |
|-------|-------------|
| Actor ID | The Apify actor identifier (e.g. `apify/web-scraper`) |
| Input | JSON configuration passed to the actor |
| API Key | Your Apify API token |

## Requirements

- An Apify account — sign up at [apify.com](https://apify.com)
- Your API token from the Apify console

## Finding Actor IDs

Browse actors at [apify.com/store](https://apify.com/store). Each actor page shows its ID in the format `username/actor-name`.

Popular actors:
- `apify/web-scraper` — general web scraping
- `apify/cheerio-scraper` — fast HTML scraping
- `apify/playwright-scraper` — JavaScript-heavy sites

## Input Format

The Input field accepts a JSON object matching the actor's input schema. Refer to the actor's documentation on the Apify store for the exact fields.

Example for a simple URL scraper:

```json
{
  "startUrls": [{ "url": "https://example.com" }],
  "maxCrawlingDepth": 1
}
```

## Output

Returns the actor's dataset output as a JSON string, which can be processed by a downstream LLM Agent.

## Tips

- Save your Apify API token in the Keys page
- Actor runs are billed to your Apify account; check pricing before running expensive actors in a loop
```

### `frontend/src/docs/nodes/mcp-server.md`

```markdown
# MCP Server Node

The MCP (Model Context Protocol) Server node connects your flow to any MCP-compatible tool server. MCP is an open standard for extending LLM agents with external capabilities.

## Configuration

| Field | Description |
|-------|-------------|
| Server URL | The URL of the MCP server (e.g. `http://localhost:3001`) |
| Tool Name | The specific tool to invoke on the server |
| Parameters | JSON object of parameters to pass to the tool |

## What is MCP?

MCP (Model Context Protocol) is a protocol that allows AI applications to connect to external tool servers in a standardised way. An MCP server exposes tools — functions that can be called by an AI agent to perform actions like reading files, querying databases, or calling APIs.

## Typical Use Cases

- Connect to a local filesystem MCP server to read project files
- Use a database MCP server to query your data
- Integrate with third-party MCP servers published by tool vendors

## Self-Hosting an MCP Server

```bash
npx @modelcontextprotocol/server-filesystem /path/to/directory
```

Then set the Server URL to `http://localhost:3001` in the node config.

## Output

Returns the tool's response as a string, passed downstream as context.

## Tips

- MCP servers must be running and accessible from the machine running the CoconutFlow backend
- For production deployments, ensure MCP servers are network-accessible from the backend container
```

### `frontend/src/docs/nodes/huggingface.md`

```markdown
# Hugging Face Inference Node

The Hugging Face node calls the Hugging Face Inference API to run any hosted model. It supports text generation, text classification, embeddings, and other inference tasks.

## Configuration

| Field | Description |
|-------|-------------|
| Model ID | The Hugging Face model repository (e.g. `mistralai/Mistral-7B-Instruct-v0.2`) |
| Task | Inference task type: `text-generation`, `text-classification`, `feature-extraction`, etc. |
| API Key | Your Hugging Face API token |
| Parameters | Optional JSON object of model-specific parameters |

## Requirements

- A Hugging Face account — sign up at [huggingface.co](https://huggingface.co)
- An API token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- The target model must be available via the Inference API (shown on the model page)

## Common Tasks

| Task | Description |
|------|-------------|
| `text-generation` | Generate text completions (chat, summarisation) |
| `text-classification` | Classify text into categories (sentiment, topic) |
| `feature-extraction` | Generate embeddings for semantic similarity |
| `question-answering` | Extract answers from context |

## Example Parameters

```json
{
  "max_new_tokens": 256,
  "temperature": 0.7,
  "return_full_text": false
}
```

## Tips

- Free-tier Inference API has rate limits; use a paid plan for production
- Save your HuggingFace token in the Keys page
- For open-weight models requiring more compute, consider Hugging Face Inference Endpoints
```

### `frontend/src/docs/tutorials/research-pipeline.md`

```markdown
# Tutorial: Research Pipeline

This tutorial builds a pipeline that takes a research question, searches the web, and returns a synthesised answer.

**Flow pattern:** Input -> Web Search -> LLM Agent -> Output

## Prerequisites

- OpenAI API key configured in your backend `.env`
- CoconutFlow running locally (frontend on port 5173, backend on port 8000)

## Step 1: Build the flow

1. Open CoconutFlow and click **New Flow**
2. Add an **Input** node. Label it `Research Question`
3. Add a **Web Search** node. Set Max Results to `8`
4. Add an **LLM Agent** node with:
   - Provider: OpenAI
   - Model: `gpt-4o-mini`
   - System Prompt: `You are a research assistant. Using the provided web search results, write a clear, accurate, and well-structured answer to the user's question. Cite sources where possible.`
5. Add an **Output** node. Label it `Research Summary`

## Step 2: Connect the nodes

Connect in order: Input -> Web Search -> LLM Agent -> Output

## Step 3: Run it

Open the Chat panel and ask a question:

```
What are the latest developments in quantum computing?
```

## What to Expect

1. The Input node captures your question
2. Web Search queries DuckDuckGo and returns 8 results
3. The LLM Agent receives both your question and the search results as context
4. It synthesises a cited answer and sends it to the Output node
5. The answer appears in the Chat panel

## Enhancements

- Add a second LLM Agent before Web Search to reformulate the question into an optimised search query
- Add a Conditional node to route simple questions (no search needed) vs complex ones
```

### `frontend/src/docs/tutorials/rag-documents.md`

```markdown
# Tutorial: RAG with Documents

This tutorial builds a document Q&A pipeline using Retrieval-Augmented Generation.

**Flow pattern:** Input -> Knowledge Base -> LLM Agent -> Output

## Prerequisites

- Supabase project with pgvector extension enabled
- `SUPABASE_URL` (Session Pooler URL) and `SUPABASE_KEY` in backend `.env`
- OpenAI API key for embeddings and generation

## Step 1: Prepare your documents

Gather 1–3 documents to embed. Supported formats: PDF, TXT, MD, DOCX.

## Step 2: Build the flow

1. Add an **Input** node. Label it `Question`
2. Add a **Knowledge Base** node:
   - Name: `my-docs` (unique identifier)
   - Upload your documents using the file picker in the config panel
3. Add an **LLM Agent** node:
   - Model: `gpt-4o-mini`
   - System Prompt: `You are a helpful assistant. Answer the user's question using only the provided document context. If the context does not contain the answer, say so clearly.`
4. Add an **Output** node. Label it `Answer`

## Step 3: Connect

Input -> Knowledge Base -> LLM Agent -> Output

## Step 4: Run it

Open Chat panel and ask a question about your documents.

## What Happens

1. Your question is embedded as a vector
2. The Knowledge Base retrieves the most similar document chunks
3. Chunks and your question are passed to the LLM Agent as context
4. The agent generates an answer grounded in your documents

## Tips

- First run takes longer — documents are embedded and stored in pgvector
- Subsequent runs are fast (embeddings already stored)
- Add website URLs or YouTube links in the KB config to expand your knowledge source
```

### `frontend/src/docs/api/python-export.md`

```markdown
# Python Export

CoconutFlow can export any flow as a standalone Python script powered by the Agno framework. This lets you run your workflow outside the CoconutFlow UI — in CI pipelines, scheduled jobs, or your own applications.

## Exporting a Flow

1. Open your flow on the canvas
2. Click the **Export** button in the toolbar (download icon)
3. Choose **Export as Python**
4. The script downloads as `flow.py`

## Running the Exported Script

### 1. Install dependencies

```bash
pip install agno openai anthropic duckduckgo-search
```

### 2. Set environment variables

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or use python-dotenv:

```bash
pip install python-dotenv
```

```python
from dotenv import load_dotenv
load_dotenv()
```

### 3. Run the script

```bash
python flow.py
```

## Script Structure

The exported script contains:

- **Imports** — Agno framework and provider SDK imports
- **Agent definitions** — Each LLM Agent node becomes an `Agent` instance
- **Tool setup** — Web Search, Knowledge Base, and external integrations
- **Execution function** — `run_flow(input_text)` that executes the pipeline
- **Main block** — `if __name__ == "__main__"` entry point with a sample input

## Customisation

The exported script is plain Python — you can modify it freely:

- Change the input source (read from a file, API, database)
- Add logging or error handling
- Wrap the `run_flow()` function in a Flask/FastAPI endpoint
- Schedule it with cron or a job queue

## Limitations

- Conditional branching in exported scripts uses static evaluation — LLM-evaluated conditions are preserved
- Knowledge Base nodes require Supabase credentials in the environment
```

**Verification:** All 15 files created. Directory structure:

```
frontend/src/docs/
  getting-started.md
  first-flow.md
  nodes/
    input.md
    llm-agent.md
    web-search.md
    knowledge-base.md
    conditional.md
    output.md
    firecrawl.md
    apify.md
    mcp-server.md
    huggingface.md
  tutorials/
    research-pipeline.md
    rag-documents.md
  api/
    python-export.md
```

**Commit:**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/docs/
git commit -m "docs: add documentation markdown content for DocsPage"
```

---

## Task 4: DocsPage component

**Files:**
1. Create `frontend/src/types/raw.d.ts` — TypeScript declaration for `?raw` imports
2. Create `frontend/src/pages/DocsPage.tsx`

### Step 1: Create `frontend/src/types/raw.d.ts`

Vite supports `?raw` imports without any config. TypeScript does not. This declaration file teaches the TypeScript compiler to accept them.

```typescript
// frontend/src/types/raw.d.ts
declare module '*.md?raw' {
  const content: string;
  export default content;
}
```

### Step 2: Create `frontend/src/pages/DocsPage.tsx`

```tsx
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AppShell } from '../components/layout/AppShell';
import { ChevronRight } from 'lucide-react';

// Import all docs as raw strings using Vite's ?raw suffix
import gettingStarted from '../docs/getting-started.md?raw';
import firstFlow from '../docs/first-flow.md?raw';
import nodeInput from '../docs/nodes/input.md?raw';
import nodeLLMAgent from '../docs/nodes/llm-agent.md?raw';
import nodeWebSearch from '../docs/nodes/web-search.md?raw';
import nodeKnowledgeBase from '../docs/nodes/knowledge-base.md?raw';
import nodeConditional from '../docs/nodes/conditional.md?raw';
import nodeOutput from '../docs/nodes/output.md?raw';
import nodeFirecrawl from '../docs/nodes/firecrawl.md?raw';
import nodeApify from '../docs/nodes/apify.md?raw';
import nodeMCP from '../docs/nodes/mcp-server.md?raw';
import nodeHuggingFace from '../docs/nodes/huggingface.md?raw';
import tutorialResearch from '../docs/tutorials/research-pipeline.md?raw';
import tutorialRAG from '../docs/tutorials/rag-documents.md?raw';
import apiPythonExport from '../docs/api/python-export.md?raw';

const DOCS: Record<string, string> = {
  'getting-started': gettingStarted,
  'first-flow': firstFlow,
  'nodes/input': nodeInput,
  'nodes/llm-agent': nodeLLMAgent,
  'nodes/web-search': nodeWebSearch,
  'nodes/knowledge-base': nodeKnowledgeBase,
  'nodes/conditional': nodeConditional,
  'nodes/output': nodeOutput,
  'nodes/firecrawl': nodeFirecrawl,
  'nodes/apify': nodeApify,
  'nodes/mcp-server': nodeMCP,
  'nodes/huggingface': nodeHuggingFace,
  'tutorials/research-pipeline': tutorialResearch,
  'tutorials/rag-documents': tutorialRAG,
  'api/python-export': apiPythonExport,
};

interface DocItem {
  id: string;
  label: string;
}

interface DocSection {
  title: string;
  items: DocItem[];
}

const STRUCTURE: DocSection[] = [
  {
    title: 'Getting Started',
    items: [
      { id: 'getting-started', label: 'What is CoconutFlow?' },
      { id: 'first-flow', label: 'Your first flow' },
    ],
  },
  {
    title: 'Node Reference',
    items: [
      { id: 'nodes/input', label: 'Input' },
      { id: 'nodes/llm-agent', label: 'LLM Agent' },
      { id: 'nodes/web-search', label: 'Web Search' },
      { id: 'nodes/knowledge-base', label: 'Knowledge Base' },
      { id: 'nodes/conditional', label: 'Conditional' },
      { id: 'nodes/output', label: 'Output' },
      { id: 'nodes/firecrawl', label: 'Firecrawl' },
      { id: 'nodes/apify', label: 'Apify' },
      { id: 'nodes/mcp-server', label: 'MCP Server' },
      { id: 'nodes/huggingface', label: 'Hugging Face' },
    ],
  },
  {
    title: 'Tutorials',
    items: [
      { id: 'tutorials/research-pipeline', label: 'Research Pipeline' },
      { id: 'tutorials/rag-documents', label: 'RAG with Documents' },
    ],
  },
  {
    title: 'API & Export',
    items: [{ id: 'api/python-export', label: 'Python Export' }],
  },
];

export function DocsPage() {
  const [selected, setSelected] = useState('getting-started');
  const content =
    DOCS[selected] ?? '# Not found\nThis document does not exist yet.';

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Docs nav sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-gray-700/60 px-3 py-6 overflow-y-auto">
          {STRUCTURE.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-1">
                {section.title}
              </p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  className={`w-full text-left flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors ${
                    selected === item.id
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {selected === item.id && (
                    <ChevronRight size={12} className="flex-shrink-0" />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-10 py-8">
          <article className="prose prose-invert prose-sm max-w-2xl">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </main>
      </div>
    </AppShell>
  );
}
```

**Note on `?raw` imports:** Vite handles `?raw` imports natively at build time — no `vite.config.ts` change is needed. The `raw.d.ts` declaration file is only needed so TypeScript's type-checker does not error on the import syntax.

**Verify:** Run `cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && npx tsc --noEmit` — expect 0 errors.

**Commit:**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/types/raw.d.ts frontend/src/pages/DocsPage.tsx
git commit -m "feat: add DocsPage with left-nav and react-markdown prose rendering"
```

---

## Task 5: Wire up /keys and /docs routes + update Sidebar

**Files:**
- Modify `frontend/src/App.tsx`
- Modify `frontend/src/components/layout/Sidebar.tsx`

**Read both files before editing.**

### App.tsx changes

Current state (from pre-flight read):

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { CanvasPage } from './pages/CanvasPage';
import { DashboardPage } from './pages/DashboardPage';
import { TemplatesPage } from './pages/TemplatesPage';
import ToastContainer from './components/ui/Toast';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/flow" element={<CanvasPage />} />
        <Route path="/flow/:id" element={<CanvasPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
```

Add two imports and two routes:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { CanvasPage } from './pages/CanvasPage';
import { DashboardPage } from './pages/DashboardPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { KeysPage } from './pages/KeysPage';
import { DocsPage } from './pages/DocsPage';
import ToastContainer from './components/ui/Toast';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/flow" element={<CanvasPage />} />
        <Route path="/flow/:id" element={<CanvasPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/keys" element={<KeysPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
```

### Sidebar.tsx changes

Current `NAV_ITEMS` (from pre-flight read):

```typescript
const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/flows', icon: Layers, label: 'My Flows', comingSoon: true },
  { to: '/templates', icon: BookOpen, label: 'Templates' },
  { to: '/keys', icon: Key, label: 'Keys', comingSoon: true },
  { to: '/docs', icon: FileText, label: 'Docs', comingSoon: true },
];
```

Remove `comingSoon: true` from the Keys and Docs entries only. Leave `/flows` as `comingSoon: true` — it is not implemented yet.

```typescript
const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/flows', icon: Layers, label: 'My Flows', comingSoon: true },
  { to: '/templates', icon: BookOpen, label: 'Templates' },
  { to: '/keys', icon: Key, label: 'Keys' },
  { to: '/docs', icon: FileText, label: 'Docs' },
];
```

**Verify:** Run `cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && npx tsc --noEmit` — expect 0 errors.

**Commit:**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: add /keys and /docs routes, activate sidebar nav items"
```

---

## Final Verification Checklist

After all 5 tasks are complete, verify end-to-end:

```
1. Start backend:
   cd backend && python3 -m uvicorn app.main:app --reload --port 8000

2. Start frontend:
   cd frontend && PATH="/opt/homebrew/bin:$PATH" npx vite --port 5173

3. Visit http://localhost:5173/keys
   - [ ] Page loads without errors
   - [ ] "API Keys" heading and "Add Key" button visible
   - [ ] Empty state: "No API keys saved yet" (or existing keys listed if any)
   - [ ] Click "Add Key" — inline form appears with service dropdown, name input, API key input with show/hide toggle
   - [ ] Fill form and submit — key appears in table with masked value
   - [ ] Click trash icon — confirm dialog appears
   - [ ] Confirm deletion — key disappears from table
   - [ ] Error state: if backend is down, "Failed to load credentials" message appears

4. Visit http://localhost:5173/docs
   - [ ] Page loads without errors
   - [ ] Left sidebar nav shows 4 sections: Getting Started, Node Reference, Tutorials, API & Export
   - [ ] "What is CoconutFlow?" is selected by default and content renders
   - [ ] Click "LLM Agent" — content updates with LLM Agent documentation
   - [ ] Content has prose styling (readable typography, code blocks styled)
   - [ ] Clicking any nav item updates content without page reload

5. Sidebar navigation
   - [ ] "Keys" link in sidebar is clickable (no longer grayed out with "Soon" badge)
   - [ ] "Docs" link in sidebar is clickable (no longer grayed out with "Soon" badge)
   - [ ] Active state highlights correctly when on /keys and /docs pages
   - [ ] "My Flows" still shows "Soon" badge (not yet implemented)
```

---

## Notes and Gotchas

### TypeScript and `?raw` imports

Vite supports `?raw` imports without any config. TypeScript does not. The `frontend/src/types/raw.d.ts` file resolves TS2307 ("Cannot find module '*.md?raw'"). If TypeScript still complains after adding this file, check that the `tsconfig.json` includes the `src/types/` directory — it should by default via `"include": ["src"]`.

### react-markdown v10

react-markdown v10 uses ESM only. It works with Vite out of the box. The `prose` class from `@tailwindcss/typography` must be included in the Tailwind config's content array — check `tailwind.config.ts` to ensure `src/**/*.tsx` is covered (it should be by default with Tailwind v4's content detection).

### Backend credentials API note

The backend `DELETE /api/credentials/{credential_id}` endpoint returns HTTP 204 (no body). The `request<T>()` helper in `api.ts` already handles this: `if (res.status === 204) return undefined as T`. No special handling needed in `credentialsApi.delete()`.

### Key masking

The API never returns the plain or encrypted key — only `id`, `service_name`, `credential_name`, and `created_at`. The table shows `••••••••••••` as a static placeholder. There is no "last 4 digits" feature because the backend does not expose any portion of the key value.
