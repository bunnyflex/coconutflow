"""Tests for the /api/chat endpoint."""
import pytest
from app.api.chat import _extract_mutations, _clean_message


def test_extract_mutations_from_json_block():
    text = '''Here's your flow:
```json
{"mutations": [{"type": "add_node", "node_id": "input-1", "node_type": "input", "config": {}, "position": {"x": 0, "y": 0}}]}
```
'''
    mutations = _extract_mutations(text)
    assert mutations is not None
    assert len(mutations) == 1
    assert mutations[0]["type"] == "add_node"
    assert mutations[0]["node_id"] == "input-1"


def test_extract_mutations_no_json():
    assert _extract_mutations("Just a plain text response") is None


def test_extract_mutations_invalid_json():
    text = '```json\n{invalid json}\n```'
    assert _extract_mutations(text) is None


def test_clean_message_removes_json_block():
    text = '''I created your flow.
```json
{"mutations": []}
```
Enjoy!'''
    cleaned = _clean_message(text)
    assert "```json" not in cleaned
    assert "I created your flow." in cleaned
    assert "Enjoy!" in cleaned


def test_clean_message_no_json():
    text = "Just a plain response"
    assert _clean_message(text) == "Just a plain response"


def test_chat_endpoint_exists():
    """The /api/chat endpoint should exist and accept POST."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.post("/api/chat/", json={
        "messages": [{"role": "user", "content": "hello"}],
        "flow_state": {"nodes": [], "edges": []},
    })
    # Will fail with 500 if no OPENAI_API_KEY, but should not 404
    assert response.status_code != 404
