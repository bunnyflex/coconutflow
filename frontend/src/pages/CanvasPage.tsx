import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { useFlowStore } from '../store/flowStore';
import { flowApi } from '../services/api';
import FlowCanvas from '../components/canvas/FlowCanvas';
import AIChatPanel from '../components/panels/AIChatPanel';
import NodeSidebar from '../components/panels/NodeSidebar';
import ConfigPanel from '../components/panels/ConfigPanel';

export function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const clearFlow = useFlowStore((s) => s.clearFlow);
  const flowId = useFlowStore((s) => s.flowId);

  useEffect(() => {
    if (!id) {
      if (flowId) clearFlow();
      return;
    }
    if (id !== flowId) {
      flowApi.get(id).then(loadFlow).catch(console.error);
    }
  }, [id]);

  return (
    <div className="flex h-screen w-screen bg-gray-950">
      {/* Left: AI Chat Panel (handles its own collapsed/expanded) */}
      <AIChatPanel />

      {/* Center: Canvas area with overlays */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
        {/* Overlay: Node sidebar (right side, collapsible +) */}
        <NodeSidebar />
      </div>

      {/* Right: Config panel (opens when node selected) */}
      <ConfigPanel />
    </div>
  );
}
