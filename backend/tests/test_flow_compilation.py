"""
End-to-end test for the flow compilation pipeline.

Tests: Flow JSON → FlowDefinition parse → FlowCompiler.compile() → execution graph
"""

import pytest

from app.models.flow import (
    FlowDefinition,
    FlowEdge,
    FlowMetadata,
    FlowNode,
    NodeConfig,
    NodePosition,
    NodeType,
    AgentConfig,
    AgentProvider,
    InputOutputConfig,
    ConditionalConfig,
)
from app.compiler.flow_compiler import FlowCompiler


def _make_input_node(node_id: str = "node_input") -> FlowNode:
    return FlowNode(
        id=node_id,
        type=NodeType.INPUT,
        position=NodePosition(x=0, y=0),
        config=NodeConfig(input_output=InputOutputConfig(label="User Input", data_type="text")),
        label="Input",
    )


def _make_agent_node(node_id: str = "node_agent") -> FlowNode:
    return FlowNode(
        id=node_id,
        type=NodeType.AGENT,
        position=NodePosition(x=300, y=0),
        config=NodeConfig(
            agent=AgentConfig(
                name="Test Agent",
                provider=AgentProvider.OPENAI,
                model="gpt-4o-mini",
                system_prompt="You are a helpful assistant.",
                temperature=0.5,
            )
        ),
        label="LLM Agent",
    )


def _make_output_node(node_id: str = "node_output") -> FlowNode:
    return FlowNode(
        id=node_id,
        type=NodeType.OUTPUT,
        position=NodePosition(x=600, y=0),
        config=NodeConfig(input_output=InputOutputConfig(label="Output", data_type="text")),
        label="Output",
    )


def _make_conditional_node(node_id: str = "node_cond") -> FlowNode:
    return FlowNode(
        id=node_id,
        type=NodeType.CONDITIONAL,
        position=NodePosition(x=300, y=200),
        config=NodeConfig(
            conditional=ConditionalConfig(
                condition_expression="The response mentions pricing",
                true_label="Yes",
                false_label="No",
            )
        ),
        label="Conditional",
    )


class TestFlowCompilation:
    """Test that flow definitions compile correctly to execution graphs."""

    def test_simple_input_agent_output(self):
        """Input → Agent → Output: the simplest flow."""
        flow = FlowDefinition(
            id="test-flow-1",
            name="Simple Flow",
            description="A basic test flow",
            nodes=[_make_input_node(), _make_agent_node(), _make_output_node()],
            edges=[
                FlowEdge(id="e1", source="node_input", target="node_agent"),
                FlowEdge(id="e2", source="node_agent", target="node_output"),
            ],
            metadata=FlowMetadata(),
        )

        compiler = FlowCompiler()
        graph = compiler.compile(flow)

        assert graph["flow_id"] == "test-flow-1"
        assert "execution_order" in graph
        assert "compiled_nodes" in graph

        order = graph["execution_order"]
        assert len(order) == 3

        # Input must come before Agent, Agent before Output
        assert order.index("node_input") < order.index("node_agent")
        assert order.index("node_agent") < order.index("node_output")

        # Check compiled node types
        compiled = graph["compiled_nodes"]
        assert compiled["node_input"]["node_type"] == "input"
        assert compiled["node_agent"]["node_type"] == "agent"
        assert compiled["node_output"]["node_type"] == "output"

        # Agent should have an agent object
        assert compiled["node_agent"]["agent"] is not None

    def test_flow_with_conditional(self):
        """Input → Conditional → Output: conditional branching."""
        flow = FlowDefinition(
            id="test-flow-2",
            name="Conditional Flow",
            nodes=[
                _make_input_node(),
                _make_conditional_node(),
                _make_output_node(),
            ],
            edges=[
                FlowEdge(id="e1", source="node_input", target="node_cond"),
                FlowEdge(id="e2", source="node_cond", target="node_output"),
            ],
            metadata=FlowMetadata(),
        )

        compiler = FlowCompiler()
        graph = compiler.compile(flow)

        order = graph["execution_order"]
        assert order.index("node_input") < order.index("node_cond")
        assert order.index("node_cond") < order.index("node_output")

        # Conditional should have condition stored
        compiled = graph["compiled_nodes"]
        assert compiled["node_cond"]["node_type"] == "conditional"
        assert "condition" in compiled["node_cond"]

    def test_empty_flow_raises(self):
        """An empty flow should raise an error."""
        flow = FlowDefinition(
            id="test-flow-empty",
            name="Empty Flow",
            nodes=[],
            edges=[],
            metadata=FlowMetadata(),
        )

        compiler = FlowCompiler()
        with pytest.raises(ValueError, match="at least one node"):
            compiler.compile(flow)

    def test_cycle_detection(self):
        """A flow with cycles should be rejected by the compiler."""
        node_a = _make_agent_node("a")
        node_b = _make_agent_node("b")

        flow = FlowDefinition(
            id="test-flow-cycle",
            name="Cyclic Flow",
            nodes=[node_a, node_b],
            edges=[
                FlowEdge(id="e1", source="a", target="b"),
                FlowEdge(id="e2", source="b", target="a"),
            ],
            metadata=FlowMetadata(),
        )

        compiler = FlowCompiler()
        with pytest.raises(ValueError, match="[Cc]ycle"):
            compiler.compile(flow)


class TestFlowDefinitionParsing:
    """Test that FlowDefinition parses correctly from JSON-like dicts."""

    def test_parse_minimal(self):
        data = {
            "id": "f-1",
            "name": "Test",
            "nodes": [],
            "edges": [],
        }
        flow = FlowDefinition(**data)
        assert flow.id == "f-1"
        assert flow.name == "Test"
        assert flow.nodes == []

    def test_parse_with_agent_node(self):
        data = {
            "id": "f-2",
            "name": "Agent Flow",
            "nodes": [
                {
                    "id": "n1",
                    "type": "agent",
                    "position": {"x": 100, "y": 200},
                    "config": {
                        "agent": {
                            "name": "My Agent",
                            "provider": "openai",
                            "model": "gpt-4o",
                            "system_prompt": "Be helpful",
                            "temperature": 0.5,
                        }
                    },
                    "label": "Agent Node",
                }
            ],
            "edges": [],
        }
        flow = FlowDefinition(**data)
        assert len(flow.nodes) == 1
        assert flow.nodes[0].type == NodeType.AGENT
        assert flow.nodes[0].config.agent is not None
        assert flow.nodes[0].config.agent.model == "gpt-4o"
