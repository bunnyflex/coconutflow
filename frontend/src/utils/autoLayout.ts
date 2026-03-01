import type { FlowMutation, AddNodeMutation } from '../types/mutations';

const NODE_WIDTH = 250;
const NODE_HEIGHT = 100;
const H_GAP = 100;
const V_GAP = 60;
const START_X = 80;
const START_Y = 80;

/**
 * Assigns positions to add_node mutations based on their edge connections.
 * Simple left-to-right layout: topological depth → x, index at depth → y.
 */
export function autoLayoutMutations(mutations: FlowMutation[]): FlowMutation[] {
  const addNodes = mutations.filter((m): m is AddNodeMutation => m.type === 'add_node');
  const addEdges = mutations.filter((m) => m.type === 'add_edge');

  if (addNodes.length === 0) return mutations;

  // Build adjacency from edges
  const children: Record<string, string[]> = {};
  const parents: Record<string, string[]> = {};
  for (const node of addNodes) {
    children[node.node_id] = [];
    parents[node.node_id] = [];
  }
  for (const edge of addEdges) {
    if ('source' in edge && 'target' in edge) {
      const src = edge.source as string;
      const tgt = edge.target as string;
      if (children[src]) children[src].push(tgt);
      if (parents[tgt]) parents[tgt].push(src);
    }
  }

  // Find roots (no parents)
  let roots = addNodes.filter((n) => parents[n.node_id].length === 0).map((n) => n.node_id);
  if (roots.length === 0 && addNodes.length > 0) {
    roots = [addNodes[0].node_id];
  }

  // BFS to assign depth
  const depth: Record<string, number> = {};
  const queue = [...roots];
  for (const r of roots) depth[r] = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of children[current] || []) {
      if (depth[child] === undefined || depth[child] < depth[current] + 1) {
        depth[child] = depth[current] + 1;
        queue.push(child);
      }
    }
  }

  // Assign any unvisited nodes
  for (const node of addNodes) {
    if (depth[node.node_id] === undefined) depth[node.node_id] = 0;
  }

  // Group by depth, assign y positions
  const depthGroups: Record<number, string[]> = {};
  for (const [nodeId, d] of Object.entries(depth)) {
    if (!depthGroups[d]) depthGroups[d] = [];
    depthGroups[d].push(nodeId);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const [d, nodeIds] of Object.entries(depthGroups)) {
    const col = parseInt(d, 10);
    const x = START_X + col * (NODE_WIDTH + H_GAP);
    for (let i = 0; i < nodeIds.length; i++) {
      const y = START_Y + i * (NODE_HEIGHT + V_GAP);
      positions[nodeIds[i]] = { x, y };
    }
  }

  // Apply positions to add_node mutations
  return mutations.map((m) => {
    if (m.type === 'add_node' && positions[m.node_id]) {
      return { ...m, position: positions[m.node_id] };
    }
    return m;
  });
}
