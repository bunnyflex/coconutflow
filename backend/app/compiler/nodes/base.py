"""
Abstract base class for node compilers.

This is the plugin interface per the PRD risk mitigation strategy.
Each node type (agent, team, tool, knowledge_base, etc.) gets its own
compiler class that extends BaseNodeCompiler and implements compile().

To add support for a new node type:
  1. Create a new file in app/compiler/nodes/ (e.g. agent_compiler.py)
  2. Subclass BaseNodeCompiler
  3. Implement the compile() method
  4. Register the compiler in the node compiler registry
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.models.flow import FlowNode


class BaseNodeCompiler(ABC):
    """
    Abstract base class that every node compiler must extend.

    The compile() method receives a FlowNode (from the canvas JSON)
    and returns a runtime-ready object (e.g. an Agno Agent, Team,
    Tool instance, or any intermediate representation).
    """

    @abstractmethod
    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> Any:
        """
        Compile a FlowNode into its runtime representation.

        Args:
            node: The FlowNode from the flow definition JSON.
            context: Optional dict of already-compiled sibling nodes,
                     shared config, or execution context. This allows
                     nodes to reference each other (e.g. an Agent node
                     referencing compiled Tool nodes).

        Returns:
            A runtime-ready object. The exact type depends on the
            node type being compiled.

        Raises:
            ValueError: If the node config is invalid or incomplete.
            NotImplementedError: If a required feature is not yet supported.
        """
        ...

    def validate(self, node: FlowNode) -> list[str]:
        """
        Optional validation hook. Returns a list of error messages.
        An empty list means the node config is valid.

        Subclasses can override this to provide node-type-specific
        validation before compilation.
        """
        return []

    @property
    @abstractmethod
    def node_type(self) -> str:
        """Return the NodeType string this compiler handles."""
        ...
