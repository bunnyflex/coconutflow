import { Handle, Position } from 'reactflow';
import { Brain } from 'lucide-react';
import type { FlowNodeData } from '../../store/flowStore';
import type { HuggingFaceInferenceConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function HuggingFaceInferenceNode({ data }: { data: FlowNodeData }) {
  const config = data.config as HuggingFaceInferenceConfig;

  return (
    <NodeShell
      icon={<Brain className="h-4 w-4" />}
      nodeType="huggingface_inference"
      label={data.label}
      status={data.status}
      subtitle={config.task || 'text-generation'}
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
      {config.model_id && (
        <div className="text-xs text-gray-400 italic truncate">
          {config.model_id}
        </div>
      )}
    </NodeShell>
  );
}
