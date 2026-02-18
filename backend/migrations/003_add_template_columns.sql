-- Run this in: Supabase Dashboard → SQL Editor
-- Project: CoconutFlow
-- Purpose: Add template support columns to flows table

ALTER TABLE flows ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE flows ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE flows ADD COLUMN IF NOT EXISTS category TEXT;

-- Indexes for template queries
CREATE INDEX IF NOT EXISTS idx_flows_is_featured ON flows(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_flows_is_public ON flows(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_flows_category ON flows(category);
