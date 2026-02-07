import { useCallback, useEffect, useRef } from 'react';
import { useFlowStore } from '../../store/flowStore';

interface ContextMenuProps {
  nodeId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export default function ContextMenu({ nodeId, x, y, onClose }: ContextMenuProps) {
  const removeNode = useFlowStore((s) => s.removeNode);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const ref = useRef<HTMLDivElement>(null);

  const handleDelete = useCallback(() => {
    removeNode(nodeId);
    onClose();
  }, [nodeId, removeNode, onClose]);

  const handleDuplicate = useCallback(() => {
    const state = useFlowStore.getState();
    const node = state.nodes.find((n) => n.id === nodeId);
    if (node) {
      state.addNode(node.data.nodeType, {
        x: node.position.x + 50,
        y: node.position.y + 50,
      });
    }
    onClose();
  }, [nodeId, onClose]);

  const handleSelect = useCallback(() => {
    setSelectedNode(nodeId);
    onClose();
  }, [nodeId, setSelectedNode, onClose]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl"
      style={{ left: x, top: y }}
    >
      <button
        onClick={handleSelect}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800"
      >
        <span className="text-xs">⚙️</span> Configure
      </button>
      <button
        onClick={handleDuplicate}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800"
      >
        <span className="text-xs">📋</span> Duplicate
      </button>
      <div className="my-1 border-t border-gray-700" />
      <button
        onClick={handleDelete}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-800"
      >
        <span className="text-xs">🗑️</span> Delete
      </button>
    </div>
  );
}
