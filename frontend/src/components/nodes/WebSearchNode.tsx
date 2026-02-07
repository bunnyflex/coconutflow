import { Handle, Position } from 'reactflow';
import { Globe } from 'lucide-react';
import type { FlowNodeData } from '../../store/flowStore';
import type { WebSearchNodeConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function WebSearchNode({ data }: { data: FlowNodeData }) {
  const config = data.config as WebSearchNodeConfig;

  return (
    <NodeShell
      icon={<Globe className="h-4 w-4 text-gray-400" />}
      label={data.label}
      status={data.status}
      subtitle={`${config.result_count} results`}
      error={data.error}
    >
      {config.query_template && (
        <div className="text-xs text-gray-400 italic truncate max-w-[160px]">
          {config.query_template}
        </div>
      )}
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
    </NodeShell>
  );
}
