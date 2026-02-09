import type { NodeConfig, ApifyActorConfig } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

export default function ApifyActorConfigForm({ config, onChange }: Props) {
  const cfg = config as ApifyActorConfig;

  const update = (partial: Partial<ApifyActorConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  const handleInputChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      update({ input: parsed });
    } catch {
      // Keep current value if JSON is invalid
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Actor ID</label>
        <input
          type="text"
          value={cfg.actor_id}
          onChange={(e) => update({ actor_id: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="apify/instagram-scraper"
        />
        <p className="mt-1 text-xs text-gray-500">
          Apify actor ID from the Apify Store (e.g., apify/instagram-scraper).
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Input JSON</label>
        <textarea
          value={JSON.stringify(cfg.input, null, 2)}
          onChange={(e) => handleInputChange(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 font-mono outline-none focus:border-indigo-500"
          placeholder='{"username": "example"}'
        />
        <p className="mt-1 text-xs text-gray-500">
          Actor-specific input parameters as JSON.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          Max Items: {cfg.max_items}
        </label>
        <input
          type="range"
          min="1"
          max="1000"
          step="10"
          value={cfg.max_items}
          onChange={(e) => update({ max_items: parseInt(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          Timeout (seconds): {cfg.timeout_secs}
        </label>
        <input
          type="range"
          min="30"
          max="900"
          step="30"
          value={cfg.timeout_secs}
          onChange={(e) => update({ timeout_secs: parseInt(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Credential ID</label>
        <input
          type="text"
          value={cfg.credential_id || ''}
          onChange={(e) => update({ credential_id: e.target.value || null })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="Optional credential ID"
        />
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to use APIFY_API_KEY from environment.
        </p>
      </div>
    </div>
  );
}
