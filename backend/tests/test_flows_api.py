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
