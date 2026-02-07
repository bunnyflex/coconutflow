import type { NodeConfig, WebSearchNodeConfig } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

export default function WebSearchConfigForm({ config, onChange }: Props) {
  const cfg = config as WebSearchNodeConfig;

  const update = (partial: Partial<WebSearchNodeConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Query Template</label>
        <textarea
          value={cfg.query_template}
          onChange={(e) => update({ query_template: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="Search for the latest news about..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to use the upstream node output as the query.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          Result Count: {cfg.result_count}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={cfg.result_count}
          onChange={(e) => update({ result_count: parseInt(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>
    </div>
  );
}
