# Python Export Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a workflow-to-Python exporter that converts visual workflows into standalone, executable Python scripts using the Agno SDK.

**Architecture:** Add backend API endpoint that reads workflow JSON, generates Python code using a template-based code generator, and returns a downloadable `.py` file. Frontend adds "Export Python" button to toolbar. Generated scripts are fully executable with proper async handling, error management, and CLI support.

**Tech Stack:** FastAPI (backend), Jinja2 (templating), Python AST generation, Agno SDK

---

## Prerequisites

**Completed:**
- ✅ 7 workflow JSON definitions in `docs/workflows/`
- ✅ Flow persistence API at `/api/flows`
- ✅ All 10 node types implemented with compilers
- ✅ FlowDefinition Pydantic models

**Required:**
- Backend server running on port 8000
- Understanding of Agno SDK Agent/Tool structure
- Python code generation strategy

---

## Task 1: Create Python Code Generator Module

**Files:**
- Create: `backend/app/services/python_exporter.py`
- Create: `backend/app/templates/workflow_template.py.jinja2`

**Step 1: Write failing test for code generation**

```python
# backend/tests/test_python_exporter.py
import pytest
from app.services.python_exporter import PythonExporter
from app.models.flow import FlowDefinition, NodeDefinition

def test_generate_simple_workflow():
    """Test generating Python code from simple workflow."""
    flow = FlowDefinition(
        id="test-flow",
        name="Simple Test",
        description="Input -> Agent -> Output",
        nodes=[
            NodeDefinition(
                id="node_1",
                type="input",
                position={"x": 0, "y": 0},
                data={"nodeType": "input", "label": "Input", "config": {"input_output": {"value": "test"}}}
            ),
            NodeDefinition(
                id="node_2",
                type="llm_agent",
                position={"x": 200, "y": 0},
                data={"nodeType": "llm_agent", "label": "Agent", "config": {"agent": {"model_provider": "openai", "model_id": "gpt-4o"}}}
            )
        ],
        edges=[{"source": "node_1", "target": "node_2"}],
        metadata={}
    )

    exporter = PythonExporter()
    code = exporter.generate(flow)

    assert "async def run_workflow" in code
    assert "from agno import Agent" in code
    assert "gpt-4o" in code
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_python_exporter.py -v`
Expected: FAIL - PythonExporter doesn't exist yet

**Step 3: Create PythonExporter service**

