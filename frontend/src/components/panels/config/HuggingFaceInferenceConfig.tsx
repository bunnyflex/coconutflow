import type { NodeConfig, HuggingFaceInferenceConfig } from '../../../types/flow';

interface Props {
  nodeId: string;
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}

export default function HuggingFaceInferenceConfigForm({ config, onChange }: Props) {
  const cfg = config as HuggingFaceInferenceConfig;

  const update = (partial: Partial<HuggingFaceInferenceConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  const handleParametersChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      update({ parameters: parsed });
    } catch {
      // Keep current value if JSON is invalid
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Model ID</label>
        <input
          type="text"
          value={cfg.model_id}
          onChange={(e) => update({ model_id: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="meta-llama/Llama-3.2-1B"
        />
        <p className="mt-1 text-xs text-gray-500">
          Hugging Face model ID (e.g., meta-llama/Llama-3.2-1B).
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Task</label>
        <select
          value={cfg.task}
          onChange={(e) => update({ task: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="text-generation">Text Generation</option>
          <option value="text-classification">Text Classification</option>
          <option value="token-classification">Token Classification</option>
          <option value="feature-extraction">Feature Extraction (Embeddings)</option>
          <option value="summarization">Summarization</option>
          <option value="translation">Translation</option>
          <option value="question-answering">Question Answering</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Inference task type based on the model capabilities.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Parameters JSON</label>
        <textarea
          value={JSON.stringify(cfg.parameters, null, 2)}
          onChange={(e) => handleParametersChange(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 font-mono outline-none focus:border-indigo-500"
          placeholder='{"max_new_tokens": 100, "temperature": 0.7}'
        />
        <p className="mt-1 text-xs text-gray-500">
          Model-specific parameters (temperature, max_tokens, etc.).
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Input Key</label>
        <input
          type="text"
          value={cfg.input_key}
          onChange={(e) => update({ input_key: e.target.value })}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          placeholder="{{upstream.data}}"
        />
        <p className="mt-1 text-xs text-gray-500">
          Template for extracting input from upstream node output.
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
          Leave empty to use HUGGINGFACE_API_KEY from environment.
        </p>
      </div>
    </div>
  );
}
