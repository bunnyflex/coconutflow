/**
 * Transforms the frontend FlowDefinition into the backend-expected format.
 *
 * The frontend uses flat node configs (e.g. LLMAgentNodeConfig with model_provider, model_id)
 * while the backend uses nested Pydantic models (e.g. NodeConfig.agent: AgentConfig).
 */

import type {
  FlowDefinition,
  FlowNode,
  NodeConfig,
  InputNodeConfig,
  LLMAgentNodeConfig,
  WebSearchNodeConfig,
  KnowledgeBaseNodeConfig,
  ConditionalNodeConfig,
} from '../types/flow';

/** Backend node type mapping */
const NODE_TYPE_MAP: Record<string, string> = {
  input: 'input',
  llm_agent: 'agent',
  web_search: 'tool',
  knowledge_base: 'knowledge_base',
  conditional: 'conditional',
  output: 'output',
};

/** Transform a flat frontend config into the nested backend config structure */
function transformNodeConfig(nodeType: string, config: NodeConfig): Record<string, unknown> {
  switch (nodeType) {
    case 'input': {
      const cfg = config as InputNodeConfig;
      return {
        input_output: {
          label: cfg.placeholder ?? '',
          data_type: cfg.input_type ?? 'text',
        },
      };
    }
    case 'llm_agent': {
      const cfg = config as LLMAgentNodeConfig;
      return {
        agent: {
          name: 'Agent',
          provider: cfg.model_provider,
          model: cfg.model_id,
          system_prompt: cfg.instructions,
          temperature: cfg.temperature,
          tools: cfg.tools,
          show_tool_calls: cfg.show_tool_calls,
          markdown: cfg.markdown,
        },
      };
    }
    case 'web_search': {
      const cfg = config as WebSearchNodeConfig;
      return {
        tool: {
          tool_type: 'DuckDuckGoSearch',
          parameters: {
            query_template: cfg.query_template,
            result_count: cfg.result_count,
          },
        },
      };
    }
    case 'knowledge_base': {
      const cfg = config as KnowledgeBaseNodeConfig;
      return {
        knowledge_base: {
          kb_type: 'document',
          vector_db: 'pgvector',
          sources: cfg.sources || [],
          chunk_size: cfg.chunk_size,
          chunk_overlap: cfg.chunk_overlap || 200,
        },
      };
    }
    case 'conditional': {
      const cfg = config as ConditionalNodeConfig;
      return {
        conditional: {
          condition_expression: cfg.condition,
          true_label: cfg.true_label,
          false_label: cfg.false_label,
        },
      };
    }
    case 'output':
      return {
        input_output: {
          label: 'Output',
          data_type: 'text',
        },
      };
    default:
      return {};
  }
}

function transformNode(node: FlowNode): Record<string, unknown> {
  return {
    id: node.id,
    type: NODE_TYPE_MAP[node.type] ?? node.type,
    position: node.position,
    config: transformNodeConfig(node.type, node.config),
    label: node.label ?? '',
  };
}

/**
 * Convert the frontend FlowDefinition into the format expected by the
 * backend's Pydantic FlowDefinition model.
 */
export function transformFlowForBackend(flow: FlowDefinition): Record<string, unknown> {
  return {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    nodes: flow.nodes.map(transformNode),
    edges: flow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      source_handle: e.source_handle,
      target: e.target,
      target_handle: e.target_handle,
    })),
    metadata: flow.metadata,
  };
}
