import pytest
from app.services.python_exporter import PythonExporter
from app.models.flow import (
    FlowDefinition,
    FlowNode,
    FlowEdge,
    NodeType,
    NodePosition,
    NodeConfig,
    InputOutputConfig,
    AgentConfig,
    AgentProvider,
)

def test_generate_simple_workflow():
    """Test generating Python code from simple workflow."""
    flow = FlowDefinition(
        id="test-flow",
        name="Simple Test",
        description="Input -> Agent -> Output",
        nodes=[
            FlowNode(
                id="node_1",
                type=NodeType.INPUT,
                position=NodePosition(x=0, y=0),
                label="Input",
                config=NodeConfig(
                    input_output=InputOutputConfig(label="Input", data_type="text")
                ),
            ),
            FlowNode(
                id="node_2",
                type=NodeType.AGENT,
                position=NodePosition(x=200, y=0),
                label="Agent",
                config=NodeConfig(
                    agent=AgentConfig(
                        name="Agent",
                        provider=AgentProvider.OPENAI,
                        model="gpt-4o",
                        system_prompt="You are a helpful assistant.",
                    )
                ),
            ),
        ],
        edges=[
            FlowEdge(id="e1", source="node_1", target="node_2")
        ],
    )

    exporter = PythonExporter()
    code = exporter.generate(flow)

    assert "async def run_workflow" in code
    assert "from agno import Agent" in code
    assert "gpt-4o" in code
