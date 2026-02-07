import type { NodeConfig, LLMAgentNodeConfig, ModelProvider } from '../../../types/flow';
import { MODEL_OPTIONS } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

const PROVIDERS: { value: ModelProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'groq', label: 'Groq' },
  { value: 'ollama', label: 'Ollama (Local)' },
];

const TOOL_OPTIONS = [
  { value: 'web_search', label: 'Web Search' },
  { value: 'finance', label: 'Finance Data' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'github', label: 'GitHub' },
];

export default function LLMAgentConfigForm({ config, onChange }: Props) {
  const cfg = config as LLMAgentNodeConfig;

  const update = (partial: Partial<LLMAgentNodeConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  const filteredModels = MODEL_OPTIONS.filter((m) => m.provider === cfg.model_provider);

  const toggleTool = (tool: string) => {
    const tools = cfg.tools.includes(tool)
      ? cfg.tools.filter((t) => t !== tool)
      : [...cfg.tools, tool];
    update({ tools });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Provider</label>
        <select
          value={cfg.model_provider}
          onChange={(e) => {
            const provider = e.target.value as ModelProvider;
            const models = MODEL_OPTIONS.filter((m) => m.provider === provider);
            update({ model_provider: provider, model_id: models[0]?.id ?? '' });
          }}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Model</label>
        <select
          value={cfg.model_id}
          onChange={(e) => update({ model_id: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          {filteredModels.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Instructions</label>
        <textarea
          value={cfg.instructions}
          onChange={(e) => update({ instructions: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="You are a helpful assistant that..."
        />
        {!cfg.instructions && (
          <p className="mt-1 text-xs text-amber-500">Instructions are recommended</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          Temperature: {cfg.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={cfg.temperature}
          onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Tools</label>
        <div className="flex flex-col gap-2">
          {TOOL_OPTIONS.map((tool) => (
            <label key={tool.value} className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={cfg.tools.includes(tool.value)}
                onChange={() => toggleTool(tool.value)}
                className="rounded border-gray-600 bg-gray-800 accent-indigo-500"
              />
              {tool.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
