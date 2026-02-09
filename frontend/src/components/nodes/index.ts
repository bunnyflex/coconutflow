import InputNode from './InputNode';
import LLMAgentNode from './LLMAgentNode';
import WebSearchNode from './WebSearchNode';
import KnowledgeBaseNode from './KnowledgeBaseNode';
import ConditionalNode from './ConditionalNode';
import OutputNode from './OutputNode';
import FirecrawlScrapeNode from './FirecrawlScrapeNode';
import ApifyActorNode from './ApifyActorNode';
import MCPServerNode from './MCPServerNode';
import HuggingFaceInferenceNode from './HuggingFaceInferenceNode';

export const nodeTypes = {
  input: InputNode,
  llm_agent: LLMAgentNode,
  web_search: WebSearchNode,
  knowledge_base: KnowledgeBaseNode,
  conditional: ConditionalNode,
  output: OutputNode,
  firecrawl_scrape: FirecrawlScrapeNode,
  apify_actor: ApifyActorNode,
  mcp_server: MCPServerNode,
  huggingface_inference: HuggingFaceInferenceNode,
};
