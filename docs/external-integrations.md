# External Integrations Setup Guide

This guide covers setup and usage of the 4 external integration node types added in Phase 1.

## Overview

CoconutFlow now supports 4 powerful external integrations:

1. **Firecrawl Scrape** - Convert websites to clean Markdown/JSON for RAG
2. **Apify Actor** - Run 1,500+ pre-built scrapers (social media, maps, e-commerce)
3. **MCP Server** - Connect to Model Context Protocol servers for enhanced AI capabilities
4. **Hugging Face Inference** - Run inference on 600k+ models (text gen, embeddings, classification)

## Prerequisites

### 1. Install Dependencies

Dependencies are already in `requirements.txt`. If starting fresh:

```bash
cd backend
pip install firecrawl-py apify-client huggingface_hub cryptography
```

### 2. Set Up Credential Vault

Generate encryption key for credential vault:

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Add to `.env`:

```bash
CREDENTIAL_VAULT_KEY=your-generated-key-here
```

### 3. Run Supabase Migration

Execute `backend/migrations/002_create_credentials_table.sql` in Supabase SQL Editor:

1. Log into Supabase dashboard
2. Go to **SQL Editor**
3. Paste and run the migration
4. Verify: `SELECT * FROM credentials LIMIT 1;`

### 4. Add API Keys

You can manage credentials via the API or add directly to `.env`:

```bash
# Option 1: Environment variables (quick start)
FIRECRAWL_API_KEY=your-firecrawl-key
APIFY_API_KEY=your-apify-key
HUGGINGFACE_API_KEY=your-hf-key

# Option 2: Use Credentials API (production)
# POST to /api/credentials (see API section below)
```

---

## Node Types

### 1. Firecrawl Scrape Node

**Purpose:** Convert any website to clean Markdown, HTML, or screenshots for RAG pipelines.

**Configuration:**
- **URL**: Website to scrape (supports `{{upstream}}` templates)
- **Formats**: Select output formats (markdown, html, screenshot)
- **Include Metadata**: Extract meta tags, title, description
- **Credential**: Firecrawl API key (from vault or env)

**Example Flow:**
```
Input (URL) → Firecrawl Scrape → LLM Agent → Output
```

**Use Cases:**
- Extract documentation for knowledge bases
- Scrape product pages for e-commerce analysis
- Convert blog posts to structured data

**API Key:** Get from https://firecrawl.dev

---

### 2. Apify Actor Node

**Purpose:** Run any of Apify's 1,500+ pre-built actors (scrapers) for Instagram, LinkedIn, Google Maps, Amazon, YouTube, and more.

**Configuration:**
- **Actor ID**: Apify actor path (e.g., `apify/instagram-scraper`)
- **Input**: JSON configuration specific to the actor
- **Max Items**: Limit results (1-1000)
- **Timeout**: Max execution time in seconds (60-3600)
- **Credential**: Apify API key

**Example Flow:**
```
Input (username) → Apify Actor (Instagram) → Output (posts)
```

**Popular Actors:**
- `apify/instagram-scraper` - Instagram profiles, posts, comments
- `apify/linkedin-profile-scraper` - LinkedIn profiles and posts
- `apify/google-maps-scraper` - Places, reviews, business info
- `apify/amazon-product-scraper` - Products, reviews, pricing
- `apify/youtube-scraper` - Videos, transcripts, comments

**API Key:** Get from https://apify.com

---

### 3. MCP Server Node

**Purpose:** Connect to Model Context Protocol servers to give AI agents access to tools (filesystem, databases, APIs, GitHub, etc.).

**Configuration:**
- **Server Name**: User-friendly label (e.g., "GitHub")
- **Server URL**: MCP server command or URL
  - stdio: `npx -y @modelcontextprotocol/server-github`
  - SSE/HTTP: Server endpoint URL
- **Server Type**: stdio, SSE, or HTTP
- **Instructions**: Custom agent system prompt
- **Credential**: API key if server requires auth

**Example Flow:**
```
Input (task) → MCP Server (GitHub) → Output (code changes)
```

**Available MCP Servers:**
- GitHub: Create PRs, search code, manage issues
- Filesystem: Read/write files (with security whitelist)
- Database: Query SQL databases
- Slack: Send messages, read channels
- More: See https://modelcontextprotocol.io/

**Note:** MCP SDK is still in development. Server availability may vary.

---

### 4. Hugging Face Inference Node

**Purpose:** Run inference on 600k+ open-source models from Hugging Face Hub.

**Configuration:**
- **Model ID**: Hugging Face model path (e.g., `meta-llama/Llama-3.2-3B`)
- **Task**: Inference task type
  - `text-generation` - Generate text continuations
  - `embeddings` - Convert text to vector embeddings
  - `classification` - Classify text into categories
  - `ner` - Named entity recognition
  - `translation` - Translate between languages
  - `summarization` - Summarize long text
  - `image-generation` - Generate images (e.g., Stable Diffusion)
- **Parameters**: Task-specific JSON config (temperature, max_tokens, etc.)
- **Input Key**: Template for upstream data (e.g., `{{upstream.data}}`)
- **Credential**: Hugging Face API token

