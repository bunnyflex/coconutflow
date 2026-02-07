"""Input Node Compiler — extracts user input value."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class InputNodeCompiler(BaseNodeCompiler):

    @property
    def node_type(self) -> str:
        return "input"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        context = context or {}
        io_cfg = node.config.input_output
        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "data_type": io_cfg.data_type if io_cfg else "text",
            "value": context.get("user_input", io_cfg.label if io_cfg else ""),
        }
