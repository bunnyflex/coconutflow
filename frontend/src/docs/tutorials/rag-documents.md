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
