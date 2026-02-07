import type { ReactNode } from 'react';
import type { NodeStatus, NodeType } from '../../types/flow';
import { MagicCard } from '../ui/magicui/magic-card';


// Accent colors per node type
const NODE_ACCENT: Record<NodeType, { bg: string; text: string; gradient: string }> = {
  input:          { bg: 'bg-blue-500/15',   text: 'text-blue-400',   gradient: '#3b82f6' },
  output:         { bg: 'bg-emerald-500/15', text: 'text-emerald-400', gradient: '#10b981' },
  llm_agent:      { bg: 'bg-indigo-500/15', text: 'text-indigo-400', gradient: '#6366f1' },
  conditional:    { bg: 'bg-amber-500/15',  text: 'text-amber-400',  gradient: '#f59e0b' },
  web_search:     { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   gradient: '#06b6d4' },
  knowledge_base: { bg: 'bg-purple-500/15', text: 'text-purple-400', gradient: '#a855f7' },
};

const STATUS_BORDER: Record<NodeStatus, string> = {
  idle: 'border-gray-700/60',
  pending: 'border-yellow-500/40',
  running: 'border-blue-500/60 shadow-blue-500/10 shadow-lg',
  completed: 'border-green-500/50',
  error: 'border-red-500/50',
};

const STATUS_BADGES: Partial<Record<NodeStatus, ReactNode>> = {
  completed: (
    <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white shadow-sm">
      &#10003;
    </span>
  ),
  error: (
    <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-sm">
      !
    </span>
  ),
  running: (
    <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
      <span className="h-2 w-2 animate-ping rounded-full bg-white" />
    </span>
  ),
  pending: (
    <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs text-gray-900 shadow-sm">
      &#8987;
    </span>
  ),
};

const STATUS_LABELS: Partial<Record<NodeStatus, ReactNode>> = {
  running: (
    <div className="flex items-center gap-1 text-[10px] font-medium text-blue-400">
      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      Running...
    </div>
  ),
  pending: <div className="text-[10px] font-medium text-yellow-500">Queued</div>,
  error: <div className="text-[10px] font-medium text-red-400">Error</div>,
  completed: <div className="text-[10px] font-medium text-green-400">Done</div>,
};

interface NodeShellProps {
  icon: ReactNode;
  label: string;
  status: NodeStatus;
  nodeType?: NodeType;
  subtitle?: string;
  children?: ReactNode;
  handles?: ReactNode;
  error?: string;
}

export default function NodeShell({ icon, label, status, nodeType = 'llm_agent', subtitle, children, handles, error }: NodeShellProps) {
  const accent = NODE_ACCENT[nodeType];

  return (
    <MagicCard
      className={`min-w-44 max-w-xs rounded-xl border ${STATUS_BORDER[status]} transition-all duration-300`}
      gradientSize={200}
      gradientColor={accent.gradient + '20'}
      gradientFrom={accent.gradient}
      gradientTo={accent.gradient + '60'}
      gradientOpacity={0.5}
      handles={handles}
    >
      <div className="relative">
        {STATUS_BADGES[status]}

        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.bg}`}>
            <span className={`flex items-center ${accent.text}`}>{icon}</span>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-sm font-semibold text-gray-100">{label}</div>
            {subtitle && (
              <div className="truncate text-xs text-gray-500">{subtitle}</div>
            )}
          </div>
        </div>

        {/* Body */}
        {children && (
          <div className="border-t border-gray-700/50 px-3 py-2">
            {children}
          </div>
        )}

        {/* Status bar (only during execution) */}
        {status !== 'idle' && (
          <div className="border-t border-gray-700/50 px-3 py-1">
            {STATUS_LABELS[status]}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="border-t border-red-900/30 bg-red-950/30 px-3 py-1.5">
            <p className="text-[10px] text-red-400 line-clamp-2">{error}</p>
          </div>
        )}
      </div>
    </MagicCard>
  );
}
