"""Knowledge Base Node Compiler — configures RAG with PgVector."""

from __future__ import annotations

import os
from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class KnowledgeBaseNodeCompiler(BaseNodeCompiler):

    @property
    def node_type(self) -> str:
        return "knowledge_base"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        _ = context
        kb_cfg = node.config.knowledge_base
        if not kb_cfg:
            raise ValueError(f"Node '{node.id}' missing knowledge_base configuration")

        compiled: dict[str, Any] = {
            "node_id": node.id,
            "node_type": self.node_type,
            "kb_type": kb_cfg.kb_type,
            "vector_db": kb_cfg.vector_db,
            "sources": kb_cfg.sources,
            "chunk_size": kb_cfg.chunk_size,
            "chunk_overlap": kb_cfg.chunk_overlap,
        }

        # If PgVector is configured and sources are available, create an Agno
        # Knowledge object that the execution engine can use for RAG queries.
        if kb_cfg.vector_db == "pgvector" and kb_cfg.sources:
            try:
                knowledge = self._build_pgvector_knowledge(kb_cfg)
                compiled["knowledge"] = knowledge
            except Exception as e:
                # Non-fatal: fall back to placeholder RAG if deps are missing
                compiled["knowledge_error"] = str(e)

        return compiled

    @staticmethod
    def _build_pgvector_knowledge(kb_cfg: Any) -> Any:
        """Create an Agno Knowledge object backed by PgVector."""
        from agno.knowledge.pdf import PDFKnowledgeBase, PDFReader
        from agno.vectordb.pgvector import PgVector

        db_url = os.environ.get("DATABASE_URL", "")
        if not db_url:
            raise RuntimeError("DATABASE_URL not set — cannot initialise PgVector")

        vector_db = PgVector(
            table_name="kb_embeddings",
            db_url=db_url,
        )

        # Build the knowledge base from uploaded PDF sources
        knowledge = PDFKnowledgeBase(
            path=kb_cfg.sources,
            vector_db=vector_db,
            reader=PDFReader(chunk_size=kb_cfg.chunk_size),
        )

        return knowledge
