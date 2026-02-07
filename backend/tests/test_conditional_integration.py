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
