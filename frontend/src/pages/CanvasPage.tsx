import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import FlowCanvas from '../components/canvas/FlowCanvas';
import NodeSidebar from '../components/panels/NodeSidebar';
import ConfigPanel from '../components/panels/ConfigPanel';
import ChatPanel from '../components/panels/ChatPanel';
import { useFlowStore } from '../store/flowStore';
import { flowApi } from '../services/api';


export function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const { flowId, loadFlow, isChatOpen, clearFlow } = useFlowStore();

  useEffect(() => {
    if (!id) {
      clearFlow();
    } else if (id !== flowId) {
      flowApi.get(id).then((flow) => loadFlow(flow)).catch(console.error);
    }
  }, [id]);

  return (
    <div className="flex h-screen w-screen bg-gray-950">
      {/* Centre Canvas */}
      <main className="relative flex-1">
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>

        {/* Node library — collapsible overlay on right side */}
        <NodeSidebar />
      </main>

      {/* Right Sidebar — node configuration panel */}
      <ConfigPanel />

      {/* Chat panel — slides in from the right */}
      {isChatOpen && <ChatPanel />}
    </div>
  );
}
