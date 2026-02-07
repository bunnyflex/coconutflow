# Fix Conditional Node Branching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the conditional node act as a gate (routing upstream data to the correct branch) instead of a transform (replacing data with "true"/"false").

**Architecture:** The execution engine currently runs every node in topological order regardless of branch. We change the conditional node to return the upstream content along with the branch decision, then teach the execution engine to skip nodes that sit on the non-taken branch. Edges from the conditional node use `source_handle` ("true" or "false") to identify which branch a downstream node belongs to. The compiler stores this handle info so the engine can filter at runtime.

**Tech Stack:** Python (FastAPI backend), pytest for unit tests

---

### Task 1: Add pytest to requirements and create test directory

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_execution_engine.py`

**Step 1: Add pytest to requirements.txt**

Append `pytest` and `pytest-asyncio` to `backend/requirements.txt`:

```
pytest
pytest-asyncio
```

**Step 2: Install the new dependencies**

Run: `pip3 install pytest pytest-asyncio`
Expected: Successfully installed

**Step 3: Create test directory**

Create empty `backend/tests/__init__.py` and a skeleton test file `backend/tests/test_execution_engine.py`:

```python
"""Tests for the execution engine — conditional branching."""

import pytest
```

**Step 4: Run pytest to verify setup**

Run: `cd backend && python3 -m pytest tests/ -v`
Expected: "no tests ran" or "collected 0 items"

**Step 5: Commit**

```bash
git add backend/requirements.txt backend/tests/
git commit -m "chore: add pytest + test directory scaffold"
```

---

### Task 2: Write failing test — conditional node should pass upstream data through

**Files:**
- Modify: `backend/tests/test_execution_engine.py`

**Step 1: Write the failing test**

```python
"""Tests for the execution engine — conditional branching."""

import pytest
import pytest_asyncio
from app.services.execution_engine import ExecutionEngine


@pytest.mark.asyncio
async def test_conditional_passes_upstream_data():
    """The conditional node should pass through the upstream content, not 'true'/'false'."""
    engine = ExecutionEngine()

    # Simulate a compiled graph: Input -> Agent -> Conditional -> Output
    # The conditional evaluates to "true", but the output node should
    # receive the agent's content, NOT the string "true".
    execution_graph = {
        "flow_id": "test-cond",
        "execution_order": ["input-1", "agent-1", "cond-1", "output-1"],
        "compiled_nodes": {
            "input-1": {"node_id": "input-1", "node_type": "input"},
            "agent-1": {"node_id": "agent-1", "node_type": "input", "value": "The weather is sunny and 25C."},
            "cond-1": {
                "node_id": "cond-1",
                "node_type": "conditional",
                "condition": "The text mentions warm weather",
            },
            "output-1": {"node_id": "output-1", "node_type": "output"},
        },
        "edges": [
            {"id": "e1", "source": "input-1", "target": "agent-1"},
            {"id": "e2", "source": "agent-1", "target": "cond-1"},
            {"id": "e3", "source": "cond-1", "source_handle": "true", "target": "output-1"},
        ],
    }

    events = []
    async for event in engine.execute(execution_graph, user_input="test input"):
        events.append(event.to_dict())

    # Find the output node's result
    output_event = next(
        (e for e in events if e["type"] == "node_output" and e["node_id"] == "output-1"),
        None,
    )
    assert output_event is not None, "Output node should have produced output"
    # The output should contain the agent's content, NOT "true"
    assert output_event["data"] != "true", "Conditional should not replace data with 'true'"
    assert "sunny" in output_event["data"].lower() or "25" in output_event["data"], \
        "Output should contain upstream agent content"
