import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { FlowDefinition, NodeType } from '../../types/flow';
import { flowApi } from '../../services/api';

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

const CATEGORY_COLORS: Record<string, string> = {
  research: 'bg-blue-500/15 text-blue-400',
  automation: 'bg-amber-500/15 text-amber-400',
  content: 'bg-emerald-500/15 text-emerald-400',
  data: 'bg-purple-500/15 text-purple-400',
};

interface TemplateCardProps {
  template: FlowDefinition;
  onUsed?: (newFlow: FlowDefinition) => void;
}

export function TemplateCard({ template, onUsed }: TemplateCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const uniqueTypes = [...new Set(template.nodes.map((n) => n.type))];
  const nodeTypes = uniqueTypes.slice(0, 5) as NodeType[];
  const extraCount = uniqueTypes.length > 5 ? uniqueTypes.length - 5 : 0;
  const tags: string[] = template.metadata?.tags ?? [];
  const author = template.metadata?.author;
  const categoryColor = template.category
    ? (CATEGORY_COLORS[template.category] ?? 'bg-gray-700/60 text-gray-400')
    : null;

  const handleUse = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const newFlow = await flowApi.useTemplate(template.id);
      onUsed?.(newFlow);
      navigate(`/flow/${newFlow.id}`);
    } catch (err) {
      console.error('Failed to use template:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-600 transition-all duration-150">
      {/* Node type dots + category badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
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
        {categoryColor && template.category && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor}`}>
            {template.category}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-medium text-white text-sm leading-snug line-clamp-1">
        {template.name}
      </h3>

      {/* Description */}
      {template.description && (
        <p className="text-xs text-gray-400 line-clamp-2 flex-1">{template.description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: author + Use Template button */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-700/40">
        <span className="text-xs text-gray-500">
          {author ? `by ${author}` : `${template.nodes.length} node${template.nodes.length !== 1 ? 's' : ''}`}
        </span>
        <button
          onClick={handleUse}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          {loading ? 'Cloning...' : 'Use Template'}
        </button>
      </div>
    </div>
  );
}
