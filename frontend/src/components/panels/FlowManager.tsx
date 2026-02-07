import { useCallback, useEffect, useState } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { flowApi, type FlowListItem } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FlowManager({ isOpen, onClose }: Props) {
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flowId = useFlowStore((s) => s.flowId);
  const loadFlow = useFlowStore((s) => s.loadFlow);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await flowApi.list();
      setFlows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchFlows();
  }, [isOpen, fetchFlows]);

  const handleLoad = async (id: string) => {
    try {
      const flow = await flowApi.get(id);
      // The backend returns a FlowDefinition-compatible object
      loadFlow(flow as any);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flow');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await flowApi.delete(id);
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flow');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Saved Flows</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[400px] overflow-y-auto p-5">
          {error && (
            <div className="mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Loading...
            </div>
          ) : flows.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No saved flows yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    flow.id === flowId
                      ? 'border-indigo-500 bg-indigo-950/30'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{flow.name}</p>
                    {flow.description && (
                      <p className="truncate text-xs text-gray-400">{flow.description}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(flow.metadata.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-1">
                    <button
                      onClick={() => handleLoad(flow.id)}
                      className="rounded-md px-3 py-1 text-xs font-medium text-indigo-400 hover:bg-indigo-900/30"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(flow.id)}
                      className="rounded-md px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
