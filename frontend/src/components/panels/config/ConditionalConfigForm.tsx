import type { NodeConfig, ConditionalNodeConfig } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

export default function ConditionalConfigForm({ config, onChange }: Props) {
  const cfg = config as ConditionalNodeConfig;

  const update = (partial: Partial<ConditionalNodeConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Condition (plain English)</label>
        <textarea
          value={cfg.condition}
          onChange={(e) => update({ condition: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="The response mentions pricing information..."
        />
        {!cfg.condition && (
          <p className="mt-1 text-xs text-amber-500">A condition is required</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          This will be evaluated by a lightweight LLM call at runtime.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-green-400">True Label</label>
          <input
            type="text"
            value={cfg.true_label}
            onChange={(e) => update({ true_label: e.target.value })}
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-red-400">False Label</label>
          <input
            type="text"
            value={cfg.false_label}
            onChange={(e) => update({ false_label: e.target.value })}
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-red-500"
          />
        </div>
      </div>
    </div>
  );
}
