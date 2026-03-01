import { type DragEvent, useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import { NODE_TYPE_CATALOG, type NodeTypeInfo, type NodeType } from '../../types/flow';
import { MagicCard } from '../ui/magicui/magic-card';

const CATEGORY_LABELS: Record<string, string> = {
  input_output: 'Input / Output',
  processing: 'Processing',
  tools: 'Tools & Integrations',
};

const CATEGORY_ORDER = ['input_output', 'processing', 'tools'] as const;

function DraggableNode({ info }: { info: NodeTypeInfo }) {
  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/coconutflow-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <MagicCard
      className="cursor-grab active:cursor-grabbing rounded-lg border border-gray-700"
      gradientSize={120}
      gradientColor="#1e1b4b"
      gradientFrom="#6366f1"
      gradientTo="#3b82f6"
      gradientOpacity={0.6}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, info.type)}
        className="flex items-center gap-3 p-2.5"
      >
        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
          <span className="flex items-center">{info.icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{info.label}</p>
          <p className="text-xs text-gray-500 truncate">{info.description}</p>
        </div>
      </div>
    </MagicCard>
  );
}

export default function NodeSidebar() {
  const isOpen = useFlowStore((s) => s.isNodeSidebarOpen);
  const toggle = useFlowStore((s) => s.toggleNodeSidebar);
  const [search, setSearch] = useState('');

  const filtered = NODE_TYPE_CATALOG.filter(
    (n) =>
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = CATEGORY_ORDER.map((cat) => ({
    key: cat,
    label: CATEGORY_LABELS[cat],
    nodes: filtered.filter((n) => n.category === cat),
  })).filter((g) => g.nodes.length > 0);

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="absolute right-4 top-4 z-20 w-10 h-10 rounded-xl bg-gray-900/90 border border-gray-700/60 flex items-center justify-center text-gray-400 hover:text-white hover:border-indigo-500/50 transition-all shadow-lg backdrop-blur-sm"
        title="Add nodes"
      >
        <Plus size={20} />
      </button>
    );
  }

  return (
    <div className="absolute right-4 top-4 z-20 w-64 max-h-[calc(100vh-8rem)] bg-gray-900/95 border border-gray-700/60 rounded-2xl shadow-2xl backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-300">Add Nodes</h3>
        <button
          onClick={toggle}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {grouped.map((group) => (
          <div key={group.key}>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider px-1 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.nodes.map((info) => (
                <DraggableNode key={info.type} info={info} />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="text-center text-xs text-gray-600">No nodes match your search.</p>
        )}
      </div>
    </div>
  );
}
