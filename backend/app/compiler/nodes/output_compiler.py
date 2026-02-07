"""Output Node Compiler — passes through upstream result."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class OutputNodeCompiler(BaseNodeCompiler):

    @property
    def node_type(self) -> str:
        return "output"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        _ = context
        io_cfg = node.config.input_output
        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "display_format": io_cfg.data_type if io_cfg else "text",
        }
