# Dashboard Phase 2 — Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add a Templates gallery at `/templates` with Featured and Community tabs. Users can browse pre-built flows and clone them into their own workspace with "Use Template".

**Architecture:** Templates are regular flows in the existing `flows` table with two new boolean columns (`is_featured`, `is_public`). A new backend router `/api/templates` serves them. Frontend adds `TemplateCard` and `TemplatesPage`. Community tab is visible but empty until Phase 3 (auth) allows users to publish flows.

**Tech Stack:** Same as Phase 1 — FastAPI, Supabase, React, react-router-dom, Tailwind, lucide-react. No new dependencies.

---

## Database Context

Existing `flows` table columns: `id TEXT`, `name TEXT`, `description TEXT`, `nodes JSONB`, `edges JSONB`, `metadata JSONB`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.

Migration needed: add `is_featured BOOLEAN`, `is_public BOOLEAN`, `category TEXT`.

**Run migration in Supabase SQL editor** (see Task 1).

---

## Task 1: Database migration + backend model updates

**Files:**
- Create: `backend/migrations/003_add_template_columns.sql`
- Modify: `backend/app/models/flow.py`

**Step 1: Create migration file**

Create `backend/migrations/003_add_template_columns.sql`:

```sql
-- Add template support columns to flows table
ALTER TABLE flows ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE flows ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE flows ADD COLUMN IF NOT EXISTS category TEXT;

-- Indexes for template queries
CREATE INDEX IF NOT EXISTS idx_flows_is_featured ON flows(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_flows_is_public ON flows(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_flows_category ON flows(category);
```

**Step 2: Run migration**

The user must run this in Supabase SQL editor. Add a comment to the migration file header:
```sql
-- Run this in: Supabase Dashboard → SQL Editor
-- Project: CoconutFlow
```

**Step 3: Read and update `backend/app/models/flow.py`**

Read the file first. Find `FlowDefinition` class. Add three new fields with defaults:

```python
class FlowDefinition(BaseModel):
    id: str
    name: str = "Untitled Flow"
    description: str = ""
    nodes: list[FlowNode] = Field(default_factory=list)
    edges: list[FlowEdge] = Field(default_factory=list)
    metadata: FlowMetadata = Field(default_factory=FlowMetadata)
    is_featured: bool = False   # NEW
    is_public: bool = False     # NEW
    category: Optional[str] = None  # NEW — e.g. "research", "automation", "content"
```

Note: `Optional` is already imported in the file (check before importing again).

**Step 4: Update `_flow_from_db_row` in `backend/app/api/flows.py`**

Read `flows.py` first. Find `_flow_from_db_row`. Add the new fields:

```python
def _flow_from_db_row(row: dict[str, Any]) -> FlowDefinition:
    return FlowDefinition(
        id=row["id"],
        name=row["name"],
        description=row.get("description", ""),
        nodes=row["nodes"],
        edges=row["edges"],
        metadata={
            **row.get("metadata", {}),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        },
        is_featured=row.get("is_featured", False),   # NEW
        is_public=row.get("is_public", False),         # NEW
        category=row.get("category"),                  # NEW
    )
```

**Step 5: Write tests for model changes**

Create `backend/tests/test_template_models.py`:

```python
"""Tests for template-related model fields."""
from app.models.flow import FlowDefinition


def test_flow_definition_defaults():
    """FlowDefinition defaults is_featured and is_public to False."""
    flow = FlowDefinition(id="test-1", name="Test")
    assert flow.is_featured is False
    assert flow.is_public is False
    assert flow.category is None


def test_flow_definition_template_fields():
    """FlowDefinition accepts template fields."""
    flow = FlowDefinition(
        id="test-2",
        name="Featured Flow",
        is_featured=True,
        is_public=True,
        category="research",
    )
    assert flow.is_featured is True
    assert flow.is_public is True
    assert flow.category == "research"
```

**Step 6: Run tests to verify**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/backend
/Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_template_models.py -v
```

Expected: 2 passed.

**Step 7: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add backend/migrations/003_add_template_columns.sql
git add backend/app/models/flow.py backend/app/api/flows.py
git add backend/tests/test_template_models.py
git commit -m "feat: add is_featured/is_public/category to FlowDefinition + migration"
```

---

## Task 2: Backend templates API

**Files:**
- Create: `backend/app/api/templates.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_templates_api.py`

**Step 1: Create `backend/app/api/templates.py`**

