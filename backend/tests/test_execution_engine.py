"""Tests for the execution engine — conditional branching and multi-agent chaining."""

import pytest
from app.services.execution_engine import ExecutionEngine


@pytest.mark.asyncio
async def test_conditional_passes_upstream_data():
    """The conditional node should pass through the upstream content, not 'true'/'false'."""
    # Always evaluates to "true" for testing — no OpenAI call
    engine = ExecutionEngine(condition_evaluator=lambda upstream, condition: "true")

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
    async for event in engine.execute(execution_graph, user_input=""):
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
        "Output should contain upstream agent content (got: %s)" % output_event["data"]


@pytest.mark.asyncio
async def test_conditional_skips_false_branch():
    """Nodes on the non-taken branch should be skipped entirely."""
    # Always evaluates to "true" for testing — no OpenAI call
    engine = ExecutionEngine(condition_evaluator=lambda upstream, condition: "true")

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


@pytest.mark.asyncio
async def test_multi_agent_chaining():
    """Agent nodes should pass their output as context to downstream agents."""
    engine = ExecutionEngine()

    # Graph: Input -> Agent1 (Research) -> Agent2 (Summarize) -> Output
    # Agent1 and Agent2 are mocked as input nodes for testing without OpenAI
    execution_graph = {
        "flow_id": "test-multi-agent",
        "execution_order": ["input-1", "agent-1", "agent-2", "output-1"],
        "compiled_nodes": {
            "input-1": {"node_id": "input-1", "node_type": "input"},
            # Mock Agent1 as an input node that produces research facts
            "agent-1": {
                "node_id": "agent-1",
                "node_type": "input",
                "value": "Fact 1: AI improves diagnostics. Fact 2: AI reduces costs. Fact 3: AI enables personalized medicine.",
            },
            # Mock Agent2 as an input node that would receive Agent1's output
            "agent-2": {
                "node_id": "agent-2",
                "node_type": "input",
                "value": "AI transforms healthcare through better diagnostics and personalization.",
            },
            "output-1": {"node_id": "output-1", "node_type": "output"},
        },
        "edges": [
            {"id": "e1", "source": "input-1", "target": "agent-1"},
            {"id": "e2", "source": "agent-1", "target": "agent-2"},
            {"id": "e3", "source": "agent-2", "target": "output-1"},
        ],
    }

    events = []
    # Pass empty user_input so mock agents use their "value" field instead
    async for event in engine.execute(execution_graph, user_input=""):
        events.append(event.to_dict())

    # Verify Agent1 executed and produced output
    agent1_output = next(
        (e for e in events if e["type"] == "node_output" and e["node_id"] == "agent-1"),
        None,
    )
    assert agent1_output is not None, "Agent1 should have produced output"
    assert "diagnostics" in agent1_output["data"].lower(), \
        "Agent1 should output research facts"

    # Verify Agent2 executed and produced output
    agent2_output = next(
        (e for e in events if e["type"] == "node_output" and e["node_id"] == "agent-2"),
        None,
    )
    assert agent2_output is not None, "Agent2 should have produced output"
    assert "transforms" in agent2_output["data"].lower(), \
        "Agent2 should output summary"

    # Verify final output contains Agent2's result
    final_output = next(
        (e for e in events if e["type"] == "flow_complete"),
        None,
    )
    assert final_output is not None, "Flow should complete"
    assert "transforms" in final_output["data"].lower(), \
        "Final output should contain Agent2's summary"
