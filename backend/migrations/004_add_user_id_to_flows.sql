-- Migration 004: Add user_id column to flows table
-- Allows flows to be scoped to individual Supabase Auth users.
-- user_id is nullable so existing flows (created before auth was added)
-- remain accessible to all users.

ALTER TABLE flows
  ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS flows_user_id_idx ON flows (user_id);
