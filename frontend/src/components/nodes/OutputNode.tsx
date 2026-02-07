import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { FlowNodeData } from '../../store/flowStore';
import type { OutputNodeConfig } from '../../types/flow';
import NodeShell from './NodeShell';

export default function OutputNode({ data }: { data: FlowNodeData }) {
  const config = data.config as OutputNodeConfig;
  const outputRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom as output streams in
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [data.output]);

  const handleCopy = useCallback(async () => {
    if (!data.output) return;
    try {
      await navigator.clipboard.writeText(data.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [data.output]);

  return (
    <NodeShell
      icon="📤"
      label={data.label}
      status={data.status}
      subtitle={config.display_format}
      error={data.error}
    >
      <div className="relative">
        {data.output ? (
          <>
            <div
              ref={outputRef}
              className={`max-h-32 overflow-y-auto text-xs text-gray-300 whitespace-pre-wrap ${
                config.display_format === 'json' ? 'font-mono' : ''
              }`}
            >
              {data.output}
            </div>
            {config.copy_to_clipboard && (
              <button
                onClick={handleCopy}
                className="mt-1.5 flex items-center gap-1 rounded bg-gray-700 px-2 py-0.5 text-[10px] text-gray-300 hover:bg-gray-600 transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="h-3 w-3 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            )}
          </>
        ) : data.status === 'running' ? (
          <div className="flex items-center gap-1 text-xs text-blue-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" style={{ animationDelay: '0.2s' }} />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" style={{ animationDelay: '0.4s' }} />
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Waiting for output...</div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!h-3 !w-3 !border-2 !border-gray-600 !bg-indigo-400"
      />
    </NodeShell>
  );
}
