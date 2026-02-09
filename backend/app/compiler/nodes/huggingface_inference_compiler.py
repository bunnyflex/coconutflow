"""Hugging Face Inference Node Compiler — runs HF model inference."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class HuggingFaceInferenceNodeCompiler(BaseNodeCompiler):
    """
    Compiler for Hugging Face Inference nodes.

    Runs inference on 600k+ models from Hugging Face Hub.
    Supports text generation, embeddings, classification, etc.

    API: https://huggingface.co/docs/api-inference/
    """

    @property
    def node_type(self) -> str:
        return "huggingface_inference"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Compile Hugging Face Inference node configuration.

        Returns a dict that the execution engine will use to:
        1. Resolve credential at runtime
        2. Make API call to Hugging Face Inference API
        3. Return normalized output

        Args:
            node: FlowNode with huggingface_inference config
            context: Optional compilation context (unused)

        Returns:
            Compiled node dict with model_id, task, parameters, input_key

        Raises:
            ValueError: If huggingface_inference config is missing
        """
        config = node.config.huggingface_inference

        if not config:
            raise ValueError(f"Node '{node.id}' missing huggingface_inference configuration")

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "model_id": config.model_id,
            "task": config.task,
            "parameters": config.parameters,
            "input_key": config.input_key,
            "credential_id": config.credential_id,
        }
