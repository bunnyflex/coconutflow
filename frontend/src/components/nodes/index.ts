import InputNode from './InputNode';
import LLMAgentNode from './LLMAgentNode';
import WebSearchNode from './WebSearchNode';
import KnowledgeBaseNode from './KnowledgeBaseNode';
import ConditionalNode from './ConditionalNode';
import OutputNode from './OutputNode';

export const nodeTypes = {
  input: InputNode,
  llm_agent: LLMAgentNode,
  web_search: WebSearchNode,
  knowledge_base: KnowledgeBaseNode,
  conditional: ConditionalNode,
  output: OutputNode,
};
