import { useCallback, useEffect, useRef, useState } from 'react';
import { MarkdownHooks as Markdown } from 'react-markdown';
import { useFlowStore } from '../../store/flowStore';
import { flowWebSocket } from '../../services/websocket';
import { toast } from '../ui/Toast';
import { TypingAnimation } from '../ui/magicui/typing-animation';
import type { ChatMessage } from '../../types/flow';

export default function ChatPanel() {
  const messages = useFlowStore((s) => s.chatMessages);
  const addMessage = useFlowStore((s) => s.addChatMessage);
  const clearChat = useFlowStore((s) => s.clearChat);
  const isRunning = useFlowStore((s) => s.isRunning);
  const getFlowDefinition = useFlowStore((s) => s.getFlowDefinition);
  const nodes = useFlowStore((s) => s.nodes);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isRunning) return;

    if (nodes.length === 0) {
      toast.warning('No flow', 'Build a flow on the canvas first');
      return;
    }

    // Add user message to chat
    addMessage('user', text);
    setInput('');

    try {
      const flow = getFlowDefinition();
      await flowWebSocket.executeFlow(flow, text);

      // After execution, find the output — prefer Output nodes, fall back to any node with output
      const store = useFlowStore.getState();
      const outputNode =
        store.nodes.find((n) => n.data.nodeType === 'output' && n.data.output) ??
        [...store.nodes].reverse().find((n) => n.data.output);
      const assistantResponse =
        outputNode?.data.output ?? 'No output received.';
      addMessage('assistant', assistantResponse);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      addMessage('system', `Error: ${msg}`);
      toast.error('Chat error', msg);
    }
  }, [input, isRunning, nodes, addMessage, getFlowDefinition]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="flex h-full w-96 flex-col border-l border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Chat</h2>
        <button
          onClick={clearChat}
          className="text-xs text-gray-400 hover:text-white transition-colors"
          title="Clear chat"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500 text-center">
              Send a message to run your flow.
              <br />
              <span className="text-xs text-gray-600">
                Each message flows through your pipeline.
              </span>
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLatest={msg.role === 'assistant' && idx === messages.length - 1}
          />
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="animate-pulse">●</span> Running flow...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isRunning}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? '...' : 'Send'}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-600">
          Enter to send, Shift+Enter for new line
        </p>
      </div>
    </aside>
  );
}

function MessageBubble({ message, isLatest = false }: { message: ChatMessage; isLatest?: boolean }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-indigo-600 text-white'
            : isSystem
              ? 'bg-red-900/50 text-red-300 border border-red-800'
              : 'bg-gray-800 text-gray-200'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : isSystem ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : isLatest ? (
          <TypingAnimation text={message.content} speed={12} />
        ) : (
          <div className="prose prose-sm prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_li]:my-0.5 [&_ol]:my-1 [&_ul]:my-1 [&_p]:my-1">
            <Markdown>{message.content}</Markdown>
          </div>
        )}
        <p
          className={`mt-1 text-xs ${
            isUser ? 'text-indigo-300' : isSystem ? 'text-red-400' : 'text-gray-500'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
