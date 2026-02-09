"""Plugin-based node compiler registry."""

from app.compiler.nodes.base import BaseNodeCompiler
from app.compiler.nodes.input_compiler import InputNodeCompiler
from app.compiler.nodes.agent_compiler import AgentNodeCompiler
from app.compiler.nodes.web_search_compiler import WebSearchNodeCompiler
from app.compiler.nodes.output_compiler import OutputNodeCompiler
from app.compiler.nodes.conditional_compiler import ConditionalNodeCompiler
from app.compiler.nodes.knowledge_base_compiler import KnowledgeBaseNodeCompiler
from app.compiler.nodes.firecrawl_scrape_compiler import FirecrawlScrapeNodeCompiler
from app.compiler.nodes.mcp_server_compiler import MCPServerNodeCompiler
from app.compiler.nodes.huggingface_inference_compiler import HuggingFaceInferenceNodeCompiler
from app.compiler.nodes.apify_actor_compiler import ApifyActorNodeCompiler

ALL_COMPILERS: list[type[BaseNodeCompiler]] = [
    InputNodeCompiler,
    AgentNodeCompiler,
    WebSearchNodeCompiler,
    OutputNodeCompiler,
    ConditionalNodeCompiler,
    KnowledgeBaseNodeCompiler,
    FirecrawlScrapeNodeCompiler,
    MCPServerNodeCompiler,
    HuggingFaceInferenceNodeCompiler,
    ApifyActorNodeCompiler,
]


def register_all_compilers(flow_compiler: object) -> None:
    """Register every node compiler with a FlowCompiler instance."""
    for compiler_cls in ALL_COMPILERS:
        instance = compiler_cls()
        flow_compiler.register_compiler(instance.node_type, instance)  # type: ignore[attr-defined]


__all__ = [
    "BaseNodeCompiler",
    "ALL_COMPILERS",
    "register_all_compilers",
]
