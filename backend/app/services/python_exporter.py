"""
Python code generator for CoconutFlow workflows.

Converts FlowDefinition JSON into executable Python scripts using Agno SDK.
"""
from __future__ import annotations
from typing import Dict, List, Set
from datetime import datetime

from app.models.flow import FlowDefinition, FlowNode, NodeType


class PythonExporter:
    """Generates Python code from workflow definitions."""

    def __init__(self):
        self.imports: Set[str] = set()
        self.node_code: List[str] = []

    def generate(self, flow: FlowDefinition) -> str:
        """
        Generate Python code from workflow.

        Args:
            flow: FlowDefinition to convert

        Returns:
            Python code as string
        """
        self.imports.clear()
        self.node_code.clear()

        # Always import base requirements
        self.imports.add("import asyncio")
        self.imports.add("from agno.agent import Agent")

        # Topological sort (same as compiler)
        sorted_nodes = self._topological_sort(flow)

        # Generate code for each node
        for node in sorted_nodes:
            self._generate_node_code(node)

        # Build final script
        return self._build_script(flow)

    def _topological_sort(self, flow: FlowDefinition) -> List[FlowNode]:
        """Sort nodes in execution order."""
        # Build adjacency map
        graph = {node.id: [] for node in flow.nodes}
        in_degree = {node.id: 0 for node in flow.nodes}

        for edge in flow.edges:
            graph[edge.source].append(edge.target)
            in_degree[edge.target] += 1

        # Kahn's algorithm
        queue = [nid for nid in in_degree if in_degree[nid] == 0]
        sorted_ids = []

        while queue:
            current = queue.pop(0)
            sorted_ids.append(current)

            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Map back to nodes
        node_map = {n.id: n for n in flow.nodes}
        return [node_map[nid] for nid in sorted_ids]

    def _generate_node_code(self, node: FlowNode):
        """Generate code for a single node."""
        handlers = {
            NodeType.INPUT: self._gen_input,
            NodeType.AGENT: self._gen_agent,
            NodeType.TOOL: self._gen_web_search,  # Assuming web search is a tool type
            NodeType.KNOWLEDGE_BASE: self._gen_knowledge_base,
            NodeType.CONDITIONAL: self._gen_conditional,
            NodeType.OUTPUT: self._gen_output,
            NodeType.FIRECRAWL_SCRAPE: self._gen_firecrawl,
            NodeType.APIFY_ACTOR: self._gen_apify,
            NodeType.MCP_SERVER: self._gen_mcp,
            NodeType.HUGGINGFACE_INFERENCE: self._gen_huggingface,
        }

        handler = handlers.get(node.type)
        if handler:
            handler(node)

    def _gen_input(self, node: FlowNode):
        """Generate input node code."""
        self.node_code.append(f"    # {node.label}")
        self.node_code.append(f"    print(f'Input: {{user_input}}')")
        self.node_code.append(f"    {self._var_name(node.id)} = user_input")
        self.node_code.append("")

    def _gen_agent(self, node: FlowNode):
        """Generate LLM agent code."""
        self.imports.add("from agno.agent import Agent")

        if not node.config.agent:
            return

        config = node.config.agent
        model = f"{config.provider.value}:{config.model}"

        # Handle instructions
        if config.instructions:
            instr_str = "\\n".join(config.instructions)
        else:
            instr_str = config.system_prompt or "You are a helpful assistant."

        self.node_code.append(f"    # {node.label}")
        self.node_code.append(f"    agent_{self._var_name(node.id)} = Agent(")
        self.node_code.append(f"        name='{node.label}',")
        self.node_code.append(f"        model='{model}',")
        self.node_code.append(f"        instructions='{instr_str}',")
        self.node_code.append(f"    )")

        # Get upstream data
        upstream_var = self._get_upstream_var(node.id)
        self.node_code.append(f"    response_{self._var_name(node.id)} = await agent_{self._var_name(node.id)}.run(str({upstream_var}))")
        self.node_code.append(f"    {self._var_name(node.id)} = response_{self._var_name(node.id)}.content")
        self.node_code.append("")

    def _gen_web_search(self, node: FlowNode):
        """Generate web search code."""
        self.imports.add("from agno.tools.duckduckgo import DuckDuckGoTools")

        self.node_code.append(f"    # {node.label}")
        self.node_code.append(f"    search_tool = DuckDuckGoTools()")

        upstream_var = self._get_upstream_var(node.id)
        self.node_code.append(f"    results = search_tool.search(str({upstream_var}), max_results=5)")
        self.node_code.append(f"    {self._var_name(node.id)} = str(results)")
        self.node_code.append("")

    def _gen_knowledge_base(self, node: FlowNode):
        """Generate knowledge base code."""
        self.imports.add("from agno.knowledge import Knowledge")
        self.imports.add("from agno.vectordb.pgvector import PgVector")

        if not node.config.knowledge_base:
            return

        config = node.config.knowledge_base

        self.node_code.append(f"    # {node.label}")
        self.node_code.append(f"    kb_{self._var_name(node.id)} = Knowledge(")
        self.node_code.append(f"        name='{node.label}',")
        self.node_code.append(f"        vector_db=PgVector()")
        self.node_code.append(f"    )")

        # Add sources
        for source in config.sources:
            self.node_code.append(f"    await kb_{self._var_name(node.id)}.add_content_async(path='{source}')")

        upstream_var = self._get_upstream_var(node.id)
        self.node_code.append(f"    results = kb_{self._var_name(node.id)}.search(str({upstream_var}))")
        self.node_code.append(f"    {self._var_name(node.id)} = str(results)")
        self.node_code.append("")

    def _gen_conditional(self, node: FlowNode):
        """Generate conditional code."""
        if not node.config.conditional:
            return

        config = node.config.conditional
        condition = config.condition_expression or "true"

        self.node_code.append(f"    # {node.label} - Conditional")
        upstream_var = self._get_upstream_var(node.id)
        self.node_code.append(f"    # TODO: Evaluate condition: {condition}")
        self.node_code.append(f"    condition_result = True  # Placeholder")
        self.node_code.append(f"    {self._var_name(node.id)} = {upstream_var} if condition_result else None")
        self.node_code.append("")

    def _gen_output(self, node: FlowNode):
        """Generate output code."""
        upstream_var = self._get_upstream_var(node.id)

        self.node_code.append(f"    # {node.label}")
        self.node_code.append(f"    print(f'Output: {{{upstream_var}}}')")
        self.node_code.append(f"    return {upstream_var}")
        self.node_code.append("")

    def _gen_firecrawl(self, node: FlowNode):
        """Generate Firecrawl scrape code."""
        self.node_code.append(f"    # {node.label} - Firecrawl Scrape")
        self.node_code.append(f"    # TODO: Implement Firecrawl integration")
        self.node_code.append(f"    {self._var_name(node.id)} = 'Firecrawl result placeholder'")
        self.node_code.append("")

    def _gen_apify(self, node: FlowNode):
        """Generate Apify actor code."""
        self.node_code.append(f"    # {node.label} - Apify Actor")
        self.node_code.append(f"    # TODO: Implement Apify integration")
        self.node_code.append(f"    {self._var_name(node.id)} = 'Apify result placeholder'")
        self.node_code.append("")

    def _gen_mcp(self, node: FlowNode):
        """Generate MCP server code."""
        self.node_code.append(f"    # {node.label} - MCP Server")
        self.node_code.append(f"    # TODO: Implement MCP integration")
        self.node_code.append(f"    {self._var_name(node.id)} = 'MCP result placeholder'")
        self.node_code.append("")

    def _gen_huggingface(self, node: FlowNode):
        """Generate Hugging Face code."""
        self.node_code.append(f"    # {node.label} - Hugging Face")
        self.node_code.append(f"    # TODO: Implement Hugging Face integration")
        self.node_code.append(f"    {self._var_name(node.id)} = 'HuggingFace result placeholder'")
        self.node_code.append("")

    def _var_name(self, node_id: str) -> str:
        """Convert node ID to valid Python variable name."""
        return node_id.replace("-", "_").replace(".", "_")

    def _get_upstream_var(self, node_id: str) -> str:
        """Get variable name for upstream node (placeholder)."""
        # In real implementation, look up actual upstream node
        return "user_input"

    def _build_script(self, flow: FlowDefinition) -> str:
        """Build final Python script."""
        lines = []

        # Header
        lines.append("#!/usr/bin/env python3")
        lines.append('"""')
        lines.append(f"{flow.name}")
        lines.append("")
        lines.append(f"Description: {flow.description or 'No description'}")
        lines.append(f"Generated from CoconutFlow on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        lines.append('"""')
        lines.append("")

        # Imports
        for imp in sorted(self.imports):
            lines.append(imp)
        lines.append("")
        lines.append("")

        # Main function
        lines.append("async def run_workflow(user_input: str):")
        lines.append('    """Execute the workflow with given input."""')
        lines.extend(self.node_code)
        lines.append("")
        lines.append("")

        # CLI entrypoint
        lines.append('if __name__ == "__main__":')
        lines.append("    import sys")
        lines.append("    ")
        lines.append("    if len(sys.argv) < 2:")
        lines.append('        print("Usage: python workflow.py <input_text>")')
        lines.append("        sys.exit(1)")
        lines.append("    ")
        lines.append("    input_text = sys.argv[1]")
        lines.append("    result = asyncio.run(run_workflow(input_text))")
        lines.append('    print(f"\\nFinal Result: {result}")')

        return "\n".join(lines)
