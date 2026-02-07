# Chat Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a chatbot-style panel that lets users interact with their built flow via a conversational UI, triggered by a Chat button in the toolbar.

**Architecture:** A right-side drawer component (`ChatPanel`) slides over the existing ConfigPanel when toggled via a toolbar button. Each user message is sent through the existing WebSocket execution pipeline. The flow runs end-to-end per message, and the assistant response (from the Output node) streams back into the chat. Chat history is stored in Zustand alongside the flow state.

**Tech Stack:** React 18, TypeScript, Zustand (store), existing WebSocket service, Tailwind CSS v4

---

### Task 1: Add Chat State to Zustand Store

**Files:**
- Modify: `frontend/src/store/flowStore.ts`
- Modify: `frontend/src/types/flow.ts`

**Step 1: Add ChatMessage type to flow types**

Add to `frontend/src/types/flow.ts` at the bottom, before the closing comments:

```typescript
// ---------------------------------------------------------------------------
// Chat types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
```

**Step 2: Run type check to verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Add chat state and actions to flowStore**

Add these to the FlowState interface in `frontend/src/store/flowStore.ts`:

```typescript
// Chat state
chatMessages: ChatMessage[];
isChatOpen: boolean;
```

Add these actions:

```typescript
// Chat actions
addChatMessage: (role: ChatMessage['role'], content: string) => void;
clearChat: () => void;
toggleChat: () => void;
setChatOpen: (open: boolean) => void;
```

Add the initial state:

```typescript
chatMessages: [],
isChatOpen: false,
```

Add the action implementations:

```typescript
addChatMessage: (role, content) =>
  set((state) => ({
    chatMessages: [
      ...state.chatMessages,
      {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: Date.now(),
      },
    ],
  })),

clearChat: () => set({ chatMessages: [] }),

toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

setChatOpen: (open) => set({ isChatOpen: open }),
```

**Step 4: Run type check to verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean (no errors)

**Step 5: Commit**

```bash
git add frontend/src/types/flow.ts frontend/src/store/flowStore.ts
git commit -m "feat: add chat message state and actions to store"
```

---

### Task 2: Build ChatPanel Component

**Files:**
- Create: `frontend/src/components/panels/ChatPanel.tsx`

**Step 1: Create the ChatPanel component**

Create `frontend/src/components/panels/ChatPanel.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { flowWebSocket } from '../../services/websocket';
import { toast } from '../ui/Toast';
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

      // After execution, find the last output from the Output node
      const store = useFlowStore.getState();
      const outputNode = store.nodes.find(
        (n) => n.data.nodeType === 'output' && n.data.output,
      );
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
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
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

function MessageBubble({ message }: { message: ChatMessage }) {
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
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
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
```

**Step 2: Run type check to verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Commit**

```bash
git add frontend/src/components/panels/ChatPanel.tsx
git commit -m "feat: add ChatPanel component with message bubbles and input"
```

---

### Task 3: Add Chat Button to Toolbar

**Files:**
- Modify: `frontend/src/components/canvas/Toolbar.tsx`

**Step 1: Add chat toggle button**

Import `useFlowStore` chat actions (already imported, just add selectors):

```typescript
const isChatOpen = useFlowStore((s) => s.isChatOpen);
const toggleChat = useFlowStore((s) => s.toggleChat);
```

Add a Chat button between the Save button and the Undo button. The button should:
- Use a chat bubble icon (inline SVG)
- Show active state when `isChatOpen` is true (indigo background)
- Call `toggleChat()` on click

```tsx
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
```

**Step 2: Run type check to verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Commit**

```bash
git add frontend/src/components/canvas/Toolbar.tsx
git commit -m "feat: add chat toggle button to toolbar"
```

---

### Task 4: Wire ChatPanel into App Layout

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Import ChatPanel and conditionally render**

Add import:

```typescript
import ChatPanel from './components/panels/ChatPanel';
```

Add the `isChatOpen` selector:

```typescript
const isChatOpen = useFlowStore((s) => s.isChatOpen);
```

In the JSX, add the ChatPanel after the ConfigPanel, conditionally rendered:

```tsx
<div className="flex h-screen w-screen bg-gray-950">
  <NodeSidebar />
  <main className="relative flex-1">
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  </main>
  <ConfigPanel />
  {isChatOpen && <ChatPanel />}
  <ToastContainer />
</div>
```

Note: `App.tsx` needs to import `useFlowStore`. Check if it's already imported; if not, add:

```typescript
import { useFlowStore } from './store/flowStore';
```

**Step 2: Run type check to verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Verify in browser**

Run: `cd /path/to/project && npx playwright test e2e/input-agent-output.spec.ts --reporter=list`
Expected: All 8 existing tests still pass

**Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire ChatPanel into app layout with conditional render"
```

---

### Task 5: Write E2E Test for Chat Panel

**Files:**
- Create: `e2e/chat-panel.spec.ts`

**Step 1: Write the test**

Create `e2e/chat-panel.spec.ts`:

```typescript
import { test, expect, type Page } from '@playwright/test';

