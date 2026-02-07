"""
Flow Compilation Pipeline.

Receives a FlowDefinition (the JSON from the frontend canvas),
validates it, topologically sorts the nodes, compiles each node
via its registered NodeCompiler, and returns a runtime-ready
execution graph.
"""

from __future__ import annotations

from typing import Any

from app.models.flow import FlowDefinition
from app.compiler.nodes import register_all_compilers


class FlowCompiler:
    """Compiles a FlowDefinition into an executable graph."""

    def __init__(self) -> None:
        self._compilers: dict[str, Any] = {}
        register_all_compilers(self)

    def register_compiler(self, node_type: str, compiler: Any) -> None:
        self._compilers[node_type] = compiler

    def compile(self, flow: FlowDefinition) -> dict[str, Any]:
        errors = self._validate(flow)
        if errors:
            raise ValueError(f"Flow validation failed: {errors}")

        adjacency = self._build_adjacency(flow)
        sorted_node_ids = self._topological_sort(flow, adjacency)

        compiled_nodes: dict[str, Any] = {}
        node_map = {n.id: n for n in flow.nodes}

        for node_id in sorted_node_ids:
            node = node_map[node_id]
            compiler = self._compilers.get(node.type.value)
            if compiler:
                compiled_nodes[node_id] = compiler.compile(node, context=compiled_nodes)
            else:
                compiled_nodes[node_id] = {"node_id": node.id, "node_type": node.type.value, "raw": True}

        return {
            "flow_id": flow.id,
            "flow_name": flow.name,
            "compiled_nodes": compiled_nodes,
            "edges": [edge.model_dump() for edge in flow.edges],
            "adjacency": adjacency,
            "execution_order": sorted_node_ids,
        }

    def _validate(self, flow: FlowDefinition) -> list[str]:
        errors: list[str] = []
        if not flow.nodes:
            errors.append("Flow must have at least one node.")
        node_ids = {n.id for n in flow.nodes}
        for edge in flow.edges:
            if edge.source not in node_ids:
                errors.append(f"Edge {edge.id} references unknown source: {edge.source}")
            if edge.target not in node_ids:
                errors.append(f"Edge {edge.id} references unknown target: {edge.target}")
        return errors

    def _build_adjacency(self, flow: FlowDefinition) -> dict[str, list[str]]:
        adjacency: dict[str, list[str]] = {n.id: [] for n in flow.nodes}
        for edge in flow.edges:
            adjacency[edge.source].append(edge.target)
        return adjacency

    def _topological_sort(self, flow: FlowDefinition, adjacency: dict[str, list[str]]) -> list[str]:
        in_degree: dict[str, int] = {n.id: 0 for n in flow.nodes}
        for edge in flow.edges:
            in_degree[edge.target] += 1

        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        sorted_ids: list[str] = []

        while queue:
            current = queue.pop(0)
            sorted_ids.append(current)
            for neighbor in adjacency.get(current, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(sorted_ids) != len(flow.nodes):
            raise ValueError("Flow contains a cycle. Topological sort is not possible.")

        return sorted_ids
