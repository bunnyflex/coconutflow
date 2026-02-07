import type { NodeConfig, OutputNodeConfig, DisplayFormat } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

const FORMAT_OPTIONS: { value: DisplayFormat; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'text', label: 'Plain Text' },
  { value: 'json', label: 'JSON' },
  { value: 'table', label: 'Table' },
];

export default function OutputConfigForm({ config, onChange }: Props) {
  const cfg = config as OutputNodeConfig;

  const update = (partial: Partial<OutputNodeConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Display Format</label>
        <select
          value={cfg.display_format}
          onChange={(e) => update({ display_format: e.target.value as DisplayFormat })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          {FORMAT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={cfg.copy_to_clipboard}
          onChange={(e) => update({ copy_to_clipboard: e.target.checked })}
          className="rounded border-gray-600 bg-gray-800 accent-indigo-500"
        />
        Enable copy-to-clipboard button
      </label>
    </div>
  );
}
