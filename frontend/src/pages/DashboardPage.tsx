import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { FlowCard } from '../components/dashboard/FlowCard';
import { flowApi } from '../services/api';
import type { FlowDefinition } from '../types/flow';

export function DashboardPage() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await flowApi.list();
      const sorted = [...data].sort((a, b) => {
        const aDate = a.metadata?.updated_at ?? '';
        const bDate = b.metadata?.updated_at ?? '';
        return bDate.localeCompare(aDate);
      });
      setFlows(sorted);
    } catch {
      setError('Failed to load flows. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flow? This cannot be undone.')) return;
    await flowApi.delete(id);
    setFlows((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDuplicate = async (flow: FlowDefinition) => {
    const copy = await flowApi.duplicate(flow.id);
    setFlows((prev) => [copy, ...prev]);
  };

  const recent = flows.slice(0, 4);

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">My Flows</h1>
            <p className="text-gray-400 text-sm mt-1">Build and manage your AI workflows</p>
          </div>
          <button
            onClick={() => navigate('/flow')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Flow
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading flows...</span>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm py-4 px-4 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        {!loading && !error && flows.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm">No flows yet.</p>
            <button
              onClick={() => navigate('/flow')}
              className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm underline"
            >
              Create your first flow &rarr;
            </button>
          </div>
        )}

        {!loading && flows.length > 0 && (
          <>
            {/* Recent strip */}
            <section className="mb-10">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Recent</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recent.map((flow) => (
                  <div key={flow.id} className="w-64 flex-shrink-0">
                    <FlowCard flow={flow} onDelete={handleDelete} onDuplicate={handleDuplicate} />
                  </div>
                ))}
              </div>
            </section>

            {/* All flows grid */}
            <section>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">All Flows</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {flows.map((flow) => (
                  <FlowCard key={flow.id} flow={flow} onDelete={handleDelete} onDuplicate={handleDuplicate} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