```

**Step 2: Run the test to verify it fails**

Run: `cd backend && python3 -m pytest tests/test_execution_engine.py::test_conditional_passes_upstream_data -v`
Expected: FAIL — output_event["data"] == "true"

**Step 3: Commit**

```bash
git add backend/tests/test_execution_engine.py
git commit -m "test: failing test — conditional should pass upstream data"
```

---

### Task 3: Write failing test — execution engine should skip nodes on non-taken branch

**Files:**
- Modify: `backend/tests/test_execution_engine.py`

**Step 1: Write the failing test**

Append to `backend/tests/test_execution_engine.py`:

```python
@pytest.mark.asyncio
async def test_conditional_skips_false_branch():
    """Nodes on the non-taken branch should be skipped entirely."""
    engine = ExecutionEngine()

    # Graph: Input -> Conditional -> (true) Output-True
    #                              -> (false) Output-False
    # The conditional evaluates to true, so Output-False should be skipped.
    execution_graph = {
        "flow_id": "test-branch-skip",
        "execution_order": ["input-1", "cond-1", "output-true", "output-false"],
        "compiled_nodes": {
            "input-1": {"node_id": "input-1", "node_type": "input"},
            "cond-1": {
                "node_id": "cond-1",
                "node_type": "conditional",
                "condition": "The input is not empty",
            },
            "output-true": {"node_id": "output-true", "node_type": "output"},
            "output-false": {"node_id": "output-false", "node_type": "output"},
        },
        "edges": [
            {"id": "e1", "source": "input-1", "target": "cond-1"},
            {"id": "e2", "source": "cond-1", "source_handle": "true", "target": "output-true"},
            {"id": "e3", "source": "cond-1", "source_handle": "false", "target": "output-false"},
        ],
    }

    events = []
    async for event in engine.execute(execution_graph, user_input="hello"):
        events.append(event.to_dict())

    # Output-True should have executed
    true_output = next(
        (e for e in events if e["type"] == "node_output" and e["node_id"] == "output-true"),
        None,
    )
    assert true_output is not None, "True-branch output should have executed"

    # Output-False should NOT have executed
    false_output = next(
        (e for e in events if e["type"] == "node_output" and e["node_id"] == "output-false"),
        None,
    )
    assert false_output is None, "False-branch output should have been skipped"

    # A node_skipped event should be emitted for the false branch
    skipped = [e for e in events if e["type"] == "node_skipped"]
    assert any(e["node_id"] == "output-false" for e in skipped), \
        "Should emit node_skipped for false-branch nodes"
```

**Step 2: Run the test to verify it fails**

Run: `cd backend && python3 -m pytest tests/test_execution_engine.py::test_conditional_skips_false_branch -v`
Expected: FAIL — output-false gets executed, no node_skipped events

**Step 3: Commit**

```bash
git add backend/tests/test_execution_engine.py
git commit -m "test: failing test — conditional should skip non-taken branch"
```

---

### Task 4: Implement conditional data passthrough

**Files:**
- Modify: `backend/app/services/execution_engine.py:146-170`

**Step 1: Modify `_execute_conditional` to return upstream data + branch decision**

Replace the `_execute_conditional` method in `backend/app/services/execution_engine.py` with:

```python
    async def _execute_conditional(
        self,
        node_id: str,
        compiled: dict[str, Any],
        edges: list[dict[str, Any]],
        node_outputs: dict[str, str],
    ) -> str:
        """Evaluate a condition using a lightweight LLM call.

        Returns the upstream data (not 'true'/'false'). The branch decision
        is stored in self._branch_decisions so the execution loop can skip
        nodes on the non-taken branch.
        """
        from agno.agent import Agent
        from agno.models.openai import OpenAIChat

        upstream = _get_upstream_output(node_id, edges, node_outputs)
        condition = compiled.get("condition", "")

        evaluator = Agent(
            model=OpenAIChat(id="gpt-4o-mini"),
            instructions=(
                "You are a condition evaluator. Given the context and condition below, "
                "respond with ONLY 'true' or 'false'. Nothing else.\n\n"
                f"Condition: {condition}"
            ),
        )
        resp = await evaluator.arun(upstream)
        result = (resp.content or "").strip().lower()
        branch = "true" if result.startswith("true") else "false"

        # Store the branch decision for the execution loop
        self._branch_decisions[node_id] = branch

        # Pass upstream data through (not the boolean)
        return upstream
