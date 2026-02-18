import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, ExternalLink, Copy, Trash2, Download } from 'lucide-react';
import type { FlowDefinition, NodeType } from '../../types/flow';
import { flowApi } from '../../services/api';

// Accent colors matching NodeShell.tsx exactly (gradient hex values)
const NODE_COLORS: Record<NodeType, string> = {
  input: '#3b82f6',
  output: '#10b981',
  llm_agent: '#6366f1',
  conditional: '#f59e0b',
  web_search: '#06b6d4',
  knowledge_base: '#a855f7',
  firecrawl_scrape: '#f97316',
  apify_actor: '#f43f5e',
  mcp_server: '#14b8a6',
  huggingface_inference: '#8b5cf6',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface FlowCardProps {
  flow: FlowDefinition;
  onDelete: (id: string) => void;
  onDuplicate: (flow: FlowDefinition) => void;
}

export function FlowCard({ flow, onDelete, onDuplicate }: FlowCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Collect unique node types (up to 5 dots shown)
  const uniqueTypes = [...new Set(flow.nodes.map((n) => n.type))];
  const nodeTypes = uniqueTypes.slice(0, 5) as NodeType[];
  const extraCount = uniqueTypes.length > 5 ? uniqueTypes.length - 5 : 0;

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const tags: string[] = flow.metadata.tags ?? [];
  const updatedAt: string = flow.metadata.updated_at;

  return (
    <div
      className="relative bg-gray-800/50 border border-gray-700/60 rounded-xl p-4 cursor-pointer hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-150 group"
      onClick={() => navigate(`/flow/${flow.id}`)}
    >
      {/* Node type dots */}
      <div className="flex items-center gap-1.5 mb-3">
        {nodeTypes.map((type) => (
          <span
            key={type}
            title={type}
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: NODE_COLORS[type] ?? '#6b7280' }}
          />
        ))}
        {extraCount > 0 && (
          <span className="text-xs text-gray-500">+{extraCount}</span>
        )}
      </div>

      {/* Title + kebab */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-white text-sm leading-snug line-clamp-1">
          {flow.name || 'Untitled Flow'}
        </h3>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* Description */}
      {flow.description && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{flow.description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>{flow.nodes.length} node{flow.nodes.length !== 1 ? 's' : ''}</span>
        {updatedAt && (
          <>
            <span>·</span>
            <span>{timeAgo(updatedAt)}</span>
          </>
        )}
      </div>

      {/* Kebab dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-3 top-10 z-20 bg-gray-900 border border-gray-700/60 rounded-lg shadow-xl py-1 w-44"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { icon: ExternalLink, label: 'Open', action: () => navigate(`/flow/${flow.id}`), danger: false },
            { icon: Copy, label: 'Duplicate', action: () => { onDuplicate(flow); setMenuOpen(false); }, danger: false },
            {
              icon: Download,
              label: 'Export Python',
              action: async () => {
                setMenuOpen(false);
                try {
                  const code = await flowApi.exportPython(flow.id);
                  const blob = new Blob([code], { type: 'text/x-python' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${flow.name.replace(/\s+/g, '_').toLowerCase()}.py`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch {
                  console.error('Export failed');
                }
              },
              danger: false,
            },
            { icon: Trash2, label: 'Delete', action: () => { onDelete(flow.id); setMenuOpen(false); }, danger: true },
          ].map(({ icon: Icon, label, action, danger }) => (
            <button
              key={label}
              onClick={action}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
