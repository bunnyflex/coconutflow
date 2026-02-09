import { Handle, Position } from 'reactflow';
import { Blocks } from 'lucide-react';
import type { FlowNodeData } from '../../store/flowStore';
import type { MCPServerConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function MCPServerNode({ data }: { data: FlowNodeData }) {
  const config = data.config as MCPServerConfig;

  return (
    <NodeShell
      icon={<Blocks className="h-4 w-4" />}
      nodeType="mcp_server"
      label={data.label}
      status={data.status}
      subtitle={config.server_type || 'stdio'}
      error={data.error}
      handles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="!h-3 !w-3 !border-2 !border-gray-600 !bg-indigo-400"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className="!h-3 !w-3 !border-2 !border-gray-600 !bg-indigo-400"
          />
        </>
      }
    >
      {config.server_name && (
        <div className="text-xs text-gray-400 italic truncate">
          {config.server_name}
        </div>
      )}
    </NodeShell>
  );
}
