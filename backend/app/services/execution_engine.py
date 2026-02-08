"""
Runtime Execution Engine.

Walks a compiled execution graph node-by-node, calls Agno agents,
and yields streaming events for the WebSocket.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, AsyncIterator

logger = logging.getLogger(__name__)


class ExecutionEvent:
    """A single event emitted during flow execution."""

    def __init__(
        self,
        event_type: str,
        node_id: str | None = None,
        flow_id: str | None = None,
        data: Any = None,
        message: str = "",
    ) -> None:
        self.type = event_type
        self.node_id = node_id
        self.flow_id = flow_id
        self.data = data
        self.message = message
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "node_id": self.node_id,
            "flow_id": self.flow_id,
            "data": self.data,
            "message": self.message,
            "timestamp": self.timestamp,
        }


def _get_upstream_output(
    node_id: str,
    edges: list[dict[str, Any]],
    node_outputs: dict[str, str],
) -> str:
    """Collect outputs from all upstream nodes connected to this node."""
    upstream_ids = [e["source"] for e in edges if e["target"] == node_id]
    parts = [node_outputs[uid] for uid in upstream_ids if uid in node_outputs]
    if len(parts) == 1:
        return parts[0]
    return "\n\n".join(f"[Input from {uid}]:\n{node_outputs[uid]}" for uid in upstream_ids if uid in node_outputs)


class ExecutionEngine:
    """Executes a compiled flow graph and yields streaming events."""

    def __init__(self, condition_evaluator=None):
        self._condition_evaluator = condition_evaluator

    async def execute(
        self,
        execution_graph: dict[str, Any],
        user_input: str = "",
    ) -> AsyncIterator[ExecutionEvent]:
        flow_id = execution_graph.get("flow_id", "unknown")
        execution_order: list[str] = execution_graph.get("execution_order", [])
        compiled_nodes: dict[str, Any] = execution_graph.get("compiled_nodes", {})
        edges: list[dict[str, Any]] = execution_graph.get("edges", [])

        node_outputs: dict[str, str] = {}
        self._branch_decisions: dict[str, str] = {}
        skipped_nodes: set[str] = set()

        yield ExecutionEvent(event_type="flow_start", flow_id=flow_id)

        for node_id in execution_order:
            compiled = compiled_nodes.get(node_id, {})
            node_type = compiled.get("node_type", "unknown")

            # Check if this node should be skipped due to branching
            if self._should_skip(node_id, edges, skipped_nodes):
                skipped_nodes.add(node_id)
                yield ExecutionEvent(event_type="node_skipped", node_id=node_id, flow_id=flow_id)
                continue

            yield ExecutionEvent(event_type="node_start", node_id=node_id, flow_id=flow_id)

            try:
                result = await self._execute_node(
                    node_id, node_type, compiled, edges, node_outputs, user_input
                )
                node_outputs[node_id] = result

                yield ExecutionEvent(
                    event_type="node_output",
                    node_id=node_id,
                    flow_id=flow_id,
                    data=result,
                )
                yield ExecutionEvent(event_type="node_complete", node_id=node_id, flow_id=flow_id)

            except Exception as e:
                logger.exception("Node '%s' failed", node_id)
                yield ExecutionEvent(
                    event_type="error",
                    node_id=node_id,
                    flow_id=flow_id,
                    message=str(e),
                )
                return

        yield ExecutionEvent(
            event_type="flow_complete",
            flow_id=flow_id,
            data=node_outputs.get(execution_order[-1], "") if execution_order else "",
        )

    def _should_skip(
        self,
        node_id: str,
        edges: list[dict[str, Any]],
        skipped_nodes: set[str],
    ) -> bool:
        """Check if a node should be skipped because it's on a non-taken branch.

        A node is skipped if ALL its incoming edges come from either:
        1. A conditional node via the non-taken branch handle, or
        2. An already-skipped node (cascading skip).
        """
        incoming = [e for e in edges if e["target"] == node_id]
        if not incoming:
            return False  # Root nodes always run

        for edge in incoming:
            source = edge["source"]
            source_handle = edge.get("source_handle")

            # If any incoming edge is from a non-skipped, non-conditional source, run the node
            if source not in self._branch_decisions and source not in skipped_nodes:
                return False

            # If source is a conditional, check if this edge is on the taken branch
            if source in self._branch_decisions:
                taken_branch = self._branch_decisions[source]
                if source_handle == taken_branch or source_handle is None:
                    return False  # This edge is on the taken branch

            # If source was skipped, this edge doesn't count as "live"
            # Continue checking other edges

        # All incoming edges are from skipped nodes or non-taken branches
        return True

    async def _execute_node(
        self,
        node_id: str,
        node_type: str,
        compiled: dict[str, Any],
        edges: list[dict[str, Any]],
        node_outputs: dict[str, str],
        user_input: str,
    ) -> str:
        """Execute a single compiled node and return its output string."""

        if node_type == "input":
            return user_input or compiled.get("value", "")

        if node_type == "output":
            return _get_upstream_output(node_id, edges, node_outputs)

        if node_type in ("agent", "web_search"):
            agent = compiled.get("agent")
            if agent is None:
                raise ValueError(f"Node '{node_id}' has no compiled agent")

            upstream = _get_upstream_output(node_id, edges, node_outputs)
            response = await agent.arun(upstream)
            return response.content or ""

        if node_type == "conditional":
            return await self._execute_conditional(node_id, compiled, edges, node_outputs)

        if node_type == "knowledge_base":
            return await self._execute_knowledge_base(node_id, compiled, edges, node_outputs)

        return f"[Unhandled node type: {node_type}]"

    async def _execute_conditional(
        self,
        node_id: str,
        compiled: dict[str, Any],
        edges: list[dict[str, Any]],
        node_outputs: dict[str, str],
    ) -> str:
        """Evaluate a condition. Returns upstream data; stores branch decision."""
        upstream = _get_upstream_output(node_id, edges, node_outputs)
        condition = compiled.get("condition", "")

        if self._condition_evaluator:
            # Test-injectable evaluator
            branch = self._condition_evaluator(upstream, condition)
        else:
            from agno.agent import Agent
            from agno.models.openai import OpenAIChat

            evaluator = Agent(
                model=OpenAIChat(id="gpt-4o-mini"),
                instructions=(
                    "You are a condition evaluator. Given the context and condition below, "
                    "respond with ONLY 'true' or 'false'. Nothing else.\n\n"
                    f"Condition: {condition}"
                ),
            )
            resp = await evaluator.arun(upstream)
            result = (resp.content or "").strip().lower()
            branch = "true" if result.startswith("true") else "false"

        self._branch_decisions[node_id] = branch
        return upstream

    async def _execute_knowledge_base(
        self,
        node_id: str,
        compiled: dict[str, Any],
        edges: list[dict[str, Any]],
        node_outputs: dict[str, str],
    ) -> str:
        """Execute a Knowledge Base RAG query using an Agno Agent with Knowledge."""
        knowledge = compiled.get("knowledge")

        if knowledge is None:
            # Fallback: return placeholder if KB wasn't built (e.g. missing DATABASE_URL)
            error = compiled.get("knowledge_error", "Knowledge base not configured")
            return f"[Knowledge Base unavailable: {error}]"

        # Load documents asynchronously if sources are provided
        sources = compiled.get("sources", [])
        if sources:
            from app.services.source_detector import SourceDetector, SourceType

            logger.info(f"Loading {len(sources)} sources into knowledge base...")
            loaded_count = 0
            for source in sources:
                try:
                    source_type = SourceDetector.detect(source)

                    if source_type == SourceType.FILE:
                        await knowledge.add_content_async(path=source)
                    elif source_type == SourceType.WEBSITE:
                        await knowledge.add_content_async(url=source)
                    elif source_type == SourceType.YOUTUBE:
                        await knowledge.add_content_async(url=source)

                    logger.info(f"Loaded {source_type.value}: {source}")
                    loaded_count += 1
                except Exception as e:
                    logger.warning(f"Failed to load source '{source}': {e}")
                    # Continue with remaining sources

            if loaded_count > 0:
                logger.info(f"Successfully loaded {loaded_count}/{len(sources)} sources")
            else:
                logger.warning("No sources loaded successfully")

        from agno.agent import Agent
        from agno.models.openai import OpenAIChat

        upstream = _get_upstream_output(node_id, edges, node_outputs)

        # Create an agent with the knowledge base attached for RAG
        rag_agent = Agent(
            model=OpenAIChat(id="gpt-4o-mini"),
            knowledge=knowledge,
            instructions=(
                "You are a helpful assistant. Answer the user's question using the "
                "knowledge base provided. If you cannot find the answer in the knowledge "
                "base, say so clearly."
            ),
            search_knowledge=True,
        )

        # Load the knowledge base (idempotent — skips if already loaded)
        try:
            rag_agent.knowledge.load(recreate=False)  # type: ignore[union-attr]
        except Exception as e:
            logger.warning("KB load failed for node '%s': %s", node_id, e)

        resp = await rag_agent.arun(upstream)
        return resp.content or ""
