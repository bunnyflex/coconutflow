-- MANUAL EXECUTION REQUIRED:
-- 1. Log into Supabase dashboard
-- 2. Go to SQL Editor
-- 3. Run this migration
-- 4. Verify table created: SELECT * FROM credentials LIMIT 1;

-- Credential Vault: Secure storage for API keys
-- Migration: 002_create_credentials_table.sql
-- Date: 2026-02-09

CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'system',
    service_name TEXT NOT NULL,  -- "firecrawl", "apify", "huggingface", "mcp"
    credential_name TEXT NOT NULL,  -- User-friendly label
    encrypted_key TEXT NOT NULL,  -- Fernet-encrypted API key
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, service_name, credential_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credentials_user_service
ON credentials(user_id, service_name);

-- Comments
COMMENT ON TABLE credentials IS 'Encrypted API keys for external services';
COMMENT ON COLUMN credentials.encrypted_key IS 'Fernet symmetric encryption using CREDENTIAL_VAULT_KEY env var';
