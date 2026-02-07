import { useFlowStore } from '../../store/flowStore';
import type { NodeType, NodeConfig } from '../../types/flow';
import { BlurFade } from '../ui/magicui/blur-fade';
import InputConfigForm from './config/InputConfigForm';
import LLMAgentConfigForm from './config/LLMAgentConfigForm';
import WebSearchConfigForm from './config/WebSearchConfigForm';
import KnowledgeBaseConfigForm from './config/KnowledgeBaseConfigForm';
import ConditionalConfigForm from './config/ConditionalConfigForm';
import OutputConfigForm from './config/OutputConfigForm';

const FORM_MAP: Record<NodeType, React.FC<{ nodeId: string; config: NodeConfig; onChange: (c: NodeConfig) => void }>> = {
  input: InputConfigForm,
  llm_agent: LLMAgentConfigForm,
  web_search: WebSearchConfigForm,
  knowledge_base: KnowledgeBaseConfigForm,
  conditional: ConditionalConfigForm,
  output: OutputConfigForm,
};

export default function ConfigPanel() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const removeNode = useFlowStore((s) => s.removeNode);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  if (!selectedNode) return null;

  const nodeType = selectedNode.data.nodeType;
  const config = selectedNode.data.config;
  const FormComponent = FORM_MAP[nodeType];

  const handleChange = (newConfig: NodeConfig) => {
    updateNodeConfig(selectedNode.id, newConfig);
  };

  return (
    <aside className="flex w-80 flex-col border-l border-gray-800 bg-gray-900">
      <BlurFade direction="left" duration={0.25} offset={12}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">{selectedNode.data.label}</h2>
            <p className="text-xs text-gray-500">{nodeType} node</p>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4">
          {FormComponent && (
            <FormComponent nodeId={selectedNode.id} config={config} onChange={handleChange} />
          )}
        </div>

        {/* Output preview */}
        {selectedNode.data.output && (
          <div className="border-t border-gray-800 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Output</h3>
            <div className="max-h-32 overflow-y-auto rounded bg-gray-800 p-2 text-xs text-gray-300 whitespace-pre-wrap">
              {selectedNode.data.output}
            </div>
          </div>
        )}

        {/* Error display */}
        {selectedNode.data.error && (
          <div className="border-t border-red-900/50 bg-red-950/30 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase text-red-400">Error</h3>
            <div className="text-xs text-red-300">{selectedNode.data.error}</div>
          </div>
        )}

        {/* Delete button */}
        <div className="border-t border-gray-800 p-4">
          <button
            onClick={() => {
              removeNode(selectedNode.id);
            }}
            className="w-full rounded-lg border border-red-800 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-950"
          >
            Delete Node
          </button>
        </div>
      </BlurFade>
    </aside>
  );
}