```python
# backend/app/services/python_exporter.py
"""
Python code generator for CoconutFlow workflows.

Converts FlowDefinition JSON into executable Python scripts using Agno SDK.
"""
from __future__ import annotations
from typing import Dict, List, Set
from datetime import datetime

from app.models.flow import FlowDefinition, NodeDefinition


class PythonExporter:
    """Generates Python code from workflow definitions."""

    def __init__(self):
        self.imports: Set[str] = set()
        self.node_code: List[str] = []

    def generate(self, flow: FlowDefinition) -> str:
        """
        Generate Python code from workflow.

        Args:
            flow: FlowDefinition to convert

        Returns:
            Python code as string
        """
        self.imports.clear()
        self.node_code.clear()

        # Always import base requirements
        self.imports.add("import asyncio")
        self.imports.add("from agno import Agent")

        # Topological sort (same as compiler)
        sorted_nodes = self._topological_sort(flow)

        # Generate code for each node
        for node in sorted_nodes:
            self._generate_node_code(node)

        # Build final script
        return self._build_script(flow)

    def _topological_sort(self, flow: FlowDefinition) -> List[NodeDefinition]:
        """Sort nodes in execution order."""
        # Build adjacency map
        graph = {node.id: [] for node in flow.nodes}
        in_degree = {node.id: 0 for node in flow.nodes}

        for edge in flow.edges:
            graph[edge["source"]].append(edge["target"])
            in_degree[edge["target"]] += 1

        # Kahn's algorithm
        queue = [nid for nid in in_degree if in_degree[nid] == 0]
        sorted_ids = []

        while queue:
            current = queue.pop(0)
            sorted_ids.append(current)

            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Map back to nodes
        node_map = {n.id: n for n in flow.nodes}
        return [node_map[nid] for nid in sorted_ids]

    def _generate_node_code(self, node: NodeDefinition):
        """Generate code for a single node."""
        node_type = node.data["nodeType"]

        handlers = {
            "input": self._gen_input,
            "llm_agent": self._gen_agent,
            "web_search": self._gen_web_search,
            "knowledge_base": self._gen_knowledge_base,
            "conditional": self._gen_conditional,
            "output": self._gen_output,
            "firecrawl_scrape": self._gen_firecrawl,
            "apify_actor": self._gen_apify,
            "mcp_server": self._gen_mcp,
            "huggingface_inference": self._gen_huggingface,
        }

        handler = handlers.get(node_type)
        if handler:
            handler(node)

    def _gen_input(self, node: NodeDefinition):
        """Generate input node code."""
        self.node_code.append(f"    # {node.data['label']}")
        self.node_code.append(f"    print(f'Input: {{user_input}}')")
        self.node_code.append(f"    {self._var_name(node.id)} = user_input")
        self.node_code.append("")

    def _gen_agent(self, node: NodeDefinition):
        """Generate LLM agent code."""
        self.imports.add("from agno import Agent")

        config = node.data["config"]["agent"]
        model = f"{config['model_provider']}:{config['model_id']}"
        instructions = config.get("instructions", ["You are a helpful assistant."])

        # Handle instructions as list or string
        if isinstance(instructions, list):
            instr_str = "\\n".join(instructions)
        else:
            instr_str = instructions

        self.node_code.append(f"    # {node.data['label']}")
        self.node_code.append(f"    agent_{self._var_name(node.id)} = Agent(")
        self.node_code.append(f"        name='{node.data['label']}',")
        self.node_code.append(f"        model='{model}',")
        self.node_code.append(f"        instructions='{instr_str}',")
        self.node_code.append(f"    )")

        # Get upstream data
        upstream_var = self._get_upstream_var(node.id)
        self.node_code.append(f"    response_{self._var_name(node.id)} = await agent_{self._var_name(node.id)}.run(str({upstream_var}))")
        self.node_code.append(f"    {self._var_name(node.id)} = response_{self._var_name(node.id)}.content")
        self.node_code.append("")

    def _gen_web_search(self, node: NodeDefinition):
        """Generate web search code."""
        self.imports.add("from agno.tools.duckduckgo import DuckDuckGoTools")

        self.node_code.append(f"    # {node.data['label']}")
        self.node_code.append(f"    search_tool = DuckDuckGoTools()")

        upstream_var = self._get_upstream_var(node.id)
        self.node_code.append(f"    results = search_tool.search(str({upstream_var}), max_results=5)")
        self.node_code.append(f"    {self._var_name(node.id)} = str(results)")
        self.node_code.append("")

    def _gen_knowledge_base(self, node: NodeDefinition):
        """Generate knowledge base code."""
        self.imports.add("from agno import Knowledge")
        self.imports.add("from agno.vectordb.pgvector import PgVector")

        config = node.data["config"]["knowledge_base"]

        self.node_code.append(f"    # {node.data['label']}")
        self.node_code.append(f"    kb_{self._var_name(node.id)} = Knowledge(")
        self.node_code.append(f"        name='{node.data['label']}',")
        self.node_code.append(f"        vector_db=PgVector()")
        self.node_code.append(f"    )")

        # Add sources
        sources = config.get("sources", [])
        for source in sources:
            self.node_code.append(f"    await kb_{self._var_name(node.id)}.add_content_async(path='{source}')")

        upstream_var = self._get_upstream_var(node.id)
        self.node_code.append(f"    results = kb_{self._var_name(node.id)}.search(str({upstream_var}))")
        self.node_code.append(f"    {self._var_name(node.id)} = str(results)")
        self.node_code.append("")

    def _gen_conditional(self, node: NodeDefinition):
        """Generate conditional code."""
        config = node.data["config"]["conditional"]
        condition = config.get("condition", "true")

        self.node_code.append(f"    # {node.data['label']} - Conditional")
        upstream_var = self._get_upstream_var(node.id)
        self.node_code.append(f"    # TODO: Evaluate condition: {condition}")
        self.node_code.append(f"    condition_result = True  # Placeholder")
        self.node_code.append(f"    {self._var_name(node.id)} = {upstream_var} if condition_result else None")
        self.node_code.append("")

    def _gen_output(self, node: NodeDefinition):
        """Generate output code."""
        upstream_var = self._get_upstream_var(node.id)

        self.node_code.append(f"    # {node.data['label']}")
        self.node_code.append(f"    print(f'Output: {{{upstream_var}}}')")
        self.node_code.append(f"    return {upstream_var}")
        self.node_code.append("")

    def _gen_firecrawl(self, node: NodeDefinition):
        """Generate Firecrawl scrape code."""
        self.node_code.append(f"    # {node.data['label']} - Firecrawl Scrape")
        self.node_code.append(f"    # TODO: Implement Firecrawl integration")
        self.node_code.append(f"    {self._var_name(node.id)} = 'Firecrawl result placeholder'")
        self.node_code.append("")

    def _gen_apify(self, node: NodeDefinition):
        """Generate Apify actor code."""
        self.node_code.append(f"    # {node.data['label']} - Apify Actor")
        self.node_code.append(f"    # TODO: Implement Apify integration")
        self.node_code.append(f"    {self._var_name(node.id)} = 'Apify result placeholder'")
        self.node_code.append("")

    def _gen_mcp(self, node: NodeDefinition):
        """Generate MCP server code."""
        self.node_code.append(f"    # {node.data['label']} - MCP Server")
        self.node_code.append(f"    # TODO: Implement MCP integration")
        self.node_code.append(f"    {self._var_name(node.id)} = 'MCP result placeholder'")
        self.node_code.append("")

    def _gen_huggingface(self, node: NodeDefinition):
        """Generate Hugging Face code."""
        self.node_code.append(f"    # {node.data['label']} - Hugging Face")
        self.node_code.append(f"    # TODO: Implement Hugging Face integration")
        self.node_code.append(f"    {self._var_name(node.id)} = 'HuggingFace result placeholder'")
        self.node_code.append("")

    def _var_name(self, node_id: str) -> str:
        """Convert node ID to valid Python variable name."""
        return node_id.replace("-", "_").replace(".", "_")

    def _get_upstream_var(self, node_id: str) -> str:
        """Get variable name for upstream node (placeholder)."""
        # In real implementation, look up actual upstream node
        return "user_input"

    def _build_script(self, flow: FlowDefinition) -> str:
        """Build final Python script."""
        lines = []

        # Header
        lines.append("#!/usr/bin/env python3")
        lines.append('"""')
        lines.append(f"{flow.name}")
        lines.append("")
        lines.append(f"Description: {flow.description or 'No description'}")
        lines.append(f"Generated from CoconutFlow on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        lines.append('"""')
        lines.append("")

        # Imports
        for imp in sorted(self.imports):
            lines.append(imp)
        lines.append("")
        lines.append("")

        # Main function
        lines.append("async def run_workflow(user_input: str):")
        lines.append('    """Execute the workflow with given input."""')
        lines.extend(self.node_code)
        lines.append("")
        lines.append("")

        # CLI entrypoint
        lines.append('if __name__ == "__main__":')
        lines.append("    import sys")
        lines.append("    ")
        lines.append("    if len(sys.argv) < 2:")
        lines.append('        print("Usage: python workflow.py <input_text>")')
        lines.append("        sys.exit(1)")
        lines.append("    ")
        lines.append("    input_text = sys.argv[1]")
        lines.append("    result = asyncio.run(run_workflow(input_text))")
        lines.append('    print(f"\\nFinal Result: {result}")')

        return "\n".join(lines)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_python_exporter.py -v`
