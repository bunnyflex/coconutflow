import { useState } from 'react';
import type { NodeConfig, KnowledgeBaseNodeConfig } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

export default function KnowledgeBaseConfigForm({ config, onChange }: Props) {
  const cfg = config as KnowledgeBaseNodeConfig;
  const [showMenu, setShowMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const update = (partial: Partial<KnowledgeBaseNodeConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  const addSource = (source: string) => {
    if (!source.trim()) return;
    const sources = [...(cfg.sources || []), source.trim()];
    update({ sources });
  };

  const removeSource = (index: number) => {
    const sources = [...(cfg.sources || [])];
    sources.splice(index, 1);
    update({ sources });
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      addSource(urlInput);
      setUrlInput('');
      setShowUrlInput(false);
      setShowMenu(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // For now, add the file name as a placeholder
      // In production, you'd upload to /api/upload and get the path
      addSource(`/uploads/${file.name}`);
    });

    setShowMenu(false);
  };

  const getSourceIcon = (source: string) => {
    if (source.toLowerCase().includes('youtube.com') || source.toLowerCase().includes('youtu.be')) {
      return '🎥';
    }
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return '🌐';
    }
    return '📄';
  };

  const getSourceLabel = (source: string) => {
    if (source.startsWith('/uploads/')) {
      return source.split('/').pop() || source;
    }
    if (source.startsWith('http')) {
      try {
        return new URL(source).hostname;
      } catch {
        return source;
      }
    }
    return source;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Files Section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Sources</label>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg bg-gray-700 p-1.5 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Add Menu Dropdown */}
        {showMenu && (
          <div className="mb-3 rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
            <input
              type="file"
              id="kb-file-upload"
              className="hidden"
              accept=".pdf,.txt,.md,.csv,.json,.docx,.pptx"
              multiple
              onChange={handleFileUpload}
            />
            <label
              htmlFor="kb-file-upload"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-sm text-gray-300">Upload from device</span>
            </label>

            <button
              onClick={() => {
                setShowUrlInput(true);
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-sm text-gray-300">Add URL (website or YouTube)</span>
            </button>
          </div>
        )}

        {/* URL Input */}
        {showUrlInput && (
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              placeholder="https://example.com or https://youtube.com/watch?v=..."
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
              autoFocus
            />
            <button
              onClick={handleAddUrl}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowUrlInput(false);
                setUrlInput('');
              }}
              className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Sources List or Empty State */}
        {cfg.sources && cfg.sources.length > 0 ? (
          <div className="space-y-2">
            {cfg.sources.map((source, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{getSourceIcon(source)}</span>
                  <span className="text-sm text-gray-300 truncate" title={source}>
                    {getSourceLabel(source)}
                  </span>
                </div>
                <button
                  onClick={() => removeSource(index)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-8 text-center">
            <div className="mb-3 flex justify-center gap-2">
              <div className="rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-xs text-gray-400">
                PDF
              </div>
              <div className="rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-xs text-gray-400">
                URL
              </div>
              <div className="rounded-lg border border-dashed border-gray-600 bg-gray-700/30 px-3 py-2 text-xs text-gray-500 flex items-center justify-center">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Add PDFs, documents, or URLs to reference in this project
            </p>
          </div>
        )}
      </div>

      {/* Hidden old upload section */}
      <div className="hidden">
        <label className="mb-1 block text-xs font-medium text-gray-400">Upload Documents</label>
        <div className="rounded-lg border-2 border-dashed border-gray-700 p-4 text-center">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            multiple
            onChange={() => {
              // File upload wired in Task #16/#19
            }}
            className="hidden"
            id="kb-upload"
          />
          <label htmlFor="kb-upload" className="cursor-pointer">
            <div className="text-2xl">📄</div>
            <p className="mt-1 text-xs text-gray-400">
              Click to upload PDF, DOCX, TXT, or CSV
            </p>
          </label>
        </div>
        {cfg.files.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {cfg.files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded bg-gray-800 px-2 py-1 text-xs text-gray-300">
                <span className="truncate">{f.name}</span>
                <span className="text-gray-500">{(f.size / 1024).toFixed(0)}KB</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          Chunk Size: {cfg.chunk_size}
        </label>
        <input
          type="range"
          min="200"
          max="4000"
          step="100"
          value={cfg.chunk_size}
          onChange={(e) => update({ chunk_size: parseInt(e.target.value) })}
          className="w-full accent-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">Characters per chunk</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          Chunk Overlap: {cfg.chunk_overlap || 200}
        </label>
        <input
          type="range"
          min="0"
          max="500"
          step="50"
          value={cfg.chunk_overlap || 200}
          onChange={(e) => update({ chunk_overlap: parseInt(e.target.value) })}
          className="w-full accent-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">Overlap between chunks (preserves context)</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          Top-K Results: {cfg.top_k}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={cfg.top_k}
          onChange={(e) => update({ top_k: parseInt(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Search Type</label>
        <select
          value={cfg.search_type}
          onChange={(e) => update({ search_type: e.target.value as 'hybrid' | 'similarity' | 'keyword' })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="hybrid">Hybrid (Recommended)</option>
          <option value="similarity">Similarity</option>
          <option value="keyword">Keyword</option>
        </select>
      </div>
    </div>
  );
}
