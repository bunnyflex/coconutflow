import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';
import type { FlowNodeData } from '../../store/flowStore';
import type { ConditionalNodeConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function ConditionalNode({ data }: { data: FlowNodeData }) {
  const config = data.config as ConditionalNodeConfig;

  return (
    <NodeShell icon={<GitBranch className="h-4 w-4 text-gray-400" />} label={data.label} status={data.status} error={data.error}>
      {config.condition ? (
        <div className="text-xs text-gray-400 italic truncate max-w-[160px]">
          {config.condition}
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">No condition set</div>
      )}

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!h-3 !w-3 !border-2 !border-gray-600 !bg-indigo-400"
      />

      {/* True output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '35%' }}
        className="!h-3 !w-3 !border-2 !border-gray-600 !bg-green-400"
      />
      <div className="absolute right-[-40px] top-[28%] text-[10px] font-medium text-green-400">
        {config.true_label}
      </div>

      {/* False output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '65%' }}
        className="!h-3 !w-3 !border-2 !border-gray-600 !bg-red-400"
      />
      <div className="absolute right-[-40px] top-[58%] text-[10px] font-medium text-red-400">
        {config.false_label}
      </div>
    </NodeShell>
  );
}
