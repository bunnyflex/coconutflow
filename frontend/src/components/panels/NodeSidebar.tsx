import { type DragEvent, useState } from 'react';
import { NODE_TYPE_CATALOG, type NodeTypeInfo, type NodeType } from '../../types/flow';
import { MagicCard } from '../ui/magicui/magic-card';

const CATEGORY_LABELS: Record<string, string> = {
  input_output: 'Input / Output',
  processing: 'Processing',
  tools: 'Tools',
};

const CATEGORY_ORDER = ['input_output', 'processing', 'tools'] as const;

function DraggableNode({ info }: { info: NodeTypeInfo }) {
  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/agnoflow-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <MagicCard
      className="rounded-lg border border-gray-700"
      gradientSize={120}
      gradientColor="#1e1b4b"
      gradientFrom="#6366f1"
      gradientTo="#3b82f6"
      gradientOpacity={0.6}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, info.type)}
        className="flex cursor-grab items-center gap-3 px-3 py-2.5 active:cursor-grabbing"
      >
        <span className="flex items-center">{info.icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-200">{info.label}</div>
          <div className="truncate text-xs text-gray-500">{info.description}</div>
        </div>
      </div>
    </MagicCard>
  );
}

export default function NodeSidebar() {
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

  return (
    <aside className="flex w-60 flex-col border-r border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-white">AgnoFlow</h1>
        <p className="text-xs text-gray-500">Visual Agent Builder</p>
      </div>

      {/* Search */}
      <div className="border-b border-gray-800 px-3 py-2">
        <input
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-3">
        {grouped.map((group) => (
          <div key={group.key} className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {group.label}
            </div>
            <div className="flex flex-col gap-2">
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
    </aside>
  );
}
