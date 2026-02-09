"""Firecrawl Scrape Node Compiler — converts websites to clean Markdown/JSON."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class FirecrawlScrapeNodeCompiler(BaseNodeCompiler):
    """
    Compiler for Firecrawl Scrape nodes.

    Converts website URLs to clean Markdown, HTML, or screenshots
    for RAG pipelines and data extraction.

    API: https://docs.firecrawl.dev/api-reference/endpoint/scrape
    """

    @property
    def node_type(self) -> str:
        return "firecrawl_scrape"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Compile Firecrawl Scrape node configuration.

        Returns a dict that the execution engine will use to:
        1. Resolve credential at runtime
        2. Make API call to Firecrawl
        3. Return normalized output

        Args:
            node: FlowNode with firecrawl_scrape config
            context: Optional compilation context (unused)

        Returns:
            Compiled node dict with url, formats, metadata settings
        """
        config = node.config.firecrawl_scrape

        if not config:
            raise ValueError(f"Node '{node.id}' missing firecrawl_scrape configuration")

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "url": config.url,
            "formats": config.formats,
            "include_metadata": config.include_metadata,
            "credential_id": config.credential_id,
        }