Expected: PASS - Code generated successfully

**Step 5: Commit**

```bash
git add backend/app/services/python_exporter.py backend/tests/test_python_exporter.py
git commit -m "feat: add Python code generator for workflows"
```

---

## Task 2: Create Export API Endpoint

**Files:**
- Create: `backend/app/api/export.py`
- Modify: `backend/app/main.py`

**Step 1: Write failing test for export endpoint**

```python
# backend/tests/test_export_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_export_python_endpoint(test_flow_id):
    """Test Python export endpoint."""
    response = client.get(f"/api/flows/{test_flow_id}/export/python")

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/x-python"
    assert "async def run_workflow" in response.text
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_export_api.py -v`
Expected: FAIL - Endpoint doesn't exist

**Step 3: Create export router**

```python
# backend/app/api/export.py
"""
Export API endpoints.

Converts workflows to various formats (Python, JavaScript, etc.).
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.services.supabase_client import supabase_client
from app.services.python_exporter import PythonExporter
from app.models.flow import FlowDefinition

router = APIRouter(prefix="/api/flows", tags=["export"])


@router.get("/{flow_id}/export/python", response_class=PlainTextResponse)
async def export_python(flow_id: str):
    """
    Export workflow as Python script.

    Args:
        flow_id: Flow ID to export

    Returns:
        Python code as plain text

    Raises:
        404: Flow not found
        500: Export generation failed
    """
    # Fetch flow from database
    result = supabase_client.table("flows").select("*").eq("id", flow_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Flow not found")

    flow_data = result.data[0]

    # Parse as FlowDefinition
    try:
        flow = FlowDefinition(
            id=flow_data["id"],
            name=flow_data["name"],
            description=flow_data.get("description"),
            nodes=flow_data["nodes"],
            edges=flow_data["edges"],
            metadata=flow_data.get("metadata", {})
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse flow: {str(e)}")

    # Generate Python code
    try:
        exporter = PythonExporter()
        code = exporter.generate(flow)
        return PlainTextResponse(
            content=code,
            media_type="text/x-python",
            headers={
                "Content-Disposition": f'attachment; filename="{flow.name.replace(" ", "_").lower()}.py"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Python code: {str(e)}")
```

