import { Handle, Position } from 'reactflow';
import { Flame } from 'lucide-react';
import type { FlowNodeData } from '../../store/flowStore';
import type { FirecrawlScrapeConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function FirecrawlScrapeNode({ data }: { data: FlowNodeData }) {
  const config = data.config as FirecrawlScrapeConfig;

  return (
    <NodeShell
      icon={<Flame className="h-4 w-4" />}
      nodeType="firecrawl_scrape"
      label={data.label}
      status={data.status}
      subtitle={config.formats.join(', ') || 'markdown'}
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
      {config.url && (
        <div className="text-xs text-gray-400 italic truncate">
          {config.url}
        </div>
      )}
    </NodeShell>
  );
}
