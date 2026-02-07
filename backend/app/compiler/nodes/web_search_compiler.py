"""Web Search Node Compiler — creates an Agent with DuckDuckGoTools."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class WebSearchNodeCompiler(BaseNodeCompiler):

    @property
    def node_type(self) -> str:
        return "tool"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        from agno.agent import Agent
        from agno.models.openai import OpenAIChat
        from agno.tools.duckduckgo import DuckDuckGoTools

        _ = context  # unused but required by interface
        tool_cfg = node.config.tool
        params = tool_cfg.parameters if tool_cfg else {}

        agent = Agent(
            name="Web Search Agent",
            model=OpenAIChat(id="gpt-4o-mini"),
            tools=[DuckDuckGoTools()],
            instructions="Search the web and return relevant results.",
            markdown=True,
        )

        return {
            "node_id": node.id,
            "node_type": "web_search",
            "agent": agent,
            "result_count": params.get("result_count", 5),
        }
