-- AgnoFlow Supabase Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable pgvector extension for Knowledge Base RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Flows table — stores flow definitions as JSON
CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Untitled Flow',
    description TEXT DEFAULT '',
    flow_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flows_updated_at
    BEFORE UPDATE ON flows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Index for listing flows by recency
CREATE INDEX IF NOT EXISTS idx_flows_updated_at ON flows (updated_at DESC);

-- Storage bucket for Knowledge Base file uploads (PDF, DOCX, TXT, CSV)
-- Run in Supabase dashboard: Storage > New Bucket > "kb-uploads" (public: false)
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('kb-uploads', 'kb-uploads', false)
ON CONFLICT (id) DO NOTHING;
