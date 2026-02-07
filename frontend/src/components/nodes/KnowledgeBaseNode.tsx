import { Handle, Position } from 'reactflow';
import { BookOpen } from 'lucide-react';
import type { FlowNodeData } from '../../store/flowStore';
import type { KnowledgeBaseNodeConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function KnowledgeBaseNode({ data }: { data: FlowNodeData }) {
  const config = data.config as KnowledgeBaseNodeConfig;

  return (
    <NodeShell
      icon={<BookOpen className="h-4 w-4 text-gray-400" />}
      label={data.label}
      status={data.status}
      subtitle={`${config.files.length} file${config.files.length !== 1 ? 's' : ''}`}
      error={data.error}
    >
      {config.files.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {config.files.slice(0, 3).map((f) => (
            <div key={f.id} className="truncate text-xs text-gray-400">
              {f.name}
            </div>
          ))}
          {config.files.length > 3 && (
            <div className="text-xs text-gray-500">+{config.files.length - 3} more</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">No files uploaded</div>
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
