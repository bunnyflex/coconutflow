import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { TemplateCard } from '../components/dashboard/TemplateCard';
import { flowApi } from '../services/api';
import type { FlowDefinition } from '../types/flow';

type Tab = 'featured' | 'community';

export function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('featured');
  const [featured, setFeatured] = useState<FlowDefinition[]>([]);
  const [community, setCommunity] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [feat, comm] = await Promise.all([
          flowApi.listFeatured(),
          flowApi.listCommunity(),
        ]);
        setFeatured(feat);
        setCommunity(comm);
      } catch {
        setError('Failed to load templates. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const templates = activeTab === 'featured' ? featured : community;

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Templates</h1>
          <p className="text-gray-400 text-sm mt-1">
            Start from a pre-built flow — click "Use Template" to get your own editable copy
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-700/60">
          {(['featured', 'community'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-white border-indigo-500'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {tab === 'featured' ? 'Featured' : 'Community'}
              {tab === 'community' && community.length === 0 && !loading && (
                <span className="ml-2 text-xs text-gray-600">(coming soon)</span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading templates...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm py-4 px-4 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && templates.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm">
              {activeTab === 'featured'
                ? 'No featured templates yet.'
                : 'No community templates yet. Publish your own flows to share them here!'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
