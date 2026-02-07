import { useCallback, useMemo, useRef, useState, type DragEvent } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type ReactFlowInstance,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore, type FlowNodeData } from '../../store/flowStore';
import type { NodeType, NodeStatus } from '../../types/flow';
import { nodeTypes } from '../nodes';
import Toolbar from './Toolbar';
import ContextMenu from './ContextMenu';

// Nodes that can only be sources (no input handle)
const SOURCE_ONLY: Set<NodeType> = new Set(['input']);
// Nodes that can only be targets (no output handle)
const TARGET_ONLY: Set<NodeType> = new Set(['output']);

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

export default function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const isRunning = useFlowStore((s) => s.isRunning);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Build a lookup for node status by id (for edge styling)
  const nodeStatusMap = useMemo(() => {
    const map = new Map<string, NodeStatus>();
    for (const n of nodes) {
      map.set(n.id, (n.data as FlowNodeData).status);
    }
    return map;
  }, [nodes]);

  // Build a lookup for node type by id
  const nodeTypeMap = useMemo(() => {
    const map = new Map<string, NodeType>();
    for (const n of nodes) {
      map.set(n.id, (n.data as FlowNodeData).nodeType);
    }
    return map;
  }, [nodes]);

  // Style edges based on execution state
  const styledEdges: Edge[] = useMemo(() => {
    if (!isRunning && !nodes.some((n) => (n.data as FlowNodeData).status !== 'idle')) {
      return edges;
    }
    return edges.map((edge) => {
      const sourceStatus = nodeStatusMap.get(edge.source);
      const targetStatus = nodeStatusMap.get(edge.target);

      if (sourceStatus === 'running' || targetStatus === 'running') {
        return {
          ...edge,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
        };
      }
      if (sourceStatus === 'completed' && targetStatus === 'completed') {
        return {
          ...edge,
          style: { stroke: '#22c55e', strokeWidth: 2 },
        };
      }
      if (sourceStatus === 'completed') {
        return {
          ...edge,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        };
      }
      if (sourceStatus === 'error' || targetStatus === 'error') {
        return {
          ...edge,
          style: { stroke: '#ef4444', strokeWidth: 2 },
        };
      }
      return edge;
    });
  }, [edges, nodeStatusMap, isRunning, nodes]);

  // Validate connections: no self-loops, no duplicate edges, enforce DAG
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const { source, target } = connection;
      if (!source || !target) return false;
      // No self-loops
      if (source === target) return false;
      // No duplicate edges
      if (edges.some((e) => e.source === source && e.target === target)) return false;
      // Don't connect to a source-only node's input
      const targetType = nodeTypeMap.get(target);
      if (targetType && SOURCE_ONLY.has(targetType)) return false;
      // Don't connect from a target-only node's output
      const sourceType = nodeTypeMap.get(source);
      if (sourceType && TARGET_ONLY.has(sourceType)) return false;
      // Cycle detection: check if target can reach source via existing edges
      const visited = new Set<string>();
      const stack = [target];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === source) return false; // would create a cycle
        if (visited.has(current)) continue;
        visited.add(current);
        for (const e of edges) {
          if (e.source === current) stack.push(e.target);
        }
      }
      return true;
    },
    [edges, nodeTypeMap],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/agnoflow-node') as NodeType;
      if (!nodeType) return;

      const instance = reactFlowInstance.current;
      if (!instance) return;

      // screenToFlowPosition expects screen (client) coordinates, not offset
      const position = instance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(nodeType, position);
    },
    [addNode],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
  }, [setSelectedNode]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        nodeId: node.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          style: { stroke: '#6366f1', strokeWidth: 1.5 },
          type: 'smoothstep',
        }}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-gray-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#374151"
        />
        <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700" />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-gray-900 !border-gray-700 !rounded-lg"
        />
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          nodeId={contextMenu.nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
