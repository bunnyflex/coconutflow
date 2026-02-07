import React from 'react';

// CoconutFlow TypeScript types — matches PRD Section 10 Flow JSON Schema
// and aligns with backend Pydantic models in app/models/flow.py

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type NodeType =
  | 'input'
  | 'llm_agent'
  | 'web_search'
  | 'knowledge_base'
  | 'conditional'
  | 'output';

export type NodeStatus = 'idle' | 'pending' | 'running' | 'completed' | 'error';

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama';

export type DisplayFormat = 'text' | 'markdown' | 'json' | 'table';

export type InputType = 'text' | 'file' | 'url';

// ---------------------------------------------------------------------------
// Node Configs — one per node type
// ---------------------------------------------------------------------------

export interface InputNodeConfig {
  input_type: InputType;
  placeholder: string;
  value?: string;
  file_url?: string;
}

export interface LLMAgentNodeConfig {
  model_provider: ModelProvider;
  model_id: string;
  instructions: string;
  temperature: number;
  tools: string[];
  show_tool_calls: boolean;
  markdown: boolean;
}

export interface WebSearchNodeConfig {
  query_template: string;
  result_count: number;
}

export interface KnowledgeBaseNodeConfig {
  files: UploadedFile[];
  chunk_size: number;
  top_k: number;
  search_type: 'hybrid' | 'similarity' | 'keyword';
}

export interface ConditionalNodeConfig {
  condition: string;
  true_label: string;
  false_label: string;
}

export interface OutputNodeConfig {
  display_format: DisplayFormat;
  copy_to_clipboard: boolean;
}

export type NodeConfig =
  | InputNodeConfig
  | LLMAgentNodeConfig
  | WebSearchNodeConfig
  | KnowledgeBaseNodeConfig
  | ConditionalNodeConfig
  | OutputNodeConfig;

// ---------------------------------------------------------------------------
// Default configs for each node type
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIGS: Record<NodeType, NodeConfig> = {
  input: {
    input_type: 'text',
    placeholder: 'Enter your input...',
    value: '',
  } as InputNodeConfig,
  llm_agent: {
    model_provider: 'openai',
    model_id: 'gpt-4o',
    instructions: '',
    temperature: 0.7,
    tools: [],
    show_tool_calls: true,
    markdown: true,
  } as LLMAgentNodeConfig,
  web_search: {
    query_template: '',
    result_count: 5,
  } as WebSearchNodeConfig,
  knowledge_base: {
    files: [],
    chunk_size: 1000,
    top_k: 5,
    search_type: 'hybrid',
  } as KnowledgeBaseNodeConfig,
  conditional: {
    condition: '',
    true_label: 'True',
    false_label: 'False',
  } as ConditionalNodeConfig,
  output: {
    display_format: 'markdown',
    copy_to_clipboard: true,
  } as OutputNodeConfig,
};

// ---------------------------------------------------------------------------
// Model ID reference — PRD Section 6.4
// ---------------------------------------------------------------------------

export interface ModelOption {
  provider: ModelProvider;
  id: string;
  label: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o' },
  { provider: 'openai', id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { provider: 'openai', id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { provider: 'openai', id: 'o3-mini', label: 'O3 Mini' },
  { provider: 'anthropic', id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { provider: 'anthropic', id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { provider: 'google', id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { provider: 'google', id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { provider: 'groq', id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { provider: 'groq', id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  { provider: 'ollama', id: 'llama3.2', label: 'Llama 3.2 (Local)' },
  { provider: 'ollama', id: 'mistral', label: 'Mistral (Local)' },
  { provider: 'ollama', id: 'phi3', label: 'Phi-3 (Local)' },
];

// ---------------------------------------------------------------------------
// Flow graph primitives
// ---------------------------------------------------------------------------

export interface NodePosition {
  x: number;
  y: number;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: NodePosition;
  config: NodeConfig;
  label?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  source_handle: string;
  target: string;
  target_handle: string;
}

export interface FlowMetadata {
  created_at: string;
  updated_at: string;
  version: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata: FlowMetadata;
}

// ---------------------------------------------------------------------------
// Execution types
// ---------------------------------------------------------------------------

export interface NodeExecutionState {
  status: NodeStatus;
  output?: string;
  error?: string;
}

export interface WebSocketMessage {
  type: 'node_status' | 'flow_complete' | 'flow_error';
  node_id?: string;
  status?: NodeStatus;
  output?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// File upload
// ---------------------------------------------------------------------------

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Node sidebar metadata — used by the drag sidebar
// ---------------------------------------------------------------------------

export interface NodeTypeInfo {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'input_output' | 'processing' | 'tools';
}

import { ArrowDownToLine, ArrowUpFromLine, Bot, GitBranch, Globe, BookOpen } from 'lucide-react';

const ic = (C: React.FC<{ className?: string }>) => React.createElement(C, { className: 'h-5 w-5 text-gray-400' });

export const NODE_TYPE_CATALOG: NodeTypeInfo[] = [
  {
    type: 'input',
    label: 'Input',
    description: 'Entry point for user data',
    icon: ic(ArrowDownToLine),
    category: 'input_output',
  },
  {
    type: 'output',
    label: 'Output',
    description: 'Displays the final result',
    icon: ic(ArrowUpFromLine),
    category: 'input_output',
  },
  {
    type: 'llm_agent',
    label: 'LLM Agent',
    description: 'Core AI processing node',
    icon: ic(Bot),
    category: 'processing',
  },
  {
    type: 'conditional',
    label: 'Conditional',
    description: 'If/else branching',
    icon: ic(GitBranch),
    category: 'processing',
  },
  {
    type: 'web_search',
    label: 'Web Search',
    description: 'Search the web for results',
    icon: ic(Globe),
    category: 'tools',
  },
  {
    type: 'knowledge_base',
    label: 'Knowledge Base',
    description: 'Upload documents for RAG',
    icon: ic(BookOpen),
    category: 'tools',
  },
];

// ---------------------------------------------------------------------------
// Chat types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
