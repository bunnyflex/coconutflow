"""
API endpoint tests using FastAPI TestClient.

Tests: CRUD operations for flows, file upload, compilation endpoint.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_flow():
    return {
        "id": "test-flow-api",
        "name": "API Test Flow",
        "description": "Created by test",
        "nodes": [
            {
                "id": "n1",
                "type": "input",
                "position": {"x": 0, "y": 0},
                "config": {"input_output": {"label": "Input", "data_type": "text"}},
                "label": "Input",
            },
            {
                "id": "n2",
                "type": "agent",
                "position": {"x": 300, "y": 0},
                "config": {
                    "agent": {
                        "name": "Agent",
                        "provider": "openai",
                        "model": "gpt-4o-mini",
                        "system_prompt": "Be helpful",
                    }
                },
                "label": "Agent",
            },
            {
                "id": "n3",
                "type": "output",
                "position": {"x": 600, "y": 0},
                "config": {"input_output": {"label": "Output", "data_type": "text"}},
                "label": "Output",
            },
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2"},
            {"id": "e2", "source": "n2", "target": "n3"},
        ],
        "metadata": {"version": "1.0.0"},
    }


class TestFlowCRUD:
    """Test flow CRUD API endpoints."""

    def test_list_flows_empty(self, client):
        resp = client.get("/api/flows/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_flow(self, client, sample_flow):
        resp = client.post("/api/flows/", json=sample_flow)
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] == "test-flow-api"
        assert data["name"] == "API Test Flow"

    def test_get_flow(self, client, sample_flow):
        client.post("/api/flows/", json=sample_flow)
        resp = client.get(f"/api/flows/{sample_flow['id']}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "API Test Flow"

    def test_get_flow_not_found(self, client):
        resp = client.get("/api/flows/nonexistent")
        assert resp.status_code == 404

    def test_update_flow(self, client, sample_flow):
        client.post("/api/flows/", json=sample_flow)
        sample_flow["name"] = "Updated Flow"
        resp = client.put(f"/api/flows/{sample_flow['id']}", json=sample_flow)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Flow"

    def test_delete_flow(self, client, sample_flow):
        client.post("/api/flows/", json=sample_flow)
        resp = client.delete(f"/api/flows/{sample_flow['id']}")
        assert resp.status_code == 204

        resp = client.get(f"/api/flows/{sample_flow['id']}")
        assert resp.status_code == 404

    def test_compile_flow(self, client, sample_flow):
        client.post("/api/flows/", json=sample_flow)
        resp = client.post(f"/api/flows/{sample_flow['id']}/compile")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "compiled"
        assert "execution_graph" in data


class TestFileUpload:
    """Test file upload endpoint."""

    def test_upload_txt_file(self, client):
        resp = client.post(
            "/api/upload",
            files={"file": ("test.txt", b"Hello, world!", "text/plain")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["filename"] == "test.txt"
        assert "file_id" in data
        assert data["size"] == 13

    def test_upload_disallowed_extension(self, client):
        resp = client.post(
            "/api/upload",
            files={"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")},
        )
        assert resp.status_code == 400
