import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import FlowCanvas from '../components/canvas/FlowCanvas';
import NodeSidebar from '../components/panels/NodeSidebar';
import ConfigPanel from '../components/panels/ConfigPanel';
import ChatPanel from '../components/panels/ChatPanel';
import { useFlowStore } from '../store/flowStore';
import { flowApi } from '../services/api';
import type { FlowDefinition } from '../types/flow';

export function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const flowId = useFlowStore((s) => s.flowId);
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const isChatOpen = useFlowStore((s) => s.isChatOpen);

  useEffect(() => {
    if (id && id !== flowId) {
      flowApi.get(id).then((flow) => loadFlow(flow as unknown as FlowDefinition));
    }
  }, [id, flowId, loadFlow]);

  return (
    <div className="flex h-screen w-screen bg-gray-950">
      {/* Left Sidebar — draggable node library */}
      <NodeSidebar />

      {/* Centre Canvas */}
      <main className="relative flex-1">
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
      </main>

      {/* Right Sidebar — node configuration panel */}
      <ConfigPanel />

      {/* Chat panel — slides in from the right */}
      {isChatOpen && <ChatPanel />}
    </div>
  );
}