**Example Flow:**
```
Input (text) → HF Inference (embeddings) → Knowledge Base (store vectors)
```

**Popular Models:**
- `meta-llama/Llama-3.2-3B` - Text generation
- `sentence-transformers/all-MiniLM-L6-v2` - Embeddings
- `facebook/bart-large-cnn` - Summarization
- `stabilityai/stable-diffusion-2-1` - Image generation

**API Key:** Get from https://huggingface.co/settings/tokens

---

## Credentials API

Manage encrypted credentials programmatically:

### Create Credential

```bash
POST /api/credentials
Content-Type: application/json

{
  "service_name": "firecrawl",
  "credential_name": "production",
  "api_key": "sk-your-api-key"
}
```

**Response:**
```json
{
  "id": "uuid-here",
  "service_name": "firecrawl",
  "credential_name": "production",
  "created_at": "2026-02-09T12:34:56Z"
}
```

Note: The plain API key is **never** returned.

### List Credentials

```bash
GET /api/credentials
```

Returns credential metadata (IDs, names, dates) without keys.

### Delete Credential

```bash
DELETE /api/credentials/{credential_id}
```

Returns `204 No Content` on success.

### Decrypt Credential (Server-Side Only)

```bash
GET /api/credentials/{credential_id}/decrypt
```

**Warning:** Returns plain API key. Never expose to frontend. Use server-side only for runtime execution.

---

## Security Considerations

### Credential Vault

- API keys encrypted with Fernet symmetric encryption
- Encryption key must be 32-byte base64 string
- Store `CREDENTIAL_VAULT_KEY` in environment variables
- **Never commit** encryption keys to git
- Rotate keys periodically and re-encrypt credentials

### MCP Filesystem Security

When using MCP Filesystem server:

1. **Always specify** `allowed_directories` whitelist
2. **Never allow** `/`, `/etc`, `/var`, system directories
3. **Validate paths** to prevent traversal attacks
4. Example safe config: `["/app/data", "/tmp/uploads"]`

### API Rate Limits

All external services have rate limits:

- **Firecrawl**: Check plan limits
- **Apify**: Depends on subscription tier
- **Hugging Face**: Free tier has limits, Pro tier has higher quotas

The retry handler (3 attempts, exponential backoff) helps handle transient failures but won't bypass rate limits.

---

## Troubleshooting

### "CREDENTIAL_VAULT_KEY must be set"

**Solution:** Generate encryption key and add to `.env`:

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" >> .env
```

Then prefix with `CREDENTIAL_VAULT_KEY=`.

### "credentials table does not exist"

**Solution:** Run the Supabase migration:

1. Open Supabase dashboard
2. SQL Editor → Run `backend/migrations/002_create_credentials_table.sql`

### "Invalid API key" or "401 Unauthorized"

**Solution:** Verify credentials:

1. Check API key format matches service requirements
2. Ensure key has necessary permissions
3. Test key directly with service API (curl/Postman)
4. Verify credential was encrypted correctly (try recreating)

### MCP Server connection failures

**Solution:**

1. Verify server URL/command is correct
2. Check if server requires Node.js/npm (for stdio type)
3. Ensure server dependencies are installed
4. Try running server command manually to test
5. Check server logs for detailed errors

### Hugging Face inference timeouts

**Solution:**

1. Large models may take longer to load (first request)
2. Use smaller models for faster inference (e.g., distilbert vs bert-large)
3. Increase timeout in node config
4. Consider using Hugging Face Pro for faster inference endpoints

---

## Example Workflows

### Web Research Pipeline

```
Input ("https://example.com/article")
  ↓
Firecrawl Scrape (markdown)
  ↓
LLM Agent ("Summarize key points")
  ↓
Output (summary)
```

### Social Media Analysis

```
Input ("@username")
  ↓
Apify Actor (Instagram scraper)
  ↓
Hugging Face Inference (sentiment analysis)
  ↓
Output (sentiment report)
```

### AI Code Assistant

```
Input ("Fix bug in auth.py")
  ↓
MCP Server (Filesystem - read file)
  ↓
LLM Agent (analyze + suggest fix)
  ↓
MCP Server (Filesystem - write file)
  ↓
Output (changes made)
```

### Knowledge Base Building

```
Input (website URL)
  ↓
Firecrawl Scrape
  ↓
Hugging Face Inference (embeddings)
  ↓
Knowledge Base (store vectors)
  ↓
Output (confirmation)
```

---

## Next Steps

- **Phase 2**: Specialized nodes (Firecrawl Research, pre-configured Apify actors, MCP GitHub/Filesystem, HF Dataset/Spaces)
- **Real API Integration**: Replace execution engine stubs with actual API calls
- **E2E Testing**: Validate full flows with real credentials
- **Performance Optimization**: Add caching, batch processing
- **Error Handling**: Enhanced retry logic, fallback strategies

---

## Resources

- [Firecrawl Documentation](https://docs.firecrawl.dev/)
- [Apify API Reference](https://docs.apify.com/api/v2)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/)
- [CoconutFlow Main Documentation](../README.md)
