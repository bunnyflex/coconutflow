/** Flow mutations returned by the AI chat backend. */

export type FlowMutation =
  | AddNodeMutation
  | RemoveNodeMutation
  | UpdateConfigMutation
  | AddEdgeMutation
  | RemoveEdgeMutation
  | UpdateNodeLabelMutation;

export interface AddNodeMutation {
  type: 'add_node';
  node_id: string;
  node_type: string;
  label?: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface RemoveNodeMutation {
  type: 'remove_node';
  node_id: string;
}

export interface UpdateConfigMutation {
  type: 'update_config';
  node_id: string;
  config: Record<string, unknown>;
}

export interface AddEdgeMutation {
  type: 'add_edge';
  source: string;
  target: string;
  source_handle?: string;
  target_handle?: string;
}

export interface RemoveEdgeMutation {
  type: 'remove_edge';
  edge_id?: string;
  source?: string;
  target?: string;
}

export interface UpdateNodeLabelMutation {
  type: 'update_label';
  node_id: string;
  label: string;
}

/** Response from /api/chat */
export interface ChatResponse {
  message: string;
  mutations?: FlowMutation[];
}
