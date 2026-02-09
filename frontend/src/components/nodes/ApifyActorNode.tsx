import { Handle, Position } from 'reactflow';
import { PlayCircle } from 'lucide-react';
import type { FlowNodeData } from '../../store/flowStore';
import type { ApifyActorConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function ApifyActorNode({ data }: { data: FlowNodeData }) {
  const config = data.config as ApifyActorConfig;

  return (
    <NodeShell
      icon={<PlayCircle className="h-4 w-4" />}
      nodeType="apify_actor"
      label={data.label}
      status={data.status}
      subtitle={`max ${config.max_items} items`}
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
      {config.actor_id && (
        <div className="text-xs text-gray-400 italic truncate">
          {config.actor_id}
        </div>
      )}
    </NodeShell>
  );
}