async function dragNodeToCanvas(
  page: Page,
  nodeType: string,
  targetX: number,
  targetY: number,
) {
  await page.evaluate(
    ({ nodeType, targetX, targetY }) => {
      const canvas = document.querySelector('.react-flow') as HTMLElement;
      if (!canvas) throw new Error('Canvas not found');
      const dt = new DataTransfer();
      dt.setData('application/agnoflow-node', nodeType);
      canvas.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true, cancelable: true,
          clientX: targetX, clientY: targetY, dataTransfer: dt,
        }),
      );
      canvas.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true, cancelable: true,
          clientX: targetX, clientY: targetY, dataTransfer: dt,
        }),
      );
    },
    { nodeType, targetX, targetY },
  );
  await page.waitForTimeout(500);
}

test.describe('Chat Panel', () => {
  test('Chat button toggles chat panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Chat panel should not be visible initially
    const chatPanel = page.locator('text=Send a message to run your flow');
    await expect(chatPanel).not.toBeVisible();

    // Click chat button in toolbar
    const chatButton = page.locator('button[title="Toggle chat"]');
    await expect(chatButton).toBeVisible();
    await chatButton.click();
    await page.waitForTimeout(500);

    // Chat panel should now be visible
    await expect(chatPanel).toBeVisible();

    // Click again to close
    await chatButton.click();
    await page.waitForTimeout(500);
    await expect(chatPanel).not.toBeVisible();
  });

  test('Chat sends message and receives flow output', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Build a simple Input → LLM Agent → Output flow
    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    await dragNodeToCanvas(page, 'input', cx + 200, cy + 150);
    await dragNodeToCanvas(page, 'llm_agent', cx + 500, cy + 300);
    await dragNodeToCanvas(page, 'output', cx + 200, cy + 450);

    // Open chat panel
    const chatButton = page.locator('button[title="Toggle chat"]');
    await chatButton.click();
    await page.waitForTimeout(500);

    // Type a message
    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Hello');

    // Send button should be enabled
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeEnabled();

    await page.screenshot({ path: 'e2e/results/chat-01-ready.png', fullPage: true });

    // Send the message
    await sendButton.click();

    // User message bubble should appear
    const userBubble = page.locator('text=Hello').first();
    await expect(userBubble).toBeVisible({ timeout: 5000 });

    // Wait for flow execution
    await page.waitForTimeout(8000);

    await page.screenshot({ path: 'e2e/results/chat-02-response.png', fullPage: true });

    // Should have at least 2 messages (user + assistant/system)
    const bubbles = page.locator('[class*="rounded-xl"]');
    const count = await bubbles.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Chat shows warning when no flow exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Open chat panel
    const chatButton = page.locator('button[title="Toggle chat"]');
    await chatButton.click();
    await page.waitForTimeout(500);

    // Type and send on empty canvas
    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.fill('Hello');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    await page.waitForTimeout(1000);

    // Should show a warning toast
    const warning = page.locator('text=No flow').first();
    const hasWarning = await warning.isVisible().catch(() => false);

    await page.screenshot({ path: 'e2e/results/chat-03-no-flow.png', fullPage: true });

    // Either toast or no user message should appear
    expect(hasWarning).toBe(true);
  });
});
```

**Step 2: Run the test to verify it fails (TDD - no component exists yet if tasks run out of order)**

Run: `cd /path/to/project && npx playwright test e2e/chat-panel.spec.ts --reporter=list`
Expected: Tests pass if Tasks 1-4 are already done. If not, they fail with missing elements.

**Step 3: Commit**

```bash
git add e2e/chat-panel.spec.ts
git commit -m "test: add e2e tests for chat panel"
```

---

### Task 6: Run Full Test Suite & Final Verification

**Files:** (none — verification only)

**Step 1: Run all e2e tests**

Run: `cd /path/to/project && npx playwright test --reporter=list`
Expected: All tests pass (8 existing + 3 new chat tests)

**Step 2: Run TypeScript type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Run Vite build**

Run: `cd frontend && npx vite build`
Expected: Clean build

**Step 4: Review screenshots**

Read the generated screenshots to verify:
- `e2e/results/chat-01-ready.png` — Chat panel open with message typed
- `e2e/results/chat-02-response.png` — User bubble + assistant response
- `e2e/results/chat-03-no-flow.png` — Warning toast on empty canvas

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete chat panel feature with e2e tests"
```

---

## Summary

| Task | Description | Files | Estimated Steps |
|------|-------------|-------|----------------|
| 1 | Chat state in Zustand | 2 modified | 5 |
| 2 | ChatPanel component | 1 created | 3 |
| 3 | Chat button in Toolbar | 1 modified | 3 |
| 4 | Wire into App layout | 1 modified | 4 |
| 5 | E2E tests | 1 created | 3 |
| 6 | Full verification | 0 | 5 |