```

**Step 2: Run test to check progress**

Run: `cd backend && python3 -m pytest tests/test_execution_engine.py::test_conditional_passes_upstream_data -v`
Expected: May still fail because `_branch_decisions` doesn't exist yet — that's Task 5.

**Step 3: Commit**

```bash
git add backend/app/services/execution_engine.py
git commit -m "feat: conditional returns upstream data instead of true/false"
```

---

### Task 5: Implement branch skipping in execution loop

**Files:**
- Modify: `backend/app/services/execution_engine.py:59-110`

**Step 1: Add `_branch_decisions` dict and `_should_skip` method**

Add `_branch_decisions` initialization at the top of the `execute` method, and add a helper to determine if a node should be skipped. Replace the `execute` method:

```python
    async def execute(
        self,
        execution_graph: dict[str, Any],
        user_input: str = "",
    ) -> AsyncIterator[ExecutionEvent]:
        flow_id = execution_graph.get("flow_id", "unknown")
        execution_order: list[str] = execution_graph.get("execution_order", [])
        compiled_nodes: dict[str, Any] = execution_graph.get("compiled_nodes", {})
        edges: list[dict[str, Any]] = execution_graph.get("edges", [])

        node_outputs: dict[str, str] = {}
        self._branch_decisions: dict[str, str] = {}
        skipped_nodes: set[str] = set()

        yield ExecutionEvent(event_type="flow_start", flow_id=flow_id)

        for node_id in execution_order:
            compiled = compiled_nodes.get(node_id, {})
            node_type = compiled.get("node_type", "unknown")

            # Check if this node should be skipped due to branching
            if self._should_skip(node_id, edges, skipped_nodes):
                skipped_nodes.add(node_id)
                yield ExecutionEvent(event_type="node_skipped", node_id=node_id, flow_id=flow_id)
                continue

            yield ExecutionEvent(event_type="node_start", node_id=node_id, flow_id=flow_id)

            try:
                result = await self._execute_node(
                    node_id, node_type, compiled, edges, node_outputs, user_input
                )
                node_outputs[node_id] = result

                yield ExecutionEvent(
                    event_type="node_output",
                    node_id=node_id,
                    flow_id=flow_id,
                    data=result,
                )
                yield ExecutionEvent(event_type="node_complete", node_id=node_id, flow_id=flow_id)

            except Exception as e:
                logger.exception("Node '%s' failed", node_id)
                yield ExecutionEvent(
                    event_type="error",
                    node_id=node_id,
                    flow_id=flow_id,
                    message=str(e),
                )
                return

        yield ExecutionEvent(
            event_type="flow_complete",
            flow_id=flow_id,
            data=node_outputs.get(execution_order[-1], "") if execution_order else "",
        )

    def _should_skip(
        self,
        node_id: str,
        edges: list[dict[str, Any]],
        skipped_nodes: set[str],
    ) -> bool:
        """Check if a node should be skipped because it's on a non-taken branch.

        A node is skipped if ALL its incoming edges come from either:
        1. A conditional node via the non-taken branch handle, or
        2. An already-skipped node (cascading skip).
        """
        incoming = [e for e in edges if e["target"] == node_id]
        if not incoming:
            return False  # Root nodes always run

        for edge in incoming:
            source = edge["source"]
            source_handle = edge.get("source_handle")

            # If any incoming edge is from a non-skipped, non-conditional source, run the node
            if source not in self._branch_decisions and source not in skipped_nodes:
                return False

            # If source is a conditional, check if this edge is on the taken branch
            if source in self._branch_decisions:
                taken_branch = self._branch_decisions[source]
                if source_handle == taken_branch or source_handle is None:
                    return False  # This edge is on the taken branch

            # If source was skipped, this edge doesn't count as "live"
            # Continue checking other edges

        # All incoming edges are from skipped nodes or non-taken branches
        return True
```

**Step 2: Run both tests**

Run: `cd backend && python3 -m pytest tests/test_execution_engine.py -v`
Expected: Both tests may fail because the test uses a mock agent scenario. The `_execute_conditional` calls `agent.arun()` which requires an API key. We need to handle this in Task 6.

**Step 3: Commit**

```bash
git add backend/app/services/execution_engine.py
git commit -m "feat: execution engine skips nodes on non-taken conditional branch"
```

---

### Task 6: Make conditional testable without LLM calls

**Files:**
- Modify: `backend/app/services/execution_engine.py:146-170`
- Modify: `backend/tests/test_execution_engine.py`

The tests shouldn't call OpenAI. We refactor `_execute_conditional` to accept an optional `_condition_evaluator` callable so tests can override it.

**Step 1: Add evaluator injection to ExecutionEngine**

Add an `__init__` method to `ExecutionEngine`:

```python
class ExecutionEngine:
    """Executes a compiled flow graph and yields streaming events."""

    def __init__(self, condition_evaluator=None):
        self._condition_evaluator = condition_evaluator
```

And modify `_execute_conditional` to use it:

```python
    async def _execute_conditional(
        self,
        node_id: str,
        compiled: dict[str, Any],
        edges: list[dict[str, Any]],
        node_outputs: dict[str, str],
    ) -> str:
        """Evaluate a condition. Returns upstream data; stores branch decision."""
        upstream = _get_upstream_output(node_id, edges, node_outputs)
        condition = compiled.get("condition", "")

        if self._condition_evaluator:
            # Test-injectable evaluator
            branch = self._condition_evaluator(upstream, condition)
        else:
            from agno.agent import Agent
            from agno.models.openai import OpenAIChat

            evaluator = Agent(
                model=OpenAIChat(id="gpt-4o-mini"),
                instructions=(
                    "You are a condition evaluator. Given the context and condition below, "
                    "respond with ONLY 'true' or 'false'. Nothing else.\n\n"
                    f"Condition: {condition}"
                ),
            )
            resp = await evaluator.arun(upstream)
            result = (resp.content or "").strip().lower()
            branch = "true" if result.startswith("true") else "false"

        self._branch_decisions[node_id] = branch
        return upstream
