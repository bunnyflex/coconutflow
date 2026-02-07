import { useState } from 'react';
import { useFlowStore, type FlowNodeData } from '../../store/flowStore';
import { flowWebSocket } from '../../services/websocket';
import { flowApi } from '../../services/api';
import type { InputNodeConfig } from '../../types/flow';
import FlowManager from '../panels/FlowManager';
import { toast } from '../ui/Toast';

export default function Toolbar() {
  const isRunning = useFlowStore((s) => s.isRunning);
  const clearFlow = useFlowStore((s) => s.clearFlow);
  const undo = useFlowStore((s) => s.undo);
  const undoStack = useFlowStore((s) => s.undoStack);
  const nodes = useFlowStore((s) => s.nodes);
  const flowId = useFlowStore((s) => s.flowId);
  const getFlowDefinition = useFlowStore((s) => s.getFlowDefinition);
  const setFlowId = useFlowStore((s) => s.setFlowId);

  const isChatOpen = useFlowStore((s) => s.isChatOpen);
  const toggleChat = useFlowStore((s) => s.toggleChat);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showFlowManager, setShowFlowManager] = useState(false);

  const handleRun = async () => {
    if (isRunning || nodes.length === 0) return;

    // Find the input node(s) to get user_input
    const inputNode = nodes.find((n) => (n.data as FlowNodeData).nodeType === 'input');
    const userInput = inputNode
      ? ((inputNode.data as FlowNodeData).config as InputNodeConfig).value ?? ''
      : '';

    const flow = getFlowDefinition();

    try {
      await flowWebSocket.executeFlow(flow, userInput);
      toast.success('Flow completed', 'Execution finished successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Execution failed', msg);
    }
  };

  const handleSave = async () => {
    if (nodes.length === 0) return;
    setSaveStatus('saving');

    try {
      const flow = getFlowDefinition();

      if (flowId) {
        await flowApi.update(flowId, flow);
      } else {
        const saved = await flowApi.create(flow);
        setFlowId(saved.id);
      }
      setSaveStatus('saved');
      toast.success('Flow saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Save failed', msg);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleClear = () => {
    if (nodes.length === 0) return;
    clearFlow();
  };

  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/90 px-3 py-2 shadow-lg backdrop-blur-sm">
      {/* Run */}
      <button
        onClick={handleRun}
        disabled={isRunning || nodes.length === 0}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRunning ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Running...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
            </svg>
            Run
          </>
        )}
      </button>

      <div className="h-5 w-px bg-gray-700" />

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={nodes.length === 0 || saveStatus === 'saving'}
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title="Save flow"
      >
        {saveStatus === 'saving' ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : saveStatus === 'saved' ? (
          <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        ) : saveStatus === 'error' ? (
          <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" />
          </svg>
        )}
      </button>

      {/* Chat toggle */}
      <button
        onClick={toggleChat}
        className={`rounded-lg p-2 transition-colors ${
          isChatOpen
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
        title="Toggle chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div className="h-5 w-px bg-gray-700" />

      {/* Undo */}
      <button
        onClick={undo}
        disabled={undoStack.length === 0}
        className="rounded-lg px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title="Undo"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Open */}
      <button
        onClick={() => setShowFlowManager(true)}
        className="rounded-lg px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        title="Open saved flow"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 4.75C2 3.784 2.784 3 3.75 3h4.836c.464 0 .909.184 1.237.513l1.414 1.414a.25.25 0 00.177.073h4.836c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0116.25 17H3.75A1.75 1.75 0 012 15.25V4.75z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Clear */}
      <button
        onClick={handleClear}
        disabled={nodes.length === 0}
        className="rounded-lg px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        title="Clear canvas"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
        </svg>
      </button>

      <FlowManager isOpen={showFlowManager} onClose={() => setShowFlowManager(false)} />
    </div>
  );
}
