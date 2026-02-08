# Save/Load Flow Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace in-memory flow storage with Supabase persistence so users can save and reload their flows across sessions.

**Architecture:** Swap the `_flows` dict in `backend/app/api/flows.py` with Supabase table queries. Frontend already has Save/Open buttons + FlowManager UI - no frontend changes needed!

**Tech Stack:** Supabase (PostgreSQL), supabase-py client, existing CRUD API

---

## Task 1: Create Supabase Flows Table

**Files:**
- Create: `backend/migrations/001_create_flows_table.sql`
- Read: `backend/.env` (verify SUPABASE_URL and SUPABASE_ANON_KEY)

**Step 1: Write the failing test (manual verification plan)**

Manual test to verify success:
1. Open Supabase dashboard (https://supabase.com/dashboard)
2. Navigate to Table Editor
3. Verify `flows` table exists with correct schema
4. Try inserting a test row manually

**Step 2: Create the SQL migration file**

Create `backend/migrations/001_create_flows_table.sql`:

```sql
-- Create flows table for persisting user flow definitions
CREATE TABLE IF NOT EXISTS flows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on created_at for listing flows by recency
CREATE INDEX IF NOT EXISTS idx_flows_created_at ON flows(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 3: Run the migration manually**

Manual steps (Supabase dashboard):
1. Go to SQL Editor in Supabase dashboard
2. Create new query
3. Copy-paste the SQL from `001_create_flows_table.sql`
4. Click "Run"
5. Verify in Table Editor that `flows` table appears

Expected output:
- `flows` table visible in Table Editor
- Columns: id, name, description, nodes, edges, metadata, created_at, updated_at
- Indexes: idx_flows_created_at
- Trigger: update_flows_updated_at

**Step 4: Document the migration**

Create `backend/migrations/README.md`:

```markdown
# Database Migrations

## How to Run Migrations

These are manual SQL migrations to run in the Supabase SQL Editor:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Create new query
5. Copy-paste the SQL from the migration file
6. Click "Run"

## Migration History

- `001_create_flows_table.sql` - Creates flows table with JSONB columns for nodes/edges
```

**Step 5: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add backend/migrations/ && git commit -m "feat: add Supabase flows table migration"
```

---

## Task 2: Replace In-Memory Storage with Supabase

**Files:**
- Modify: `backend/app/api/flows.py`
- Read: `backend/app/services/supabase_client.py` (already exists)

**Step 1: Write failing unit test**

Create `backend/tests/test_flows_api.py`:

```python
"""
Test suite for flows CRUD API with Supabase persistence.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_flow():
    """Test creating a new flow"""
    flow = {
        "id": "test-flow-1",
        "name": "Test Flow",
        "description": "A test flow",
        "nodes": [
            {
                "id": "node-1",
                "type": "input",
                "position": {"x": 0, "y": 0},
                "config": {"input_output": {"label": "Test", "data_type": "text"}}
            }
        ],
        "edges": [],
        "metadata": {}
    }

    response = client.post("/api/flows/", json=flow)
    assert response.status_code == 201
    assert response.json()["id"] == "test-flow-1"
    assert response.json()["name"] == "Test Flow"

def test_list_flows():
    """Test listing all flows"""
    response = client.get("/api/flows/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_flow():
    """Test getting a specific flow"""
    # First create a flow
    flow = {
        "id": "test-flow-2",
        "name": "Test Flow 2",
        "nodes": [],
        "edges": [],
        "metadata": {}
    }
    client.post("/api/flows/", json=flow)

    # Then fetch it
    response = client.get("/api/flows/test-flow-2")
    assert response.status_code == 200
    assert response.json()["id"] == "test-flow-2"

def test_update_flow():
    """Test updating an existing flow"""
    # Create
    flow = {
        "id": "test-flow-3",
        "name": "Original Name",
        "nodes": [],
        "edges": [],
        "metadata": {}
    }
    client.post("/api/flows/", json=flow)

    # Update
    flow["name"] = "Updated Name"
    response = client.put("/api/flows/test-flow-3", json=flow)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"

def test_delete_flow():
    """Test deleting a flow"""
    # Create
    flow = {
        "id": "test-flow-4",
        "name": "To Delete",
        "nodes": [],
        "edges": [],
        "metadata": {}
    }
    client.post("/api/flows/", json=flow)

    # Delete
    response = client.delete("/api/flows/test-flow-4")
    assert response.status_code == 204

    # Verify deleted
    response = client.get("/api/flows/test-flow-4")
    assert response.status_code == 404
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/backend && SUPABASE_URL=$(grep SUPABASE_URL .env | cut -d= -f2) SUPABASE_ANON_KEY=$(grep SUPABASE_ANON_KEY .env | cut -d= -f2) pytest tests/test_flows_api.py -v
```

Expected: Tests will pass with in-memory storage but we need to verify they work with Supabase

**Step 3: Implement Supabase persistence**

In `backend/app/api/flows.py`, replace the entire file:

```python
"""
API router for flow CRUD operations.
Endpoints: /api/flows
"""

from __future__ import annotations

from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models.flow import FlowDefinition
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/flows", tags=["flows"])


def _flow_from_db_row(row: dict[str, Any]) -> FlowDefinition:
    """Convert Supabase row to FlowDefinition"""
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
        }
    )


@router.get("/", response_model=list[FlowDefinition])
async def list_flows() -> list[FlowDefinition]:
    """List all saved flows."""
    supabase = get_supabase_client()

    response = supabase.table("flows").select("*").order("created_at", desc=True).execute()

    return [_flow_from_db_row(row) for row in response.data]


@router.get("/{flow_id}", response_model=FlowDefinition)
async def get_flow(flow_id: str) -> FlowDefinition:
    """Get a single flow by ID."""
    supabase = get_supabase_client()

    response = supabase.table("flows").select("*").eq("id", flow_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Flow not found")

    return _flow_from_db_row(response.data[0])


@router.post("/", response_model=FlowDefinition, status_code=201)
async def create_flow(flow: FlowDefinition) -> FlowDefinition:
    """Create a new flow."""
    supabase = get_supabase_client()

    # Check if flow already exists
    existing = supabase.table("flows").select("id").eq("id", flow.id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Flow with this ID already exists")

    # Insert new flow
    row = {
        "id": flow.id,
        "name": flow.name,
        "description": flow.description or "",
        "nodes": [node.model_dump() for node in flow.nodes],
        "edges": [edge.model_dump() for edge in flow.edges],
        "metadata": flow.metadata,
    }

    response = supabase.table("flows").insert(row).execute()

    return _flow_from_db_row(response.data[0])


@router.put("/{flow_id}", response_model=FlowDefinition)
async def update_flow(flow_id: str, flow: FlowDefinition) -> FlowDefinition:
    """Update an existing flow."""
    supabase = get_supabase_client()

    # Check if flow exists
    existing = supabase.table("flows").select("id").eq("id", flow_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Flow not found")

    # Update flow
    flow.id = flow_id  # Ensure ID matches URL
    row = {
        "name": flow.name,
        "description": flow.description or "",
        "nodes": [node.model_dump() for node in flow.nodes],
        "edges": [edge.model_dump() for edge in flow.edges],
        "metadata": flow.metadata,
    }

    response = supabase.table("flows").update(row).eq("id", flow_id).execute()

    return _flow_from_db_row(response.data[0])


@router.delete("/{flow_id}", status_code=204)
async def delete_flow(flow_id: str) -> None:
    """Delete a flow."""
    supabase = get_supabase_client()

    # Check if flow exists
    existing = supabase.table("flows").select("id").eq("id", flow_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Flow not found")

    # Delete flow
    supabase.table("flows").delete().eq("id", flow_id).execute()


@router.post("/{flow_id}/compile")
async def compile_flow(flow_id: str) -> dict[str, Any]:
    """Compile a flow into an executable representation."""
    flow = await get_flow(flow_id)

    from app.compiler.flow_compiler import FlowCompiler

    compiler = FlowCompiler()
    try:
        result = compiler.compile(flow)
        return {"status": "compiled", "execution_graph": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/backend && SUPABASE_URL=$(grep SUPABASE_URL .env | cut -d= -f2) SUPABASE_ANON_KEY=$(grep SUPABASE_ANON_KEY .env | cut -d= -f2) pytest tests/test_flows_api.py -v
```

Expected: All tests pass (CREATE, READ, UPDATE, DELETE)

**Step 5: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add backend/app/api/flows.py backend/tests/test_flows_api.py && git commit -m "feat: replace in-memory flow storage with Supabase persistence"
```

---

## Task 3: End-to-End Manual Verification

**Files:**
- None (manual testing only)

**Step 1: Start both servers**

Terminal 1 (Backend):
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m uvicorn app.main:app --reload --port 8000
```

Terminal 2 (Frontend):
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" npx vite --port 5173
```

**Step 2: Test the Save workflow**

1. Open http://localhost:5173
2. Add 2-3 nodes to canvas (e.g., Input → Agent → Output)
3. Connect them with edges
4. Click **Save** button in toolbar
5. Verify:
   - Save button shows spinner briefly
   - Save button shows green checkmark
   - Toast notification: "Flow saved"

**Step 3: Verify in Supabase dashboard**

1. Go to Supabase dashboard → Table Editor → flows
2. Verify a new row appears with:
   - Auto-generated ID
   - name: "Untitled Flow" (default)
   - nodes: JSON array with your nodes
   - edges: JSON array with your edges
   - created_at and updated_at timestamps

**Step 4: Test the Load workflow**

1. Click **Clear** button (trash icon) to clear canvas
2. Verify canvas is empty
3. Click **Open** button (folder icon)
4. Verify FlowManager modal appears
5. Verify your saved flow is listed
6. Click **Load** button
7. Verify:
   - Modal closes
   - Canvas reloads with your nodes and edges
   - Connections are preserved

**Step 5: Test the Update workflow**

1. With a loaded flow, modify it (add a new node)
2. Click **Save** button again
3. Verify save succeeds
4. Check Supabase dashboard: updated_at timestamp should change

**Step 6: Test the Delete workflow**

1. Click **Open** button
2. Click **Delete** button next to a flow
3. Verify flow disappears from list
4. Check Supabase dashboard: row should be deleted

**Step 7: Test persistence across browser refresh**

1. Create a flow and save it
2. Refresh the browser (Cmd+R)
3. Canvas will be empty (expected - no auto-load yet)
4. Click **Open** button
5. Verify saved flow is still listed
6. Load it and verify it works

**Expected Results:**
- ✅ Save creates a row in Supabase
- ✅ Open lists all flows from Supabase
- ✅ Load restores nodes and edges correctly
- ✅ Update modifies existing row
- ✅ Delete removes row
- ✅ Persistence survives browser refresh

**Step 8: Document findings**

If all tests pass, no code changes needed. If issues found, fix and re-test.

---

## Task 4: Add Flow Naming UI (Optional Enhancement)

**Files:**
- Modify: `frontend/src/components/panels/FlowManager.tsx`
- Modify: `frontend/src/store/flowStore.ts`

**Context:** Currently flows save with default name "Untitled Flow". Add a simple rename feature.

**Step 1: Add flowName state to Toolbar**

In `frontend/src/components/canvas/Toolbar.tsx`:

Already exists! (line 50: `flowName`)

**Step 2: Add inline rename to FlowManager**

In `frontend/src/components/panels/FlowManager.tsx`, modify the flow name display (line 103):

```tsx
<input
  type="text"
  value={flow.name}
  onChange={(e) => {
    // Update flow name optimistically
    setFlows(prev => prev.map(f =>
      f.id === flow.id ? {...f, name: e.target.value} : f
    ));
  }}
  onBlur={async (e) => {
    // Save to backend on blur
    try {
      const updated = await flowApi.get(flow.id);
      updated.name = e.target.value;
      await flowApi.update(flow.id, updated);
    } catch (err) {
      console.error('Failed to rename flow:', err);
    }
  }}
  className="truncate text-sm font-medium text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
/>
```

**Step 3: Manual test**

1. Open FlowManager
2. Click on a flow name
3. Edit the name
4. Click outside (blur)
5. Verify name updates in Supabase

**Step 4: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/panels/FlowManager.tsx && git commit -m "feat: add inline flow renaming in FlowManager"
```

---

## Success Criteria

- ✅ `flows` table exists in Supabase with correct schema
- ✅ Save button creates row in Supabase
- ✅ Open button lists flows from Supabase
- ✅ Load button restores flow from Supabase
- ✅ Update button modifies existing row
- ✅ Delete button removes row
- ✅ Flows persist across browser refresh
- ✅ All unit tests pass
- ✅ Manual E2E verification passes
- ✅ (Optional) Inline rename works

---

## Notes

**Why no auto-load on page load?**
- We could add `loadLatestFlow()` on app mount
- But users might want a blank canvas
- Better UX: Show "Load last flow?" toast on mount

**Future enhancements:**
- Auto-save every 30 seconds (debounced)
- Flow templates gallery
- Duplicate flow action
- Export/import as JSON
