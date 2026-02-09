"""Tests for Apify Actor node compiler."""

import pytest
from app.models.flow import FlowNode, NodeConfig, ApifyActorConfig


def test_apify_actor_compiler_basic():
    """Test basic Apify Actor compilation."""
    from app.compiler.nodes.apify_actor_compiler import ApifyActorNodeCompiler

    node = FlowNode(
        id="test-apify",
        type="apify_actor",
        config=NodeConfig(
            apify_actor=ApifyActorConfig(
                actor_id="apify/instagram-scraper",
                input={"username": ["test_user"]},
                max_items=50
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = ApifyActorNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["node_type"] == "apify_actor"
    assert result["actor_id"] == "apify/instagram-scraper"
    assert result["input"]["username"] == ["test_user"]
    assert result["max_items"] == 50


def test_apify_actor_compiler_timeout():
    """Test Apify Actor with custom timeout."""
    from app.compiler.nodes.apify_actor_compiler import ApifyActorNodeCompiler

    node = FlowNode(
        id="test-timeout",
        type="apify_actor",
        config=NodeConfig(
            apify_actor=ApifyActorConfig(
                actor_id="custom/actor",
                input={},
                timeout_secs=600
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = ApifyActorNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["timeout_secs"] == 600
