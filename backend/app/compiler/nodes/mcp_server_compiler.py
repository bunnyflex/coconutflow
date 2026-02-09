"""MCP Server Node Compiler — connects to Model Context Protocol servers."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class MCPServerNodeCompiler(BaseNodeCompiler):
    """
    Compiler for MCP Server nodes.

    Connects to MCP servers and creates Agno agents with MCP tools.
    Supports stdio, SSE, and HTTP server types.

    Spec: https://modelcontextprotocol.io/
    """

    @property
    def node_type(self) -> str:
        return "mcp_server"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Compile MCP Server node configuration.

        Returns a dict that the execution engine will use to:
        1. Connect to the MCP server at runtime
        2. Discover available tools from the server
        3. Create an Agno agent with those tools
        4. Execute user queries using MCP tools

        Args:
            node: FlowNode with mcp_server config
            context: Optional compilation context (unused)

        Returns:
            Compiled node dict with server connection details

        Note:
            Actual MCP client connection and agent creation happens in the
            execution engine, not at compile time. This is because MCP servers
            may not be available during compilation, and we want to defer
            connection/discovery to execution time when we have user input.
        """
        config = node.config.mcp_server

        if not config:
            raise ValueError(f"Node '{node.id}' missing mcp_server configuration")

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "server_name": config.server_name,
            "server_url": config.server_url,
            "server_type": config.server_type,
            "instructions": config.instructions,
            "credential_id": config.credential_id,
        }
