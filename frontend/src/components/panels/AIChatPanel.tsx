import { useState, useRef, useEffect } from 'react';
import { Send, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import { chatApi } from '../../services/api';
import { autoLayoutMutations } from '../../utils/autoLayout';
import type { ChatMessage } from '../../types/flow';
import type { FlowMutation } from '../../types/mutations';

export default function AIChatPanel() {
  const messages = useFlowStore((s) => s.chatMessages);
  const addMessage = useFlowStore((s) => s.addChatMessage);
  const isChatOpen = useFlowStore((s) => s.isChatOpen);
  const setChatOpen = useFlowStore((s) => s.setChatOpen);
  const applyMutations = useFlowStore((s) => s.applyMutations);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isChatOpen) inputRef.current?.focus();
  }, [isChatOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    addMessage('user', text);
    setInput('');
    setIsLoading(true);

    try {
      // Build message history for the API
      const apiMessages = [
        ...messages.filter((m) => m.role !== 'system').map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content: text },
      ];

      // Send current flow state
      const flowState = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          config: n.data.config,
          label: n.data.label,
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
          source_handle: e.sourceHandle,
          target_handle: e.targetHandle,
        })),
      };

      const response = await chatApi.send(apiMessages, flowState);

      // Apply mutations if any
      if (response.mutations && response.mutations.length > 0) {
        const laid = autoLayoutMutations(response.mutations as FlowMutation[]);
        applyMutations(laid);
      }

      // Show AI message
      addMessage('assistant', response.message || 'Done!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      addMessage('system', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Collapsed: show toggle button
  if (!isChatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        className="absolute left-4 top-4 z-20 w-10 h-10 rounded-xl bg-gray-900/90 border border-gray-700/60 flex items-center justify-center text-gray-400 hover:text-white hover:border-indigo-500/50 transition-all shadow-lg backdrop-blur-sm"
        title="Open AI assistant"
      >
        <PanelLeftOpen size={18} />
      </button>
    );
  }

  return (
    <div className="h-full w-80 bg-gray-950 border-r border-gray-800/60 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-200">AI Assistant</h3>
        </div>
        <button
          onClick={() => setChatOpen(false)}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Sparkles size={24} className="text-indigo-400/60 mx-auto" />
            <p className="text-sm text-gray-400">What would you like to build?</p>
            <p className="text-xs text-gray-600">Describe your workflow and I'll create it on the canvas.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/80 px-3 py-2 rounded-xl text-sm text-gray-400 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-800/60">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            rows={1}
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-lg transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600/80 text-white'
            : message.role === 'system'
              ? 'bg-red-900/30 border border-red-800/50 text-red-300'
              : 'bg-gray-800/80 text-gray-200'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
