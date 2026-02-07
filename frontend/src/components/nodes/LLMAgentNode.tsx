import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';
import type { FlowNodeData } from '../../store/flowStore';
import type { LLMAgentNodeConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function LLMAgentNode({ data }: { data: FlowNodeData }) {
  const config = data.config as LLMAgentNodeConfig;

  return (
    <NodeShell
      icon={<Bot className="h-4 w-4" />}
      nodeType="llm_agent"
      label={data.label}
      status={data.status}
      subtitle={`${config.model_provider} / ${config.model_id}`}
      error={data.error}
    >
      {config.instructions && (
        <div className="text-xs text-gray-400 italic truncate max-w-[160px]">
          {config.instructions}
        </div>
      )}
      {config.tools.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {config.tools.map((tool) => (
            <span key={tool} className="rounded bg-indigo-900/50 px-1.5 py-0.5 text-[10px] text-indigo-300">
              {tool}
            </span>
          ))}
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
