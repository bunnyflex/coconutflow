"""LLM Agent Node Compiler — creates Agno Agent objects."""

from __future__ import annotations

import logging
from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode

logger = logging.getLogger(__name__)

# Model provider → Agno class mapping
MODEL_FACTORIES: dict[str, tuple[str, str]] = {
    "openai": ("agno.models.openai", "OpenAIChat"),
    "anthropic": ("agno.models.anthropic", "Claude"),
    "google": ("agno.models.google", "Gemini"),
    "groq": ("agno.models.groq", "Groq"),
    "ollama": ("agno.models.ollama", "Ollama"),
}

# Tool name → Agno import mapping
TOOL_FACTORIES: dict[str, tuple[str, str, dict[str, Any]]] = {
    "web_search": ("agno.tools.duckduckgo", "DuckDuckGoTools", {}),
    "finance": ("agno.tools.yfinance", "YFinanceTools", {"stock_price": True, "company_info": True}),
    "reasoning": ("agno.tools.reasoning", "ReasoningTools", {"add_instructions": True}),
    "github": ("agno.tools.github", "GithubTools", {"search_repositories": True}),
}


def _create_model(provider: str, model_id: str) -> Any:
    """Dynamically import and instantiate an Agno model class."""
    if provider not in MODEL_FACTORIES:
        raise ValueError(f"Unknown model provider: {provider}")

    module_path, class_name = MODEL_FACTORIES[provider]
    import importlib
    module = importlib.import_module(module_path)
    model_cls = getattr(module, class_name)
    return model_cls(id=model_id)


def _create_tools(tool_names: list[str]) -> list[Any]:
    """Dynamically import and instantiate Agno tool classes."""
    tools = []
    for name in tool_names:
        if name not in TOOL_FACTORIES:
            logger.warning("Unknown tool '%s', skipping", name)
            continue
        module_path, class_name, kwargs = TOOL_FACTORIES[name]
        import importlib
        module = importlib.import_module(module_path)
        tool_cls = getattr(module, class_name)
        tools.append(tool_cls(**kwargs))
    return tools


class AgentNodeCompiler(BaseNodeCompiler):

    @property
    def node_type(self) -> str:
        return "agent"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        from agno.agent import Agent

        cfg = node.config.agent
        if not cfg:
            raise ValueError(f"Node '{node.id}' missing agent configuration")

        model = _create_model(cfg.provider.value, cfg.model)
        tools = _create_tools(cfg.tools)

        instructions = cfg.system_prompt or cfg.instructions
        if isinstance(instructions, list):
            instructions = "\n".join(instructions)

        agent_kwargs: dict[str, Any] = {
            "name": cfg.name,
            "model": model,
            "instructions": instructions or None,
            "markdown": cfg.markdown,
        }
        if tools:
            agent_kwargs["tools"] = tools

        agent = Agent(**agent_kwargs)

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "agent": agent,
            "temperature": cfg.temperature,
        }