```

**Step 2: Update tests to use the injectable evaluator**

Replace the engine creation in both tests with:

```python
    # Always evaluates to "true" for testing
    engine = ExecutionEngine(condition_evaluator=lambda upstream, condition: "true")
```

Also fix the first test — `agent-1` should use `node_type: "input"` with a `value` key to simulate agent output without calling OpenAI:

The compiled node for `agent-1` should be:
```python
"agent-1": {"node_id": "agent-1", "node_type": "input", "value": "The weather is sunny and 25C."},
```

(This uses the input node type which just returns `value` — a clean way to simulate any upstream output in tests.)

**Step 3: Run both tests**

Run: `cd backend && python3 -m pytest tests/test_execution_engine.py -v`
Expected: PASS for both tests

**Step 4: Commit**

```bash
git add backend/app/services/execution_engine.py backend/tests/test_execution_engine.py
git commit -m "feat: injectable condition evaluator for testability"
```

---

### Task 7: Handle node_skipped event on the frontend WebSocket client

**Files:**
- Modify: `frontend/src/services/websocket.ts:126-165`

**Step 1: Add `node_skipped` case to the event handler**

Add a new case in the `handleEvent` switch statement in `frontend/src/services/websocket.ts`, after the `node_complete` case:

```typescript
      case 'node_skipped':
        if (event.node_id) {
          store.updateNodeStatus(event.node_id, 'completed' as NodeStatus);
        }
        break;
```

(We map "skipped" to "completed" visually — the node border won't show error state. A future iteration could add a dedicated "skipped" status with grey styling.)

**Step 2: Run TypeScript type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Commit**

```bash
git add frontend/src/services/websocket.ts
git commit -m "feat: handle node_skipped WebSocket event on frontend"
```

---

### Task 8: Integration test — run a real conditional flow via WebSocket

**Files:**
- Create: `backend/tests/test_conditional_integration.py`

**Step 1: Write an integration test that calls the real WebSocket**

```python
"""Integration test — conditional branching over WebSocket (requires running server + OpenAI key)."""

import asyncio
import json
import os

import pytest

# Skip if no API key — this is an integration test
pytestmark = pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set",
)


@pytest.mark.asyncio
async def test_conditional_flow_integration():
    """Run a full conditional flow via WebSocket and verify branch routing."""
    import websockets

    flow = {
        "action": "execute",
        "user_input": "The weather is sunny and 30 degrees",
        "flow": {
            "id": "integration-cond",
            "name": "Conditional Integration",
            "nodes": [
                {
                    "id": "input-1",
                    "type": "input",
                    "position": {"x": 0, "y": 0},
                    "config": {"input_output": {"label": "Input", "data_type": "text"}},
                    "label": "Input",
                },
                {
                    "id": "cond-1",
                    "type": "conditional",
                    "position": {"x": 300, "y": 0},
                    "config": {
                        "conditional": {
                            "condition_expression": "The text describes warm weather (above 20 degrees)",
                            "true_label": "Warm",
                            "false_label": "Cold",
                        }
                    },
                    "label": "Warm?",
                },
                {
                    "id": "output-true",
                    "type": "output",
                    "position": {"x": 600, "y": 0},
                    "config": {"input_output": {"label": "Warm Output", "data_type": "text"}},
                    "label": "Warm Output",
                },
                {
                    "id": "output-false",
                    "type": "output",
                    "position": {"x": 600, "y": 200},
                    "config": {"input_output": {"label": "Cold Output", "data_type": "text"}},
                    "label": "Cold Output",
                },
            ],
            "edges": [
                {"id": "e1", "source": "input-1", "target": "cond-1"},
                {"id": "e2", "source": "cond-1", "source_handle": "true", "target": "output-true"},
                {"id": "e3", "source": "cond-1", "source_handle": "false", "target": "output-false"},
            ],
            "metadata": {"version": "1.0.0"},
        },
    }

    async with websockets.connect("ws://localhost:8000/ws/execution") as ws:
        await ws.send(json.dumps(flow))

        events = []
        while True:
            msg = await asyncio.wait_for(ws.recv(), timeout=30)
            event = json.loads(msg)
            events.append(event)
            if event["type"] in ("flow_complete", "error"):
                break

    event_types = {(e["type"], e.get("node_id")): e for e in events}

    # Conditional should have passed through the input data
    cond_output = event_types.get(("node_output", "cond-1"))
    assert cond_output is not None
    assert cond_output["data"] != "true", "Conditional should pass through upstream data"
    assert "sunny" in cond_output["data"].lower() or "30" in cond_output["data"]

    # True branch should have executed (weather IS warm)
    assert ("node_output", "output-true") in event_types, "Warm output should execute"

    # False branch should have been skipped
    assert ("node_skipped", "output-false") in event_types, "Cold output should be skipped"
