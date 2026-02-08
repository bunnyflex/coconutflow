# Supabase Setup for Knowledge Base RAG

CoconutFlow's Knowledge Base node uses **pgvector** for semantic search and retrieval-augmented generation (RAG). This feature is **optional** but requires a PostgreSQL database with the pgvector extension.

## Why Supabase?

- ✅ **Zero installation** - No local PostgreSQL setup required
- ✅ **Pgvector built-in** - Extension already available
- ✅ **Free tier** - 500MB database, 2GB bandwidth/month
- ✅ **Production-ready** - Same setup for development and deployment

## Setup Steps

### 1. Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in or create a free account
3. Click **"New Project"**
4. Fill in:
   - **Organization**: Choose or create one
   - **Project Name**: `coconutflow` (or your preference)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Select closest to your location
5. Click **"Create new project"** and wait ~2 minutes for provisioning

### 2. Get Credentials

Once your project is ready:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

3. Go to **Project Settings** → **Database**
4. Under **Connection string** → **URI**, you'll see your database URL format

### 3. Configure Environment Variables

Edit `backend/.env`:

```bash
# Supabase API credentials
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# PostgreSQL connection for pgvector
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.your-project-ref.supabase.co:5432/postgres
```

**Replace:**
- `your-project-ref` - from your Supabase URL
- `YOUR_PASSWORD` - the database password you set in step 1
- `your_anon_key_here` - the anon key from step 2

### 4. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs `sqlalchemy` and `psycopg2-binary` needed for database connections.

### 5. Restart Backend Server

If the server is running, restart it to pick up the new environment variables:

```bash
# Stop current server (Ctrl+C if running in foreground)
# Then restart:
uvicorn app.main:app --reload --port 8000
```

### 6. Verify Setup

The backend will automatically:
- Connect to Supabase when a Knowledge Base node is used
- Create the `kb_embeddings` table on first use
- Enable the `vector` extension if not already enabled

## Using Knowledge Base Nodes

1. **Upload Documents**:
   - Use the `/api/upload` endpoint to upload PDF, TXT, MD, or other supported files
   - Files are stored in `backend/uploads/`

2. **Create KB Node**:
   - Drag a "Knowledge Base" node onto the canvas
   - Configure:
     - **Vector DB**: pgvector
     - **Sources**: Path to uploaded files
     - **Chunk Size**: 500-1000 (default: 1000)
     - **Chunk Overlap**: 0-200 (default: 0)

3. **Build Flow**:
   ```
   Input (query) → Knowledge Base → Output
   ```

4. **Execute**:
   - Enter a question related to your documents
   - KB retrieves relevant chunks and generates answer

## File Upload Validation

CoconutFlow validates uploaded files to ensure quality RAG documents:

### ✅ Accepted Files
- **Text-based formats**: PDF, TXT, MD, CSV, JSON, DOCX
- **Must be readable text** (not binary or corrupt)
- **Non-empty** files only
- **Under 50MB** total size

### ⚠️ Warnings
- Files **over 10MB** will trigger a warning (higher embedding costs)
- Large files are still accepted but flagged

### ❌ Rejected Files
- **Binary files** disguised as text (e.g., executables renamed to .txt)
- **Empty files** (0 bytes)
- **Corrupt files** that can't be decoded as text
- **Unsupported formats** (e.g., .exe, .zip, .mp3)

### Example Upload Response

**Success with warning:**
```json
{
  "file_id": "abc123",
  "filename": "large-doc.pdf",
  "size": 11534336,
  "extension": ".pdf",
  "file_type": "text",
  "warnings": ["Large file (11.0MB) - embedding cost may be high"]
}
```

**Rejected (invalid):**
```json
{
  "detail": "Invalid file: File is not readable text"
}
```

### Best Practices
- **PDF**: Best for formatted documents, research papers
- **TXT/MD**: Great for plain text, notes, transcripts
- **Keep under 10MB**: Faster processing, lower costs
- **Quality over quantity**: Upload relevant documents only

## Multi-Source Support

CoconutFlow Knowledge Base supports mixing different source types in a single node:

### Supported Source Types

**Files (upload to backend):**
- `.pdf` - Research papers, documents
- `.txt` - Plain text files
- `.md` - Markdown documentation
- `.csv` - Data tables
- `.json` - Structured data
- `.docx` - Microsoft Word documents
- `.pptx` - PowerPoint presentations

**URLs (direct loading):**
- **Websites** - Any HTTP/HTTPS URL (e.g., `https://python.org/about/`)
  - Uses BeautifulSoup for HTML parsing
  - Extracts main content, ignores navigation/ads

- **YouTube Videos** - Video URLs (e.g., `https://youtube.com/watch?v=abc123`)
  - Extracts video transcripts/captions
  - Requires video to have available captions
  - Supports youtube.com and youtu.be URLs

### How It Works

The backend automatically detects source type:
- **File path** (local or uploaded) → Uses file reader (PDF, TXT, PPTX, etc.)
- **HTTP/HTTPS URL** → Uses website reader (BeautifulSoup)
- **YouTube URL** → Uses YouTube transcript reader

All sources are:
1. Converted to text chunks (configurable size)
2. Embedded using OpenAI
3. Stored in Supabase pgvector
4. Searchable via RAG queries

### Example: Mixed Sources

```json
{
  "sources": [
    "/uploads/company-docs.pdf",
    "https://docs.python.org/3/tutorial/",
    "https://youtube.com/watch?v=tutorial-video-id"
  ]
}
```

All three sources become searchable in a single Knowledge Base!

## Without Supabase (Graceful Degradation)

If `DATABASE_URL` is not set, Knowledge Base nodes will:
- Return a clear error message: `[Knowledge Base unavailable: DATABASE_URL not set]`
- Not crash the flow
- Allow you to develop other features without database setup

All other CoconutFlow features work without Supabase!

## Troubleshooting

### "Connection refused" or "No module named 'psycopg2'"
- Run: `pip install sqlalchemy psycopg2-binary`
- Restart backend server

### "Password authentication failed"
- Double-check the database password in `DATABASE_URL`
- Ensure no spaces or special characters are un-escaped

### "Relation does not exist"
- The `kb_embeddings` table is created automatically on first use
- Manually create via Supabase SQL Editor if needed

### API Key Issues
- Use the **anon/public key**, not the service role key (for client-side code)
- For backend-only operations, service role key is OK

## Cost

Supabase free tier includes:
- **500MB database** (plenty for thousands of documents)
- **2GB bandwidth/month**
- **50,000 monthly active users**

For production, consider upgrading based on usage.

## Security

- ⚠️ **Never commit `.env` to git** - credentials should stay local
- ⚠️ **Rotate keys** if accidentally exposed
- ✅ Use Row Level Security (RLS) in Supabase for production apps

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [Agno Knowledge Base Guide](https://docs.agno.com)
