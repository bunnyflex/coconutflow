import type { ReactNode } from 'react';
import type { NodeStatus } from '../../types/flow';
import { BorderBeam } from '../ui/magicui/border-beam';

const STATUS_STYLES: Record<NodeStatus, string> = {
  idle: 'border-gray-600',
  pending: 'border-yellow-500/60',
  running: 'border-blue-500 shadow-blue-500/20 shadow-lg',
  completed: 'border-green-500',
  error: 'border-red-500',
};

const STATUS_BADGES: Partial<Record<NodeStatus, ReactNode>> = {
  completed: (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">
      &#10003;
    </span>
  ),
  error: (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
      !
    </span>
  ),
  running: (
    <>
      <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
        <span className="h-2 w-2 animate-ping rounded-full bg-white" />
      </span>
      <BorderBeam
        size={60}
        duration={3}
        colorFrom="#3b82f6"
        colorTo="#6366f1"
        borderWidth={2}
      />
    </>
  ),
  pending: (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs text-gray-900">
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
  icon: string;
  label: string;
  status: NodeStatus;
  subtitle?: string;
  children?: ReactNode;
  error?: string;
}

export default function NodeShell({ icon, label, status, subtitle, children, error }: NodeShellProps) {
  return (
    <div
      className={`relative min-w-[180px] rounded-xl border-2 bg-gray-800 shadow-lg transition-all duration-300 ${STATUS_STYLES[status]}`}
    >
      {STATUS_BADGES[status]}

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-700 px-3 py-2">
        <span className="text-base">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-100">{label}</div>
          {subtitle && (
            <div className="truncate text-xs text-gray-400">{subtitle}</div>
          )}
        </div>
      </div>

      {/* Body */}
      {children && <div className="px-3 py-2">{children}</div>}

      {/* Status bar (only during execution) */}
      {status !== 'idle' && (
        <div className="border-t border-gray-700 px-3 py-1">
          {STATUS_LABELS[status]}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="border-t border-red-900 bg-red-950/50 px-3 py-1.5">
          <p className="text-[10px] text-red-400 line-clamp-2">{error}</p>
        </div>
      )}
    </div>
  );
}
