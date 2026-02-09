"""Tests for Firecrawl Scrape node compiler."""

import pytest
from app.models.flow import FlowNode, NodeConfig, FirecrawlScrapeConfig


def test_firecrawl_scrape_compiler_basic():
    """Test basic Firecrawl Scrape compilation."""
    from app.compiler.nodes.firecrawl_scrape_compiler import FirecrawlScrapeNodeCompiler

    node = FlowNode(
        id="test-firecrawl",
        type="firecrawl_scrape",
        config=NodeConfig(
            firecrawl_scrape=FirecrawlScrapeConfig(
                url="https://example.com",
                formats=["markdown"],
                include_metadata=True
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = FirecrawlScrapeNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["node_type"] == "firecrawl_scrape"
    assert result["node_id"] == "test-firecrawl"
    assert result["url"] == "https://example.com"
    assert result["formats"] == ["markdown"]
    assert result["include_metadata"] is True


def test_firecrawl_scrape_compiler_multiple_formats():
    """Test Firecrawl with multiple output formats."""
    from app.compiler.nodes.firecrawl_scrape_compiler import FirecrawlScrapeNodeCompiler

    node = FlowNode(
        id="test-multi",
        type="firecrawl_scrape",
        config=NodeConfig(
            firecrawl_scrape=FirecrawlScrapeConfig(
                url="https://docs.example.com",
                formats=["markdown", "html", "screenshot"],
                include_metadata=False,
                credential_id="cred-123"
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = FirecrawlScrapeNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["formats"] == ["markdown", "html", "screenshot"]
    assert result["include_metadata"] is False
    assert result["credential_id"] == "cred-123"


def test_firecrawl_scrape_compiler_node_type():
    """Test compiler reports correct node type."""
    from app.compiler.nodes.firecrawl_scrape_compiler import FirecrawlScrapeNodeCompiler

    compiler = FirecrawlScrapeNodeCompiler()
    assert compiler.node_type == "firecrawl_scrape"
