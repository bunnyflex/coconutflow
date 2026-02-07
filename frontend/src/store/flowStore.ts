import { create } from 'zustand';
import {
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import type {
  NodeType,
  NodeConfig,
  NodeStatus,
  FlowDefinition,
  ChatMessage,
} from '../types/flow';

// ---------------------------------------------------------------------------
// React Flow node data shape
// ---------------------------------------------------------------------------

export interface FlowNodeData {
  nodeType: NodeType;
  label: string;
  config: NodeConfig;
  status: NodeStatus;
  output?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Undo history entry
// ---------------------------------------------------------------------------

interface HistoryEntry {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

interface FlowState {
  // Flow metadata
  flowId: string | null;
  flowName: string;
  flowDescription: string;

  // React Flow graph data
  nodes: Node<FlowNodeData>[];
  edges: Edge[];

  // UI state
  selectedNodeId: string | null;

  // Execution state
  isRunning: boolean;

  // Chat state
  chatMessages: ChatMessage[];
  isChatOpen: boolean;

  // Undo history
  undoStack: HistoryEntry[];

  // --- Node & edge mutations (React Flow callbacks) ---
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // --- Custom actions ---
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  updateNodeConfig: (nodeId: string, config: NodeConfig) => void;
  setSelectedNode: (nodeId: string | null) => void;

  // Execution
  updateNodeStatus: (nodeId: string, status: NodeStatus, output?: string, error?: string) => void;
  resetExecution: () => void;
  setIsRunning: (running: boolean) => void;

  // Flow persistence
  loadFlow: (flow: FlowDefinition) => void;
  clearFlow: () => void;
  setFlowMeta: (name: string, description: string) => void;
  setFlowId: (id: string) => void;
  getFlowDefinition: () => FlowDefinition;

  // Chat actions
  addChatMessage: (role: ChatMessage['role'], content: string) => void;
  clearChat: () => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;

  // Undo
  pushUndo: () => void;
  undo: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nodeCounter = 0;

function generateNodeId(): string {
  nodeCounter += 1;
  return `node_${Date.now()}_${nodeCounter}`;
}

function generateEdgeId(source: string, target: string): string {
  return `edge_${source}_${target}_${Date.now()}`;
}

function getDefaultConfig(type: NodeType): NodeConfig {
  // Inline defaults matching DEFAULT_CONFIGS from types/flow.ts
  const defaults: Record<NodeType, NodeConfig> = {
    input: { input_type: 'text', placeholder: 'Enter your input...', value: '' },
    llm_agent: {
      model_provider: 'openai',
      model_id: 'gpt-4o',
      instructions: '',
      temperature: 0.7,
      tools: [],
      show_tool_calls: true,
      markdown: true,
    },
    web_search: { query_template: '', result_count: 5 },
    knowledge_base: { files: [], chunk_size: 1000, top_k: 5, search_type: 'hybrid' },
    conditional: { condition: '', true_label: 'True', false_label: 'False' },
    output: { display_format: 'markdown', copy_to_clipboard: true },
  } as Record<NodeType, NodeConfig>;

  return defaults[type];
}

function getNodeLabel(type: NodeType): string {
  const labels: Record<NodeType, string> = {
    input: 'Input',
    llm_agent: 'LLM Agent',
    web_search: 'Web Search',
    knowledge_base: 'Knowledge Base',
    conditional: 'Conditional',
    output: 'Output',
  };
  return labels[type];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFlowStore = create<FlowState>((set, get) => ({
  // Flow metadata
  flowId: null,
  flowName: 'Untitled Flow',
  flowDescription: '',

  // React Flow data
  nodes: [],
  edges: [],

  // UI
  selectedNodeId: null,

  // Execution
  isRunning: false,

  // Chat
  chatMessages: [],
  isChatOpen: false,

  // Undo
  undoStack: [],

  // -----------------------------------------------------------------------
  // React Flow callbacks
  // -----------------------------------------------------------------------

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    const newEdge: Edge = {
      ...connection,
      id: generateEdgeId(connection.source!, connection.target!),
    } as Edge;
    set({ edges: addEdge(newEdge, get().edges) });
  },

  // -----------------------------------------------------------------------
  // Node actions
  // -----------------------------------------------------------------------

  addNode: (type, position) => {
    const id = generateNodeId();
    const newNode: Node<FlowNodeData> = {
      id,
      type, // maps to custom node component via nodeTypes
      position,
      data: {
        nodeType: type,
        label: getNodeLabel(type),
        config: getDefaultConfig(type),
        status: 'idle',
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  removeNode: (nodeId) => {
    get().pushUndo();
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  updateNodeConfig: (nodeId, config) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
      ),
    });
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  // -----------------------------------------------------------------------
  // Execution
  // -----------------------------------------------------------------------

  updateNodeStatus: (nodeId, status, output, error) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, status, output: output ?? n.data.output, error: error ?? n.data.error } }
          : n,
      ),
    });
  },

  resetExecution: () => {
    set({
      nodes: get().nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: 'idle' as NodeStatus, output: undefined, error: undefined },
      })),
      isRunning: false,
    });
  },

  setIsRunning: (running) => {
    set({ isRunning: running });
  },

  // -----------------------------------------------------------------------
  // Flow persistence
  // -----------------------------------------------------------------------

  loadFlow: (flow) => {
    const nodes: Node<FlowNodeData>[] = flow.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        nodeType: n.type,
        label: n.label ?? getNodeLabel(n.type),
        config: n.config,
        status: 'idle' as NodeStatus,
      },
    }));

    const edges: Edge[] = flow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.source_handle,
      target: e.target,
      targetHandle: e.target_handle,
    }));

    set({
      flowId: flow.id,
      flowName: flow.name,
      flowDescription: flow.description,
      nodes,
      edges,
      selectedNodeId: null,
      isRunning: false,
      undoStack: [],
    });
  },

  clearFlow: () => {
    get().pushUndo();
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isRunning: false,
    });
  },

  setFlowMeta: (name, description) => {
    set({ flowName: name, flowDescription: description });
  },

  setFlowId: (id) => {
    set({ flowId: id });
  },

  getFlowDefinition: (): FlowDefinition => {
    const state = get();
    return {
      id: state.flowId ?? crypto.randomUUID(),
      name: state.flowName,
      description: state.flowDescription,
      nodes: state.nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        config: n.data.config,
        label: n.data.label,
      })),
      edges: state.edges.map((e) => ({
        id: e.id,
        source: e.source,
        source_handle: e.sourceHandle ?? 'output',
        target: e.target,
        target_handle: e.targetHandle ?? 'input',
      })),
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  },

  // -----------------------------------------------------------------------
  // Chat
  // -----------------------------------------------------------------------

  addChatMessage: (role, content) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: crypto.randomUUID(),
          role,
          content,
          timestamp: Date.now(),
        },
      ],
    })),

  clearChat: () => set({ chatMessages: [] }),

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

  setChatOpen: (open) => set({ isChatOpen: open }),

  // -----------------------------------------------------------------------
  // Undo
  // -----------------------------------------------------------------------

  pushUndo: () => {
    const { nodes, edges, undoStack } = get();
    // Keep last 20 undo entries
    const newStack = [...undoStack, { nodes: structuredClone(nodes), edges: structuredClone(edges) }].slice(-20);
    set({ undoStack: newStack });
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    set({
      nodes: last.nodes,
      edges: last.edges,
      undoStack: undoStack.slice(0, -1),
    });
  },
}));
