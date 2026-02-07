import type { NodeConfig, KnowledgeBaseNodeConfig } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

export default function KnowledgeBaseConfigForm({ config, onChange }: Props) {
  const cfg = config as KnowledgeBaseNodeConfig;

  const update = (partial: Partial<KnowledgeBaseNodeConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
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
