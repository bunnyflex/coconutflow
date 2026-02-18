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