```python
"""
Templates API — read-only endpoints for browsing public/featured flows.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.models.flow import FlowDefinition
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/templates", tags=["templates"])


def _flow_from_db_row(row: dict[str, Any]) -> FlowDefinition:
    """Convert Supabase row to FlowDefinition (same as flows.py helper)."""
    from app.api.flows import _flow_from_db_row as _base
    return _base(row)


@router.get("/featured", response_model=list[FlowDefinition])
async def list_featured_templates() -> list[FlowDefinition]:
    """List all featured templates (is_featured=True)."""
    supabase = get_supabase_client()
    response = (
        supabase.table("flows")
        .select("*")
        .eq("is_featured", True)
        .order("name")
        .execute()
    )
    from app.api.flows import _flow_from_db_row
    return [_flow_from_db_row(row) for row in response.data]


@router.get("/community", response_model=list[FlowDefinition])
async def list_community_templates() -> list[FlowDefinition]:
    """List community-published flows (is_public=True, is_featured=False)."""
    supabase = get_supabase_client()
    response = (
        supabase.table("flows")
        .select("*")
        .eq("is_public", True)
        .eq("is_featured", False)
        .order("created_at", desc=True)
        .execute()
    )
    from app.api.flows import _flow_from_db_row
    return [_flow_from_db_row(row) for row in response.data]


@router.post("/{template_id}/use", response_model=FlowDefinition)
async def use_template(template_id: str) -> FlowDefinition:
    """Clone a template as a new user flow (resets is_featured/is_public flags)."""
    import uuid
    supabase = get_supabase_client()

    # Fetch the template
    result = supabase.table("flows").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")

    from app.api.flows import _flow_from_db_row
    template = _flow_from_db_row(result.data[0])

    # Create a new flow from the template
    from datetime import datetime
    now = datetime.utcnow().isoformat()
    new_flow = {
        "id": str(uuid.uuid4()),
        "name": f"{template.name} (copy)",
        "description": template.description,
        "nodes": [n.model_dump() for n in template.nodes],
        "edges": [e.model_dump() for e in template.edges],
        "metadata": {
            **template.metadata.model_dump(),
            "created_at": now,
            "updated_at": now,
        },
        "is_featured": False,  # Never copy featured status
        "is_public": False,    # Never copy public status
        "category": template.category,
    }

    insert_result = supabase.table("flows").insert(new_flow).execute()
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to create flow from template")

    return _flow_from_db_row(insert_result.data[0])
```

> Note: If `model_dump()` is not available on Pydantic v1 nodes (use `dict()` instead). Check which Pydantic version is installed: read `backend/requirements.txt` first.

**Step 2: Register templates router in `backend/app/main.py`**

Read `main.py` first. Add after the existing router includes:

```python
from app.api.templates import router as templates_router
app.include_router(templates_router)
```

**Step 3: Write tests for templates API**

Create `backend/tests/test_templates_api.py`:

```python
"""Tests for the templates API endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_featured_templates_endpoint_exists():
    """GET /api/templates/featured returns 200 or 500 (not 404)."""
    response = client.get("/api/templates/featured")
    assert response.status_code != 404, "Endpoint must exist"


def test_community_templates_endpoint_exists():
    """GET /api/templates/community returns 200 or 500 (not 404)."""
    response = client.get("/api/templates/community")
    assert response.status_code != 404, "Endpoint must exist"


def test_use_template_endpoint_exists():
    """POST /api/templates/{id}/use returns 404 for unknown ID, not 405."""
    response = client.post("/api/templates/nonexistent-id/use")
    assert response.status_code in (404, 500), f"Expected 404/500, got {response.status_code}"
```

**Step 4: Run tests**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/backend
/Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_templates_api.py tests/test_template_models.py -v
```

Expected: 5 passed.

**Step 5: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add backend/app/api/templates.py backend/app/main.py
git add backend/tests/test_templates_api.py
git commit -m "feat: add templates API (featured, community, use-template endpoints)"
```

---

## Task 3: Frontend types + API client

**Files:**
- Modify: `frontend/src/types/flow.ts`
- Modify: `frontend/src/services/api.ts`

**Step 1: Read both files first**

Read `frontend/src/types/flow.ts` and `frontend/src/services/api.ts`.

**Step 2: Update `FlowDefinition` in `frontend/src/types/flow.ts`**

Add three new optional fields to `FlowDefinition` (to match backend):

```typescript
export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata: FlowMetadata;
  is_featured?: boolean;   // NEW
  is_public?: boolean;     // NEW
  category?: string;       // NEW
}
```

**Step 3: Add template methods to `flowApi` in `frontend/src/services/api.ts`**

Add after the `duplicate` method:

