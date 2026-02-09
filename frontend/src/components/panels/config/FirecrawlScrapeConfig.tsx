import type { NodeConfig, FirecrawlScrapeConfig } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

export default function FirecrawlScrapeConfigForm({ config, onChange }: Props) {
  const cfg = config as FirecrawlScrapeConfig;

  const update = (partial: Partial<FirecrawlScrapeConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  const toggleFormat = (format: string) => {
    const formats = cfg.formats.includes(format)
      ? cfg.formats.filter(f => f !== format)
      : [...cfg.formats, format];
    update({ formats });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">URL</label>
        <input
          type="text"
          value={cfg.url}
          onChange={(e) => update({ url: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="https://example.com"
        />
        <p className="mt-1 text-xs text-gray-500">
          Website URL to scrape. Use {'{{upstream}}'} to use output from previous node.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Output Formats</label>
        <div className="flex gap-2">
          {['markdown', 'html', 'screenshot'].map(format => (
            <label key={format} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.formats.includes(format)}
                onChange={() => toggleFormat(format)}
                className="rounded accent-indigo-500"
              />
              <span className="text-sm text-gray-300 capitalize">{format}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.include_metadata}
            onChange={(e) => update({ include_metadata: e.target.checked })}
            className="rounded accent-indigo-500"
          />
          <span className="text-sm text-gray-300">Include metadata</span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Extract meta tags, title, and description from the page.
        </p>
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
          Leave empty to use FIRECRAWL_API_KEY from environment.
        </p>
      </div>
    </div>
  );
}