**Step 4: Register router in main.py**

```python
# backend/app/main.py
# Add to imports
from app.api.export import router as export_router

# Add to routers section
app.include_router(export_router)
```

**Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_export_api.py -v`
Expected: PASS

**Step 6: Test manually**

```bash
# Save a flow first, get its ID
curl http://localhost:8000/api/flows

# Export to Python
curl http://localhost:8000/api/flows/{flow_id}/export/python -o workflow.py

# Verify generated code
cat workflow.py
```

**Step 7: Commit**

```bash
git add backend/app/api/export.py backend/app/main.py backend/tests/test_export_api.py
git commit -m "feat: add Python export API endpoint"
```

---

## Task 3: Add Export Button to Frontend Toolbar

**Files:**
- Modify: `frontend/src/components/canvas/Toolbar.tsx`
- Modify: `frontend/src/services/api.ts`

**Step 1: Add export function to API service**

```typescript
// frontend/src/services/api.ts
export const flowApi = {
  // ... existing methods

  async exportPython(flowId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/api/flows/${flowId}/export/python`);
    if (!res.ok) throw new Error('Export failed');
    return await res.text();
  },
};
```

**Step 2: Add export button to Toolbar**

```typescript
// frontend/src/components/canvas/Toolbar.tsx
// Add to imports
import { flowApi } from '../../services/api';

// Add state for export
const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'exported' | 'error'>('idle');

// Add export handler
const handleExportPython = async () => {
  if (!flowId) {
    toast.warning('Save first', 'Please save your flow before exporting');
    return;
  }

  setExportStatus('exporting');

  try {
    const pythonCode = await flowApi.exportPython(flowId);

    // Download as file
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getFlowDefinition().name.replace(/\s+/g, '_').toLowerCase()}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportStatus('exported');
    toast.success('Exported to Python', 'Workflow downloaded as .py file');
    setTimeout(() => setExportStatus('idle'), 2000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    toast.error('Export failed', msg);
    setExportStatus('error');
    setTimeout(() => setExportStatus('idle'), 3000);
  }
};

// Add button to toolbar (after Save button)
<button
  data-testid="export-python-button"
  onClick={handleExportPython}
  disabled={!flowId || exportStatus === 'exporting'}
  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
  title="Export as Python script"
>
  {exportStatus === 'exporting' ? (
    <>
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span>Exporting...</span>
    </>
  ) : exportStatus === 'exported' ? (
    <>
      <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
      <span className="text-green-400">Exported</span>
    </>
  ) : (
    <>
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
      </svg>
      <span>Export</span>
    </>
  )}
</button>
```

**Step 3: Test manually**

1. Open http://localhost:5173
2. Build a simple workflow (Input → Agent → Output)
3. Click Save
4. Click Export button
5. Verify .py file downloads

**Step 4: Commit**

```bash
git add frontend/src/components/canvas/Toolbar.tsx frontend/src/services/api.ts
git commit -m "feat: add Export Python button to toolbar"
```

---

## Task 4: Improve Code Generator with Proper Upstream Tracking

**Files:**
- Modify: `backend/app/services/python_exporter.py`

**Step 1: Add edge tracking to exporter**

Currently `_get_upstream_var()` is a placeholder. Fix it to properly track upstream nodes:

```python
class PythonExporter:
    def __init__(self):
        self.imports: Set[str] = set()
        self.node_code: List[str] = []
        self.edges: Dict[str, List[str]] = {}  # NEW: node_id -> [upstream_ids]

    def generate(self, flow: FlowDefinition) -> str:
        self.imports.clear()
        self.node_code.clear()
        self.edges.clear()

        # Build edge map
        for edge in flow.edges:
            if edge["target"] not in self.edges:
                self.edges[edge["target"]] = []
            self.edges[edge["target"]].append(edge["source"])

        # ... rest of generation

    def _get_upstream_var(self, node_id: str) -> str:
        """Get variable name for upstream node."""
        upstream_nodes = self.edges.get(node_id, [])

        if len(upstream_nodes) == 0:
            return "user_input"  # No upstream, use input
        elif len(upstream_nodes) == 1:
            return self._var_name(upstream_nodes[0])
        else:
            # Multiple upstream nodes - combine outputs
            vars = [self._var_name(nid) for nid in upstream_nodes]
            return f"{{' '.join([str({vars[0]}), str({vars[1]}), ...])}}"
```

**Step 2: Test with complex workflow**

Use one of the 7 workflow JSONs to verify proper upstream tracking:

```bash
# Export competitive intelligence workflow
curl http://localhost:8000/api/flows/{competitive_intelligence_id}/export/python -o competitive_intelligence.py

# Verify upstream vars are correct
cat competitive_intelligence.py
```

**Step 3: Commit**

```bash
git add backend/app/services/python_exporter.py
git commit -m "feat: improve upstream node tracking in Python exporter"
```

---

## Task 5: Add Support for External Integration Nodes

**Files:**
- Modify: `backend/app/services/python_exporter.py`

**Step 1: Implement Firecrawl export**

```python
def _gen_firecrawl(self, node: NodeDefinition):
    """Generate Firecrawl scrape code."""
    self.imports.add("import requests")
    self.imports.add("import os")

    config = node.data["config"]["firecrawl_scrape"]
    url = config.get("url", "")
    formats = config.get("formats", ["markdown"])

    self.node_code.append(f"    # {node.data['label']} - Firecrawl Scrape")
    upstream_var = self._get_upstream_var(node.id)
    self.node_code.append(f"    firecrawl_api_key = os.getenv('FIRECRAWL_API_KEY')")
    self.node_code.append(f"    firecrawl_response = requests.post(")
    self.node_code.append(f"        'https://api.firecrawl.dev/v1/scrape',")
    self.node_code.append(f"        headers={{'Authorization': f'Bearer {{firecrawl_api_key}}'}},")
    self.node_code.append(f"        json={{'url': '{url}' if '{url}' else str({upstream_var}), 'formats': {formats}}}")
    self.node_code.append(f"    )")
    self.node_code.append(f"    {self._var_name(node.id)} = firecrawl_response.json()['markdown']")
    self.node_code.append("")
```

**Step 2: Implement Apify export**

```python
def _gen_apify(self, node: NodeDefinition):
    """Generate Apify actor code."""
    self.imports.add("import requests")
    self.imports.add("import os")

    config = node.data["config"]["apify_actor"]
    actor_id = config.get("actor_id", "")

    self.node_code.append(f"    # {node.data['label']} - Apify Actor")
    upstream_var = self._get_upstream_var(node.id)
    self.node_code.append(f"    apify_api_key = os.getenv('APIFY_API_KEY')")
    self.node_code.append(f"    apify_response = requests.post(")
    self.node_code.append(f"        f'https://api.apify.com/v2/acts/{actor_id}/runs?token={{apify_api_key}}',")
    self.node_code.append(f"        json={{'input': str({upstream_var})}}")
    self.node_code.append(f"    )")
    self.node_code.append(f"    {self._var_name(node.id)} = apify_response.json()")
    self.node_code.append("")
```

**Step 3: Implement Hugging Face export**

```python
def _gen_huggingface(self, node: NodeDefinition):
    """Generate Hugging Face code."""
    self.imports.add("import requests")
    self.imports.add("import os")

    config = node.data["config"]["huggingface_inference"]
    model_id = config.get("model_id", "")
    task = config.get("task", "text-generation")

    self.node_code.append(f"    # {node.data['label']} - Hugging Face")
    upstream_var = self._get_upstream_var(node.id)
    self.node_code.append(f"    hf_api_key = os.getenv('HUGGINGFACE_API_KEY')")
    self.node_code.append(f"    hf_response = requests.post(")
    self.node_code.append(f"        f'https://api-inference.huggingface.co/models/{model_id}',")
    self.node_code.append(f"        headers={{'Authorization': f'Bearer {{hf_api_key}}'}},")
    self.node_code.append(f"        json={{'inputs': str({upstream_var})}}")
    self.node_code.append(f"    )")
    self.node_code.append(f"    {self._var_name(node.id)} = hf_response.json()")
    self.node_code.append("")
```

**Step 4: Test with external integration workflows**

```bash
# Export translation pipeline (uses Hugging Face)
curl http://localhost:8000/api/flows/{translation_pipeline_id}/export/python -o translation.py

# Verify HuggingFace API call is generated
cat translation.py
```

**Step 5: Commit**

```bash
git add backend/app/services/python_exporter.py
git commit -m "feat: add external integration support to Python exporter"
```

---

## Task 6: Add Documentation and Examples

**Files:**
- Create: `docs/python-export-guide.md`
- Modify: `README.md`

**Step 1: Create export guide**

```markdown
# docs/python-export-guide.md
# Python Export Guide

## Overview

CoconutFlow can export visual workflows as standalone Python scripts using the Agno SDK.

## How to Export

### Via UI
1. Build your workflow on the canvas
2. Click "Save" to persist the flow
3. Click "Export" button in toolbar
4. Python script downloads automatically

### Via API
```bash
curl http://localhost:8000/api/flows/{flow_id}/export/python -o workflow.py
```

## Generated Code Structure

```python
#!/usr/bin/env python3
"""
Workflow Name
Generated from CoconutFlow
"""
import asyncio
from agno import Agent

async def run_workflow(user_input: str):
    """Execute the workflow."""
    # Node 1: Input
    print(f'Input: {user_input}')

    # Node 2: LLM Agent
    agent = Agent(
        name='Assistant',
        model='openai:gpt-4o',
        instructions='...'
    )
    response = await agent.run(user_input)

    # Node 3: Output
    return response.content

if __name__ == "__main__":
    import sys
    result = asyncio.run(run_workflow(sys.argv[1]))
    print(f"Result: {result}")
```

## Running Exported Scripts

### Prerequisites
```bash
pip install agno
export OPENAI_API_KEY=sk-...
export FIRECRAWL_API_KEY=fc-...  # If using Firecrawl
export APIFY_API_KEY=apify_...    # If using Apify
```

### Execute
```bash
python workflow.py "Your input text here"
```

## Supported Node Types

| Node Type | Status | Requirements |
|-----------|--------|--------------|
| Input | ✅ Full | None |
| Output | ✅ Full | None |
| LLM Agent | ✅ Full | OPENAI_API_KEY |
| Web Search | ✅ Full | None (DuckDuckGo) |
| Knowledge Base | ✅ Full | Supabase pgvector |
| Conditional | ⚠️ Partial | LLM evaluation TODO |
| Firecrawl Scrape | ✅ Full | FIRECRAWL_API_KEY |
| Apify Actor | ✅ Full | APIFY_API_KEY |
| Hugging Face | ✅ Full | HUGGINGFACE_API_KEY |
| MCP Server | 🚧 TODO | MCP integration |

## Limitations

- **Conditional nodes**: Currently use placeholder logic, need LLM-based evaluation
- **MCP nodes**: Not yet implemented in export
- **Edge cases**: Complex branching may need manual adjustment
- **State management**: No persistent state between runs

## Use Cases

- **CI/CD Integration**: Run workflows in pipelines
- **Batch Processing**: Execute on large datasets
- **Version Control**: Git track workflow logic
- **Customization**: Modify generated code for specific needs
- **Debugging**: Step through workflow execution

## Examples

See `docs/workflows/` for example exported scripts:
- `competitive_intelligence.py` - Web scraping + RAG
- `translation_pipeline.py` - Hugging Face integration
- `social_media_analytics.py` - Conditional branching
```

**Step 2: Update main README**

Add section to root README.md:

```markdown
## Exporting Workflows

Export your visual workflows as standalone Python scripts:

1. **Via UI**: Click "Export" button in toolbar
2. **Via API**: `GET /api/flows/{id}/export/python`

Generated scripts use the Agno SDK and can be executed standalone:

\`\`\`bash
python workflow.py "input text"
\`\`\`

See [Python Export Guide](docs/python-export-guide.md) for details.
```

**Step 3: Commit documentation**

```bash
git add docs/python-export-guide.md README.md
git commit -m "docs: add Python export guide and examples"
```

---

## Task 7: Add Export to One of the Existing Workflows

**Files:**
- Create: `docs/workflows/competitive_intelligence.py` (example)

**Step 1: Export competitive intelligence workflow**

```bash
# Get flow ID for competitive intelligence
FLOW_ID=$(curl -s http://localhost:8000/api/flows | jq -r '.[] | select(.name == "Competitive Intelligence Pipeline") | .id')

# Export to Python
curl http://localhost:8000/api/flows/$FLOW_ID/export/python -o docs/workflows/competitive_intelligence.py
```

**Step 2: Test the exported script**

```bash
cd docs/workflows
python competitive_intelligence.py "OpenAI"
```

Expected: Script executes workflow and prints output

**Step 3: Commit example**

```bash
git add docs/workflows/competitive_intelligence.py
git commit -m "docs: add exported Python example for competitive intelligence workflow"
```

---

## Success Criteria

✅ **Python code generator** - Converts FlowDefinition to executable code
✅ **Export API endpoint** - GET /api/flows/{id}/export/python
✅ **Frontend export button** - Download .py file with one click
✅ **Upstream tracking** - Proper variable passing between nodes
✅ **External integrations** - Firecrawl, Apify, Hugging Face support
✅ **Documentation** - Complete guide with examples
✅ **Example workflow** - At least one exported .py file tested

---

## Notes

- **Code quality**: Generated Python should be PEP 8 compliant and readable
- **Error handling**: Add try/except blocks for API calls
- **Type hints**: Include proper type annotations
- **Async/await**: Proper async handling throughout
- **Environment variables**: Use os.getenv() for API keys
- **CLI support**: argparse for better command-line interface (future)

---

## Future Enhancements

- Export to JavaScript/TypeScript
- Export to Docker container
- Export to REST API spec (OpenAPI)
- Export to n8n/Zapier format
- Interactive Jupyter notebook export
- Add --verbose flag for debugging
- Add --dry-run mode
- Support for secrets management (not env vars)

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-11-python-export-feature.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