```typescript
/** List featured templates */
listFeatured(): Promise<FlowDefinition[]> {
  return request('/api/templates/featured');
},

/** List community-published templates */
listCommunity(): Promise<FlowDefinition[]> {
  return request('/api/templates/community');
},

/** Clone a template as a new user flow */
useTemplate(templateId: string): Promise<FlowDefinition> {
  return request(`/api/templates/${templateId}/use`, { method: 'POST' });
},
```

**Step 4: Verify TypeScript**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

**Step 5: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/types/flow.ts frontend/src/services/api.ts
git commit -m "feat: add template fields to FlowDefinition type and template API methods"
```

---

## Task 4: TemplateCard component

**Files:**
- Create: `frontend/src/components/dashboard/TemplateCard.tsx`

**Step 1: Read `FlowCard.tsx` to understand the pattern**

Read `frontend/src/components/dashboard/FlowCard.tsx` first.

**Step 2: Create `frontend/src/components/dashboard/TemplateCard.tsx`**

TemplateCard is similar to FlowCard but shows author, category badge, and a "Use Template" CTA instead of a kebab menu.

```tsx
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { FlowDefinition, NodeType } from '../../types/flow';
import { flowApi } from '../../services/api';

const NODE_COLORS: Record<NodeType, string> = {
  input: '#3b82f6',
  output: '#10b981',
  llm_agent: '#6366f1',
  conditional: '#f59e0b',
  web_search: '#06b6d4',
  knowledge_base: '#a855f7',
  firecrawl_scrape: '#f97316',
  apify_actor: '#f43f5e',
  mcp_server: '#14b8a6',
  huggingface_inference: '#8b5cf6',
};

const CATEGORY_COLORS: Record<string, string> = {
  research: 'bg-blue-500/15 text-blue-400',
  automation: 'bg-amber-500/15 text-amber-400',
  content: 'bg-emerald-500/15 text-emerald-400',
  data: 'bg-purple-500/15 text-purple-400',
  default: 'bg-gray-700/60 text-gray-400',
};

interface TemplateCardProps {
  template: FlowDefinition;
  onUsed?: (newFlow: FlowDefinition) => void;
}

