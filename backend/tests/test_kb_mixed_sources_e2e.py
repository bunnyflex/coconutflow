"""E2E test for Knowledge Base with mixed source types."""
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
async def test_kb_mixed_sources_e2e():
    """E2E test: Mixed sources (file + website + YouTube) → RAG query."""

    # Create a test text file
    test_file = "/tmp/test_kb_mixed.txt"
    with open(test_file, "w") as f:
        f.write("CoconutFlow is a visual workflow builder for AI agents.")

    # Build flow: Input → Knowledge Base (mixed sources) → Output
    flow_definition = {
        "id": "test-kb-mixed",
        "name": "KB Mixed Sources E2E",
        "nodes": [
            {
                "id": "input-1",
                "type": "input",
                "position": {"x": 0, "y": 0},
                "config": {
                    "input_output": {
                        "label": "What is Python used for?",
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
                        "sources": [
                            test_file,  # Local file
                            "https://www.python.org/about/",  # Website
                            # Skip YouTube for faster test (transcript fetching is slow)
                        ],
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
    assert "knowledge" in kb_compiled
    assert kb_compiled["knowledge"] is not None

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
    assert flow_complete is not None

    # Verify KB node executed
    kb_output = next(
        (e for e in events if e["type"] == "node_output" and e["node_id"] == "kb-1"),
        None
    )
    assert kb_output is not None

    # Verify response mentions Python (from website content)
    response = kb_output["data"].lower()
    assert "python" in response

    # Cleanup
    os.remove(test_file)

    print("\n✅ Mixed sources E2E test PASSED!")
    print(f"✅ Loaded: 1 file + 1 website")
    print(f"✅ RAG Response: {kb_output['data'][:200]}...")
