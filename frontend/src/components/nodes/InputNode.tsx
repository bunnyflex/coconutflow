import { Handle, Position } from 'reactflow';
import type { FlowNodeData } from '../../store/flowStore';
import type { InputNodeConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function InputNode({ data }: { data: FlowNodeData }) {
  const config = data.config as InputNodeConfig;

  return (
    <NodeShell icon="📥" label={data.label} status={data.status} subtitle={config.input_type} error={data.error}>
      <div className="text-xs text-gray-400 italic truncate max-w-[160px]">
        {config.value || config.placeholder}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-3 !w-3 !border-2 !border-gray-600 !bg-indigo-400"
      />
    </NodeShell>
  );
}