export function TemplateCard({ template, onUsed }: TemplateCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const nodeTypes = [...new Set(template.nodes.map((n) => n.type))].slice(0, 5) as NodeType[];
  const extraCount = [...new Set(template.nodes.map((n) => n.type))].length > 5
    ? [...new Set(template.nodes.map((n) => n.type))].length - 5
    : 0;
  const tags: string[] = template.metadata?.tags ?? [];
  const author = template.metadata?.author;
  const categoryColor = CATEGORY_COLORS[template.category ?? ''] ?? CATEGORY_COLORS.default;

  const handleUse = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const newFlow = await flowApi.useTemplate(template.id);
      onUsed?.(newFlow);
      navigate(`/flow/${newFlow.id}`);
    } catch (err) {
      console.error('Failed to use template:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-600 transition-all duration-150">
      {/* Node type dots + category badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {nodeTypes.map((type) => (
            <span
              key={type}
              title={type}
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: NODE_COLORS[type] ?? '#6b7280' }}
            />
          ))}
          {extraCount > 0 && (
            <span className="text-xs text-gray-500">+{extraCount}</span>
          )}
        </div>
        {template.category && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor}`}>
            {template.category}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-medium text-white text-sm leading-snug line-clamp-1">
        {template.name}
      </h3>

      {/* Description */}
      {template.description && (
        <p className="text-xs text-gray-400 line-clamp-2 flex-1">{template.description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: author + Use Template */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-700/40">
        <span className="text-xs text-gray-500">
          {author ? `by ${author}` : `${template.nodes.length} nodes`}
        </span>
        <button
          onClick={handleUse}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          {loading ? 'Cloning...' : 'Use Template'}
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

**Step 4: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/components/dashboard/TemplateCard.tsx
git commit -m "feat: add TemplateCard component with category badge and Use Template action"
```

---

## Task 5: TemplatesPage + remove comingSoon from nav

**Files:**
- Create: `frontend/src/pages/TemplatesPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

**Step 1: Read App.tsx and Sidebar.tsx first**

**Step 2: Create `frontend/src/pages/TemplatesPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { TemplateCard } from '../components/dashboard/TemplateCard';
import { flowApi } from '../services/api';
import type { FlowDefinition } from '../types/flow';

type Tab = 'featured' | 'community';

export function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('featured');
  const [featured, setFeatured] = useState<FlowDefinition[]>([]);
  const [community, setCommunity] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [feat, comm] = await Promise.all([
          flowApi.listFeatured(),
          flowApi.listCommunity(),
        ]);
        setFeatured(feat);
        setCommunity(comm);
      } catch {
        setError('Failed to load templates. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const templates = activeTab === 'featured' ? featured : community;

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Templates</h1>
          <p className="text-gray-400 text-sm mt-1">
            Start from a pre-built flow — click "Use Template" to get your own editable copy
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-700/60">
          {(['featured', 'community'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-white border-indigo-500'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {tab === 'featured' ? 'Featured' : 'Community'}
              {tab === 'community' && community.length === 0 && !loading && (
                <span className="ml-2 text-xs text-gray-600">(coming soon)</span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading templates...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm py-4 px-4 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && templates.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm">
              {activeTab === 'featured'
                ? 'No featured templates yet.'
                : 'No community templates yet. Publish your own flows to share them here!'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

**Step 3: Add `/templates` route to `App.tsx`**

Read `App.tsx` first. Add the route:

```tsx
import { TemplatesPage } from './pages/TemplatesPage';

// Inside <Routes>:
<Route path="/templates" element={<TemplatesPage />} />
```

**Step 4: Remove `comingSoon` from Templates in `Sidebar.tsx`**

Read `Sidebar.tsx`. Find the `NAV_ITEMS` array. Remove `comingSoon: true` from the Templates entry only (keep it on My Flows, Keys, Docs since those aren't built yet):

```typescript
{ to: '/templates', icon: BookOpen, label: 'Templates' },  // Remove comingSoon
```

**Step 5: Verify TypeScript**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

**Step 6: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/pages/TemplatesPage.tsx frontend/src/App.tsx
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: add TemplatesPage with Featured/Community tabs, wire up /templates route"
```

---

## Task 6: Seed 5 featured templates in DB

**Files:**
- Create: `backend/scripts/seed_templates.py`

**Step 1: Read `backend/app/models/flow.py` and `backend/app/services/supabase_client.py`**

Understand how to use the Supabase client directly.

**Step 2: Create `backend/scripts/seed_templates.py`**

This script inserts 5 featured templates into the `flows` table. Run it once after the DB migration.

```python
"""
Seed script: insert featured templates into the flows table.
Run once after migration 003.

Usage:
  cd backend
  python scripts/seed_templates.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import uuid
from datetime import datetime
from app.services.supabase_client import get_supabase_client

NOW = datetime.utcnow().isoformat()

TEMPLATES = [
    {
        "id": str(uuid.uuid4()),
        "name": "Web Research Pipeline",
        "description": "Search the web for a topic and summarise the findings with an LLM agent.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 200}, "config": {"input_output": {"label": "Research Topic"}}},
            {"id": "n2", "type": "web_search", "position": {"x": 350, "y": 200}, "config": {"web_search": {"max_results": 5}}},
            {"id": "n3", "type": "llm_agent", "position": {"x": 600, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o-mini", "instructions": "Summarise the search results into a concise report.", "temperature": 0.3}}},
            {"id": "n4", "type": "output", "position": {"x": 850, "y": 200}, "config": {"input_output": {"label": "Research Summary"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": None, "target_handle": None},
            {"id": "e3", "source": "n3", "target": "n4", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["research", "web"]},
        "is_featured": True,
        "is_public": True,
        "category": "research",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Document Q&A",
        "description": "Upload documents to a knowledge base and ask questions about their content.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 200}, "config": {"input_output": {"label": "Your Question"}}},
            {"id": "n2", "type": "knowledge_base", "position": {"x": 350, "y": 200}, "config": {"knowledge_base": {"collection_name": "documents", "sources": []}}},
            {"id": "n3", "type": "llm_agent", "position": {"x": 600, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o-mini", "instructions": "Answer the question using only the provided context.", "temperature": 0.1}}},
            {"id": "n4", "type": "output", "position": {"x": 850, "y": 200}, "config": {"input_output": {"label": "Answer"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": None, "target_handle": None},
            {"id": "e3", "source": "n3", "target": "n4", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["rag", "documents"]},
        "is_featured": True,
        "is_public": True,
        "category": "research",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Content Writer",
        "description": "Generate a blog post or article on any topic using a two-stage LLM pipeline.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 200}, "config": {"input_output": {"label": "Topic & Tone"}}},
            {"id": "n2", "type": "llm_agent", "position": {"x": 350, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o", "instructions": "Create a detailed outline for an article on this topic.", "temperature": 0.7}}},
            {"id": "n3", "type": "llm_agent", "position": {"x": 600, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o", "instructions": "Write a full article based on this outline. Be engaging and informative.", "temperature": 0.8}}},
            {"id": "n4", "type": "output", "position": {"x": 850, "y": 200}, "config": {"input_output": {"label": "Article"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": None, "target_handle": None},
            {"id": "e3", "source": "n3", "target": "n4", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["content", "writing"]},
        "is_featured": True,
        "is_public": True,
        "category": "content",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Competitor Analysis",
        "description": "Scrape a competitor website with Firecrawl and generate a SWOT analysis.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 200}, "config": {"input_output": {"label": "Competitor URL"}}},
            {"id": "n2", "type": "firecrawl_scrape", "position": {"x": 350, "y": 200}, "config": {"firecrawl_scrape": {"url": "", "formats": ["markdown"]}}},
            {"id": "n3", "type": "llm_agent", "position": {"x": 600, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o", "instructions": "Analyse the scraped content and produce a SWOT analysis with actionable insights.", "temperature": 0.3}}},
            {"id": "n4", "type": "output", "position": {"x": 850, "y": 200}, "config": {"input_output": {"label": "SWOT Analysis"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": None, "target_handle": None},
            {"id": "e3", "source": "n3", "target": "n4", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["competitive", "research", "firecrawl"]},
        "is_featured": True,
        "is_public": True,
        "category": "research",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Smart Router",
        "description": "Route user input to different agents based on topic — a conditional branching example.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 250}, "config": {"input_output": {"label": "User Query"}}},
            {"id": "n2", "type": "conditional", "position": {"x": 350, "y": 250}, "config": {"conditional": {"condition": "Is the input a technical programming question?"}}},
            {"id": "n3", "type": "llm_agent", "position": {"x": 600, "y": 100}, "config": {"agent": {"provider": "openai", "model": "gpt-4o", "instructions": "You are a senior software engineer. Answer technical questions precisely.", "temperature": 0.2}}},
            {"id": "n4", "type": "llm_agent", "position": {"x": 600, "y": 400}, "config": {"agent": {"provider": "openai", "model": "gpt-4o-mini", "instructions": "You are a helpful general assistant. Answer conversationally.", "temperature": 0.7}}},
            {"id": "n5", "type": "output", "position": {"x": 850, "y": 250}, "config": {"input_output": {"label": "Response"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": "true", "target_handle": None},
            {"id": "e3", "source": "n2", "target": "n4", "source_handle": "false", "target_handle": None},
            {"id": "e4", "source": "n3", "target": "n5", "source_handle": None, "target_handle": None},
            {"id": "e5", "source": "n4", "target": "n5", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["conditional", "routing"]},
        "is_featured": True,
        "is_public": True,
        "category": "automation",
    },
]


def seed():
    supabase = get_supabase_client()
    for template in TEMPLATES:
        # Skip if already exists (idempotent)
        existing = supabase.table("flows").select("id").eq("name", template["name"]).eq("is_featured", True).execute()
        if existing.data:
            print(f"  SKIP (exists): {template['name']}")
            continue
        result = supabase.table("flows").insert(template).execute()
        if result.data:
            print(f"  OK: {template['name']}")
        else:
            print(f"  FAIL: {template['name']}")


if __name__ == "__main__":
    print("Seeding featured templates...")
    seed()
    print("Done.")
```

**Step 3: Run the seed script (requires .env with Supabase credentials)**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/backend
/Library/Developer/CommandLineTools/usr/bin/python3 scripts/seed_templates.py
```

Expected output:
```
Seeding featured templates...
  OK: Web Research Pipeline
  OK: Document Q&A
  OK: Content Writer
  OK: Competitor Analysis
  OK: Smart Router
Done.
```

> Note: This requires the DB migration (Task 1) to have been run first in Supabase SQL editor, AND the backend `.env` file to have valid `SUPABASE_URL` and `SUPABASE_ANON_KEY`. If migration hasn't been run, the script will fail because `is_featured` column doesn't exist.

**Step 4: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add backend/scripts/seed_templates.py
git commit -m "feat: add seed script for 5 featured templates"
```

---

## Final Verification

After all tasks complete:

1. **Run DB migration** in Supabase SQL editor (content of `003_add_template_columns.sql`)
2. **Run seed script**: `cd backend && python scripts/seed_templates.py`
3. **Start backend**: `cd backend && python3 -m uvicorn app.main:app --reload --port 8000`
4. **Verify API**: `curl http://localhost:8000/api/templates/featured | python3 -m json.tool`
5. **Start frontend**: `cd frontend && npx vite --port 5173`
6. Open `http://localhost:5173/templates` — should show 5 template cards
7. Click "Use Template" on any card → should redirect to `/flow/:newId` with cloned flow
8. Verify Templates nav item in sidebar is no longer grayed out

**Backend tests:**
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/ -q --tb=short
```

Expected: All existing tests + new template tests pass.
