import type { NodeConfig, InputNodeConfig, InputType } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

const INPUT_TYPES: { value: InputType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'file', label: 'File Upload' },
  { value: 'url', label: 'URL' },
];

export default function InputConfigForm({ config, onChange }: Props) {
  const cfg = config as InputNodeConfig;

  const update = (partial: Partial<InputNodeConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Input Type</label>
        <select
          value={cfg.input_type}
          onChange={(e) => update({ input_type: e.target.value as InputType })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          {INPUT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Placeholder Text</label>
        <input
          type="text"
          value={cfg.placeholder}
          onChange={(e) => update({ placeholder: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Default Value</label>
        <textarea
          value={cfg.value ?? ''}
          onChange={(e) => update({ value: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="Enter default input value..."
        />
      </div>
    </div>
  );
}
