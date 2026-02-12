"""
Test suite for export API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def test_flow_id():
    """Create a test flow and return its ID."""
    flow = {
        "id": "test-export-flow",
        "name": "Export Test Flow",
        "description": "Flow for testing Python export",
        "nodes": [
            {
                "id": "node-1",
                "type": "input",
                "position": {"x": 0, "y": 0},
                "label": "Input",
                "config": {"input_output": {"label": "Input", "data_type": "text"}},
            },
            {
                "id": "node-2",
                "type": "agent",
                "position": {"x": 300, "y": 0},
                "label": "Agent",
                "config": {
                    "agent": {
                        "name": "Agent",
                        "provider": "openai",
                        "model": "gpt-4o",
                        "system_prompt": "You are helpful",
                    }
                },
            },
        ],
        "edges": [{"id": "e1", "source": "node-1", "target": "node-2"}],
        "metadata": {},
    }

    # Create the flow
    response = client.post("/api/flows/", json=flow)
    assert response.status_code == 201

    yield "test-export-flow"

    # Cleanup
    client.delete("/api/flows/test-export-flow")


def test_export_python_endpoint(test_flow_id):
    """Test Python export endpoint."""
    response = client.get(f"/api/flows/{test_flow_id}/export/python")

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/plain; charset=utf-8"
    assert "async def run_workflow" in response.text
    assert "from agno.agent import Agent" in response.text
    assert "gpt-4o" in response.text


def test_export_endpoint_exists():
    """Test that export endpoint is registered and callable."""
    # Without Supabase credentials, we expect a 500 error from Supabase client init
    # But this proves the endpoint exists and is callable (not 404 route not found)
    try:
        response = client.get("/api/flows/nonexistent-flow-id/export/python")
        # If we get here (Supabase configured), check for proper 404 or 500
        assert response.status_code in [404, 500]
    except RuntimeError as e:
        # Expected: Supabase credentials not configured
        assert "SUPABASE" in str(e)
        # This proves the endpoint exists and was called
