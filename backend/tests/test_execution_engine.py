"""Tests for the execution engine — conditional branching."""

import pytest
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
