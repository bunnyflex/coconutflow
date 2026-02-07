"""Tests for Knowledge Base RAG pipeline."""
import os
import pytest
from app.services.execution_engine import ExecutionEngine


@pytest.mark.asyncio
async def test_knowledge_base_graceful_degradation_without_db():
    """KB should return error message when DATABASE_URL is not set."""
    # Temporarily clear DATABASE_URL to test graceful degradation
    original_db_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = ""

    engine = ExecutionEngine()

    # Graph: Input (query) -> Knowledge Base -> Output
    execution_graph = {
        "flow_id": "test-kb-no-db",
        "execution_order": ["input-1", "kb-1", "output-1"],
        "compiled_nodes": {
            "input-1": {"node_id": "input-1", "node_type": "input"},
            "kb-1": {
                "node_id": "kb-1",
                "node_type": "knowledge_base",
                "knowledge": None,  # No knowledge object when DB unavailable
                "knowledge_error": "DATABASE_URL not set — cannot initialise PgVector",
            },
            "output-1": {"node_id": "output-1", "node_type": "output"},
        },
        "edges": [
            {"id": "e1", "source": "input-1", "target": "kb-1"},
            {"id": "e2", "source": "kb-1", "target": "output-1"},
        ],
    }

    events = []
    async for event in engine.execute(execution_graph, user_input="What is AI?"):
        events.append(event.to_dict())

    # Restore original DATABASE_URL
    if original_db_url:
        os.environ["DATABASE_URL"] = original_db_url
    else:
        os.environ.pop("DATABASE_URL", None)

    # Verify KB node executed (didn't crash)
    kb_output = next(
        (e for e in events if e["type"] == "node_output" and e["node_id"] == "kb-1"),
        None,
    )
    assert kb_output is not None, "KB node should have produced output"

    # Verify it returned an error message, not a crash
    assert "Knowledge Base unavailable" in kb_output["data"], \
        f"Should return graceful error message, got: {kb_output['data']}"
    assert "DATABASE_URL not set" in kb_output["data"], \
        "Error message should explain the issue"

    # Verify flow completed
    flow_complete = next(
        (e for e in events if e["type"] == "flow_complete"),
        None,
    )
    assert flow_complete is not None, "Flow should complete despite KB unavailability"


@pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="Requires DATABASE_URL to be set for integration testing"
)
@pytest.mark.asyncio
async def test_knowledge_base_with_real_db():
    """Integration test: KB RAG with real Supabase database.

    This test is skipped if DATABASE_URL is not configured.
    To run: ensure DATABASE_URL is set in .env and run with pytest.
    """
    # This test would require:
    # 1. Uploaded test document
    # 2. Compiled KB node with real knowledge object
    # 3. Query execution
    # 4. Verification of RAG response

    # TODO: Implement once we have test documents uploaded
    pytest.skip("Integration test not yet implemented - needs test documents")
