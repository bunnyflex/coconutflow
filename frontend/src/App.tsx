import { ReactFlowProvider } from 'reactflow';
import FlowCanvas from './components/canvas/FlowCanvas';
import NodeSidebar from './components/panels/NodeSidebar';
import ConfigPanel from './components/panels/ConfigPanel';
import ChatPanel from './components/panels/ChatPanel';
import ToastContainer from './components/ui/Toast';
import { useFlowStore } from './store/flowStore';

function App() {
  const isChatOpen = useFlowStore((s) => s.isChatOpen);

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

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;
