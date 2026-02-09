"""Tests for MCP Server node compiler."""

import pytest
from app.models.flow import FlowNode, NodeConfig, MCPServerConfig


def test_mcp_server_compiler_basic():
    """Test basic MCP Server compilation."""
    from app.compiler.nodes.mcp_server_compiler import MCPServerNodeCompiler

    node = FlowNode(
        id="test-mcp",
        type="mcp_server",
        config=NodeConfig(
            mcp_server=MCPServerConfig(
                server_name="filesystem",
                server_url="/usr/local/bin/mcp-server-filesystem",
                server_type="stdio"
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = MCPServerNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["node_type"] == "mcp_server"
    assert result["node_id"] == "test-mcp"
    assert result["server_name"] == "filesystem"
    assert result["server_url"] == "/usr/local/bin/mcp-server-filesystem"
    assert result["server_type"] == "stdio"


def test_mcp_server_compiler_with_instructions():
    """Test MCP Server with custom instructions."""
    from app.compiler.nodes.mcp_server_compiler import MCPServerNodeCompiler

    node = FlowNode(
        id="test-mcp-instructions",
        type="mcp_server",
        config=NodeConfig(
            mcp_server=MCPServerConfig(
                server_name="github",
                server_url="https://api.github.com/mcp",
                server_type="http",
                instructions="Search GitHub repositories and issues",
                credential_id="cred-456"
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = MCPServerNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["server_type"] == "http"
    assert result["instructions"] == "Search GitHub repositories and issues"
    assert result["credential_id"] == "cred-456"


def test_mcp_server_compiler_sse_type():
    """Test MCP Server with SSE server type."""
    from app.compiler.nodes.mcp_server_compiler import MCPServerNodeCompiler

    node = FlowNode(
        id="test-mcp-sse",
        type="mcp_server",
        config=NodeConfig(
            mcp_server=MCPServerConfig(
                server_name="realtime-server",
                server_url="https://sse.example.com/events",
                server_type="sse"
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = MCPServerNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["server_type"] == "sse"
    assert result["server_url"] == "https://sse.example.com/events"


def test_mcp_server_compiler_node_type():
    """Test compiler reports correct node type."""
    from app.compiler.nodes.mcp_server_compiler import MCPServerNodeCompiler

    compiler = MCPServerNodeCompiler()
    assert compiler.node_type == "mcp_server"


def test_mcp_server_compiler_missing_config():
    """Test compiler raises error when config is missing."""
    from app.compiler.nodes.mcp_server_compiler import MCPServerNodeCompiler

    node = FlowNode(
        id="test-invalid",
        type="mcp_server",
        config=NodeConfig(),  # No mcp_server config
        position={"x": 0, "y": 0}
    )

    compiler = MCPServerNodeCompiler()

    with pytest.raises(ValueError, match="missing mcp_server configuration"):
        compiler.compile(node, context={})
