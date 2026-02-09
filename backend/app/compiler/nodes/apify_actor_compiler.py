"""Apify Actor Node Compiler — runs Apify scrapers/actors."""

from __future__ import annotations

from typing import Any, Optional

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class ApifyActorNodeCompiler(BaseNodeCompiler):
    """
    Compiler for Apify Actor nodes.

    Runs any of Apify's 1,500+ pre-built scrapers (actors)
    for social media, e-commerce, maps, etc.

    API: https://docs.apify.com/api/v2#/reference/actors/run-collection
    """

    @property
    def node_type(self) -> str:
        return "apify_actor"

    def compile(self, node: FlowNode, context: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        config = node.config.apify_actor

        if not config:
            raise ValueError(f"Node '{node.id}' missing apify_actor configuration")

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "actor_id": config.actor_id,
            "input": config.input,
            "max_items": config.max_items,
            "timeout_secs": config.timeout_secs,
            "credential_id": config.credential_id,
        }