```

**Step 2: Run the integration test (requires running server)**

Run: `cd backend && OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d= -f2) python3 -m pytest tests/test_conditional_integration.py -v`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/tests/test_conditional_integration.py
git commit -m "test: integration test for conditional branching over WebSocket"
```

---

### Task 9: Run full test suite and verify nothing is broken

**Files:** (none — verification only)

**Step 1: Run all backend tests**

Run: `cd backend && python3 -m pytest tests/ -v`
Expected: All tests pass

**Step 2: Run TypeScript type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean

**Step 3: Run existing E2E tests**

Run: `npx playwright test --reporter=list`
Expected: Existing tests still pass

**Step 4: Manual verification via WebSocket script**

Run the same conditional flow test from our earlier session:

```bash
python3 -c "
import asyncio, json, websockets

async def test():
    flow = {
        'action': 'execute',
        'user_input': 'The weather today is sunny and 25 degrees celsius',
        'flow': {
            'id': 'verify-cond', 'name': 'Verify',
            'nodes': [
                {'id': 'input-1', 'type': 'input', 'position': {'x': 0, 'y': 0}, 'config': {'input_output': {'label': 'Input', 'data_type': 'text'}}, 'label': 'Input'},
                {'id': 'cond-1', 'type': 'conditional', 'position': {'x': 300, 'y': 0}, 'config': {'conditional': {'condition_expression': 'The text mentions warm weather above 20 degrees', 'true_label': 'Warm', 'false_label': 'Cold'}}, 'label': 'Warm?'},
                {'id': 'output-1', 'type': 'output', 'position': {'x': 600, 'y': 0}, 'config': {'input_output': {'label': 'Output', 'data_type': 'text'}}, 'label': 'Output'},
            ],
            'edges': [
                {'id': 'e1', 'source': 'input-1', 'target': 'cond-1'},
                {'id': 'e2', 'source': 'cond-1', 'source_handle': 'true', 'target': 'output-1'},
            ],
            'metadata': {'version': '1.0.0'},
        },
    }
    async with websockets.connect('ws://localhost:8000/ws/execution') as ws:
        await ws.send(json.dumps(flow))
        while True:
            msg = await asyncio.wait_for(ws.recv(), timeout=30)
            event = json.loads(msg)
            print(f'  [{event[\"type\"]}] node={event.get(\"node_id\",\"-\")}  data={str(event.get(\"data\",\"\"))[:200]}')
            if event['type'] in ('flow_complete', 'error'): break

asyncio.run(test())
"
```

Expected output:
```
  [flow_start] node=None  data=None
  [node_start] node=input-1  data=None
  [node_output] node=input-1  data=The weather today is sunny and 25 degrees celsius
  [node_complete] node=input-1  data=None
  [node_start] node=cond-1  data=None
  [node_output] node=cond-1  data=The weather today is sunny and 25 degrees celsius   <-- upstream data, NOT "true"
  [node_complete] node=cond-1  data=None
  [node_start] node=output-1  data=None
  [node_output] node=output-1  data=The weather today is sunny and 25 degrees celsius
  [node_complete] node=output-1  data=None
  [flow_complete] node=None  data=The weather today is sunny and 25 degrees celsius
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete conditional branching — gate with branch skipping"
```

---

## Summary

| Task | Description | Files | Type |
|------|-------------|-------|------|
| 1 | Add pytest + test scaffold | 3 | Setup |
| 2 | Failing test: conditional data passthrough | 1 | Test |
| 3 | Failing test: branch skipping | 1 | Test |
| 4 | Implement conditional data passthrough | 1 | Code |
| 5 | Implement branch skipping in execution loop | 1 | Code |
| 6 | Injectable condition evaluator for tests | 2 | Code + Test |
| 7 | Handle node_skipped on frontend | 1 | Code |
| 8 | Integration test | 1 | Test |
| 9 | Full verification | 0 | Verify |
