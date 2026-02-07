"""Conditional Node Compiler — stores condition for LLM-based evaluation at runtime."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class ConditionalNodeCompiler(BaseNodeCompiler):

    @property
    def node_type(self) -> str:
        return "conditional"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        _ = context
        cond_cfg = node.config.conditional
        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "condition": cond_cfg.condition_expression if cond_cfg else "",
            "true_label": cond_cfg.true_label if cond_cfg else "True",
            "false_label": cond_cfg.false_label if cond_cfg else "False",
        }
