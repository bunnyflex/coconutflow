"""E2E integration test for Knowledge Base RAG pipeline."""
import os
import pytest
from app.compiler.flow_compiler import FlowCompiler
from app.services.execution_engine import ExecutionEngine
from app.models.flow import FlowDefinition


@pytest.mark.skipif(
    not os.environ.get("DATABASE_URL") or not os.environ.get("OPENAI_API_KEY"),
    reason="Requires DATABASE_URL and OPENAI_API_KEY for E2E testing"
)
@pytest.mark.asyncio
async def test_kb_rag_e2e_with_real_document():
    """E2E test: Upload document → Query via KB → Verify RAG response.

    This tests the full Knowledge Base RAG pipeline:
    - Document uploaded to uploads/ directory
    - KB node compiler builds Agno Knowledge with pgvector
    - Execution engine queries the KB
    - RAG retrieves relevant content and generates answer
    """
    # Use the uploaded test document
    uploaded_file_path = "/Users/affinitylabs/Downloads/coconut/coconutflow-main/backend/uploads/655140be-5451-4328-a8bc-b4c317d81f87.txt"

    # Verify file exists
    assert os.path.exists(uploaded_file_path), f"Test document not found: {uploaded_file_path}"

    # Build flow: Input → Knowledge Base → Output
    flow_definition = {
        "id": "test-kb-e2e",
        "name": "KB RAG E2E Test",
        "nodes": [
            {
                "id": "input-1",
                "type": "input",
                "position": {"x": 0, "y": 0},
                "config": {
                    "input_output": {
                        "label": "What are the main applications of AI in healthcare?",
                        "data_type": "text"
                    }
                }
            },
            {
                "id": "kb-1",
                "type": "knowledge_base",
                "position": {"x": 200, "y": 0},
                "config": {
                    "knowledge_base": {
                        "kb_type": "document",
                        "vector_db": "pgvector",
                        "sources": [uploaded_file_path],  # List of document paths
                        "chunk_size": 500,
                        "chunk_overlap": 50
                    }
                }
            },
            {
                "id": "output-1",
                "type": "output",
                "position": {"x": 400, "y": 0},
                "config": {"output": {}}
            }
        ],
        "edges": [
            {
                "id": "e1",
                "source": "input-1",
                "target": "kb-1",
                "sourceHandle": None,
                "targetHandle": None
            },
            {
                "id": "e2",
                "source": "kb-1",
                "target": "output-1",
                "sourceHandle": None,
                "targetHandle": None
            }
        ]
    }

    # Parse and compile the flow
    flow = FlowDefinition.model_validate(flow_definition)
    compiler = FlowCompiler()
    execution_graph = compiler.compile(flow)

    # Verify KB node was compiled with knowledge object
    kb_compiled = execution_graph["compiled_nodes"]["kb-1"]
    assert "knowledge" in kb_compiled, f"KB node should have knowledge object. Keys: {kb_compiled.keys()}"
    assert kb_compiled["knowledge"] is not None, "Knowledge should not be None when DATABASE_URL is set"

    # Execute the flow
    engine = ExecutionEngine()
    events = []

    async for event in engine.execute(execution_graph, user_input=""):
        events.append(event.to_dict())
        print(f"[{event.type}] {event.node_id}: {event.message or event.data or ''}")

    # Verify execution completed
    flow_complete = next(
        (e for e in events if e["type"] == "flow_complete"),
        None
    )
    assert flow_complete is not None, "Flow should complete"

    # Verify KB node executed
    kb_output = next(
        (e for e in events if e["type"] == "node_output" and e["node_id"] == "kb-1"),
        None
    )
    assert kb_output is not None, "KB node should produce output"

    # Verify response contains relevant information from the document
    response = kb_output["data"].lower()

    # The RAG response should mention at least one of the main applications
    assert any(keyword in response for keyword in [
        "diagnosis", "diagnostic",
        "drug discovery", "drug development",
        "personalized medicine", "precision medicine"
    ]), f"RAG response should mention AI healthcare applications. Got: {response[:200]}"

    # Verify final output contains the KB response
    assert "diagnosis" in flow_complete["data"].lower() or \
           "drug" in flow_complete["data"].lower() or \
           "personalized" in flow_complete["data"].lower(), \
           "Final output should contain RAG answer"

    print("\n✅ KB RAG E2E test PASSED!")
    print(f"✅ Query: 'What are the main applications of AI in healthcare?'")
    print(f"✅ RAG Response: {kb_output['data'][:200]}...")
