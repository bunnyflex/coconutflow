# AI Chat Panel & Canvas Layout Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the canvas layout (node sidebar → right, toolbar → bottom, AI chat → left) and build a unified AI chat panel that can generate, edit, and execute flows through natural language.

**Architecture:** Three phases. Phase 1 is pure frontend layout surgery — move existing components, create the chat panel shell. Phase 2 adds the AI backend (`/api/chat` with SSE streaming) and connects it to the frontend so the AI can generate/edit flows via structured mutations applied to the Zustand store. Phase 3 merges execution into the chat by detecting "run" intent and delegating to the existing WebSocket engine.

**Tech Stack:** React 18, Zustand 5, Tailwind CSS 4, React Flow 11.11, FastAPI, SSE (Server-Sent Events), OpenAI/Anthropic SDK

---

## Phase 1: Layout Redesign

### Task 1: Move Toolbar from top to bottom

The toolbar is currently absolutely positioned at `left-1/2 top-4` in `Toolbar.tsx`. Move it to the bottom of the canvas.

**Files:**
- Modify: `frontend/src/components/canvas/Toolbar.tsx:113`

**Step 1: Change toolbar positioning**

In `frontend/src/components/canvas/Toolbar.tsx`, find the outer container div (around line 113):

```tsx
// OLD
className="absolute left-1/2 top-4 -translate-x-1/2 z-10 ..."
```

Change to:

```tsx
// NEW
className="absolute left-1/2 bottom-4 -translate-x-1/2 z-10 ..."
```

That's it — `top-4` becomes `bottom-4`.

**Step 2: Verify manually**

Run frontend dev server, open `/flow`. Toolbar should now appear at the bottom of the canvas, centered horizontally.

**Step 3: Commit**

```bash
git add frontend/src/components/canvas/Toolbar.tsx
git commit -m "feat: move toolbar to bottom of canvas"
```

---

### Task 2: Convert NodeSidebar to collapsible right-side panel

Currently `NodeSidebar` is a 240px left sidebar always expanded. Convert it to a collapsible panel on the right side that shows only a `+` icon when collapsed.

**Files:**
- Modify: `frontend/src/components/panels/NodeSidebar.tsx`
- Modify: `frontend/src/store/flowStore.ts` (add `isNodeSidebarOpen` state)

**Step 1: Add sidebar toggle state to flowStore**

In `frontend/src/store/flowStore.ts`, add to the state interface (near `isChatOpen`):

```typescript
isNodeSidebarOpen: boolean
toggleNodeSidebar: () => void
```

Add to the store creation (near `isChatOpen: false`):

```typescript
isNodeSidebarOpen: false,
toggleNodeSidebar: () => set((s) => ({ isNodeSidebarOpen: !s.isNodeSidebarOpen })),
```

Default is `false` (collapsed).

**Step 2: Rewrite NodeSidebar as collapsible right panel**

Replace the outer layout in `NodeSidebar.tsx`. When collapsed, show only a `+` button. When expanded, show the full node list as an overlay panel.

```tsx
import { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import { NODE_TYPE_CATALOG, NodeTypeInfo } from '../../types/flow';
import { MagicCard } from '../ui/magicui/magic-card';

const CATEGORY_LABELS: Record<string, string> = {
  input_output: 'Input / Output',
  processing: 'Processing',
  tools: 'Tools & Integrations',
};

const CATEGORY_ORDER = ['input_output', 'processing', 'tools'];

function DraggableNode({ info }: { info: NodeTypeInfo }) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/coconutflow-node', info.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const Icon = info.icon;

  return (
    <MagicCard
      className="cursor-grab active:cursor-grabbing"
      gradientColor="rgba(99, 102, 241, 0.08)"
    >
      <div
        draggable
        onDragStart={onDragStart}
        className="flex items-center gap-3 p-2.5"
      >
        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-indigo-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{info.label}</p>
          <p className="text-xs text-gray-500 truncate">{info.description}</p>
        </div>
      </div>
    </MagicCard>
  );
}

export default function NodeSidebar() {
  const isOpen = useFlowStore((s) => s.isNodeSidebarOpen);
  const toggle = useFlowStore((s) => s.toggleNodeSidebar);
  const [search, setSearch] = useState('');

  const filtered = NODE_TYPE_CATALOG.filter(
    (n) =>
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = CATEGORY_ORDER.map((cat) => ({
    label: CATEGORY_LABELS[cat],
    nodes: filtered.filter((n) => n.category === cat),
  })).filter((g) => g.nodes.length > 0);

  // Collapsed: just a + button
  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="absolute right-4 top-4 z-20 w-10 h-10 rounded-xl bg-gray-900/90 border border-gray-700/60 flex items-center justify-center text-gray-400 hover:text-white hover:border-indigo-500/50 transition-all shadow-lg backdrop-blur-sm"
        title="Add nodes"
      >
        <Plus size={20} />
      </button>
    );
  }

  // Expanded: overlay panel on the right
  return (
    <div className="absolute right-4 top-4 z-20 w-64 max-h-[calc(100vh-8rem)] bg-gray-900/95 border border-gray-700/60 rounded-2xl shadow-2xl backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-300">Add Nodes</h3>
        <button
          onClick={toggle}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {grouped.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider px-1 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.nodes.map((info) => (
                <DraggableNode key={info.type} info={info} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Verify manually**

Open `/flow`. Should see a `+` button in the top-right. Click it — node panel expands as an overlay. Drag a node onto the canvas. Click X — panel collapses back to `+`.

**Step 4: Commit**

```bash
git add frontend/src/components/panels/NodeSidebar.tsx frontend/src/store/flowStore.ts
git commit -m "feat: convert NodeSidebar to collapsible right-side overlay"
```

---

### Task 3: Create AI Chat panel shell (no backend yet)

Create the left-side AI chat panel. For now it's a UI shell — text input, message display, no AI backend. It replaces the old floating ChatPanel's position in the layout.

**Files:**
- Create: `frontend/src/components/panels/AIChatPanel.tsx`

**Step 1: Create the component**

```tsx
import { useState, useRef, useEffect } from 'react';
import { Send, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import type { ChatMessage } from '../../types/flow';

export default function AIChatPanel() {
  const messages = useFlowStore((s) => s.chatMessages);
  const addMessage = useFlowStore((s) => s.addChatMessage);
  const isChatOpen = useFlowStore((s) => s.isChatOpen);
  const setChatOpen = useFlowStore((s) => s.setChatOpen);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isChatOpen) inputRef.current?.focus();
  }, [isChatOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    addMessage('user', text);
    setInput('');
    // TODO Phase 2: Send to /api/chat with flow state, apply mutations
    addMessage('assistant', 'AI chat backend coming soon. For now, use the canvas to build your flow!');
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
            disabled={!input.trim()}
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
```

**Step 2: Commit**

```bash
git add frontend/src/components/panels/AIChatPanel.tsx
git commit -m "feat: create AIChatPanel shell component"
```

---

### Task 4: Rewire CanvasPage layout

Replace the current layout (`NodeSidebar | Canvas | ConfigPanel + ChatPanel`) with the new layout (`AIChatPanel | Canvas (with overlaid NodeSidebar + Toolbar) | ConfigPanel`).

**Files:**
- Modify: `frontend/src/pages/CanvasPage.tsx`

**Step 1: Update the layout**

Replace the full content of `CanvasPage.tsx`:

```tsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { useFlowStore } from '../store/flowStore';
import { flowApi } from '../services/api';
import FlowCanvas from '../components/canvas/FlowCanvas';
import AIChatPanel from '../components/panels/AIChatPanel';
import NodeSidebar from '../components/panels/NodeSidebar';
import { ConfigPanel } from '../components/panels/ConfigPanel';

export function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const clearFlow = useFlowStore((s) => s.clearFlow);
  const flowId = useFlowStore((s) => s.flowId);
  const isChatOpen = useFlowStore((s) => s.isChatOpen);

  useEffect(() => {
    if (!id) {
      if (flowId) clearFlow();
      return;
    }
    if (id !== flowId) {
      flowApi.get(id).then(loadFlow);
    }
  }, [id]);

  return (
    <div className="flex h-screen w-screen bg-gray-950">
      {/* Left: AI Chat Panel */}
      <AIChatPanel />

      {/* Center + Right: Canvas area (relative for overlays) */}
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
```

Note: `AIChatPanel` handles its own collapsed/expanded state internally. When collapsed it renders just a small button, when expanded it renders the 320px panel. The `NodeSidebar` is now absolutely positioned inside the canvas area as an overlay.

**Step 2: Remove chat toggle from Toolbar**

In `frontend/src/components/canvas/Toolbar.tsx`, remove the chat toggle button (the `MessageSquare` icon button around lines 241-254). The chat is now always accessible from the left panel, not toggled from the toolbar.

**Step 3: Remove old ChatPanel import and rendering**

The old `ChatPanel` was conditionally rendered in `CanvasPage.tsx`. It's now fully replaced by `AIChatPanel`. Remove the old import if still present.

**Step 4: Verify manually**

Open `/flow`:
- Left: AI Chat panel (open by default, collapsible)
- Center: Full canvas with toolbar at bottom
- Right: `+` button for node sidebar (expands as overlay)
- Click a node: Config panel opens on the right
- Drag a node from the sidebar onto the canvas

**Step 5: Commit**

```bash
git add frontend/src/pages/CanvasPage.tsx frontend/src/components/canvas/Toolbar.tsx
git commit -m "feat: rewire CanvasPage with new layout — AI chat left, nodes right, toolbar bottom"
```

---

### Task 5: Update flowStore default — chat open by default

Currently `isChatOpen` defaults to `false`. Change it to `true` so the AI chat panel is open when users first load the canvas.

**Files:**
- Modify: `frontend/src/store/flowStore.ts`

**Step 1: Change the default**

Find `isChatOpen: false` and change to `isChatOpen: true`.

**Step 2: Commit**

```bash
git add frontend/src/store/flowStore.ts
git commit -m "feat: default AI chat panel to open on canvas load"
```

---

## Phase 2: AI Chat — Flow Generation & Editing

### Task 6: Define mutation types (shared contract)

Define the TypeScript types for flow mutations that the AI backend will return and the frontend will apply. This is the contract between backend and frontend.

**Files:**
- Create: `frontend/src/types/mutations.ts`

**Step 1: Create the types file**

```typescript
/** Flow mutations returned by the AI chat backend. */

export type FlowMutation =
  | AddNodeMutation
  | RemoveNodeMutation
  | UpdateConfigMutation
  | AddEdgeMutation
  | RemoveEdgeMutation
  | UpdateNodeLabelMutation;

export interface AddNodeMutation {
  type: 'add_node';
  node_id: string;
  node_type: string;
  label?: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface RemoveNodeMutation {
  type: 'remove_node';
  node_id: string;
}

export interface UpdateConfigMutation {
  type: 'update_config';
  node_id: string;
  config: Record<string, unknown>;
}

export interface AddEdgeMutation {
  type: 'add_edge';
  source: string;
  target: string;
  source_handle?: string;
  target_handle?: string;
}

export interface RemoveEdgeMutation {
  type: 'remove_edge';
  edge_id?: string;
  source?: string;
  target?: string;
}

export interface UpdateNodeLabelMutation {
  type: 'update_label';
  node_id: string;
  label: string;
}

/** Response from /api/chat */
export interface ChatResponse {
  message: string;
  mutations?: FlowMutation[];
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/mutations.ts
git commit -m "feat: define FlowMutation types — shared contract for AI chat"
```

---

### Task 7: Add mutation application logic to flowStore

Add a new `applyMutations` action to the Zustand store that processes an array of `FlowMutation` objects and updates the canvas.

**Files:**
- Modify: `frontend/src/store/flowStore.ts`

**Step 1: Add the applyMutations action**

Import the mutation types:

```typescript
import type { FlowMutation } from '../types/mutations';
```

Add to the state interface:

```typescript
applyMutations: (mutations: FlowMutation[]) => void
```

Add the implementation (after existing actions):

```typescript
applyMutations: (mutations) => {
  const state = get();
  state.pushUndo();

  let newNodes = [...state.nodes];
  let newEdges = [...state.edges];

  for (const m of mutations) {
    switch (m.type) {
      case 'add_node': {
        const defaults = DEFAULT_CONFIGS[m.node_type as keyof typeof DEFAULT_CONFIGS] || {};
        const config = { ...defaults, ...m.config };
        const node: Node<FlowNodeData> = {
          id: m.node_id,
          type: m.node_type,
          position: m.position,
          data: {
            type: m.node_type,
            label: m.label || m.node_type,
            config,
            status: 'idle',
          },
        };
        newNodes = [...newNodes, node];
        break;
      }
      case 'remove_node': {
        newNodes = newNodes.filter((n) => n.id !== m.node_id);
        newEdges = newEdges.filter((e) => e.source !== m.node_id && e.target !== m.node_id);
        break;
      }
      case 'update_config': {
        newNodes = newNodes.map((n) =>
          n.id === m.node_id
            ? { ...n, data: { ...n.data, config: { ...n.data.config, ...m.config } } }
            : n
        );
        break;
      }
      case 'update_label': {
        newNodes = newNodes.map((n) =>
          n.id === m.node_id
            ? { ...n, data: { ...n.data, label: m.label } }
            : n
        );
        break;
      }
      case 'add_edge': {
        const edgeId = `e-${m.source}-${m.target}`;
        const edge: Edge = {
          id: edgeId,
          source: m.source,
          target: m.target,
          sourceHandle: m.source_handle || 'output',
          targetHandle: m.target_handle || 'input',
          type: 'animatedBeam',
        };
        newEdges = [...newEdges, edge];
        break;
      }
      case 'remove_edge': {
        if (m.edge_id) {
          newEdges = newEdges.filter((e) => e.id !== m.edge_id);
        } else if (m.source && m.target) {
          newEdges = newEdges.filter((e) => !(e.source === m.source && e.target === m.target));
        }
        break;
      }
    }
  }

  set({ nodes: newNodes, edges: newEdges });
},
```

**Step 2: Write a quick test**

Create `frontend/src/__tests__/applyMutations.test.ts` to verify mutations work:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useFlowStore } from '../store/flowStore';

describe('applyMutations', () => {
  beforeEach(() => {
    useFlowStore.setState({ nodes: [], edges: [], undoStack: [] });
  });

  it('adds a node via add_node mutation', () => {
    useFlowStore.getState().applyMutations([
      {
        type: 'add_node',
        node_id: 'test-1',
        node_type: 'llm_agent',
        config: { instructions: 'Test agent' },
        position: { x: 100, y: 200 },
      },
    ]);
    const nodes = useFlowStore.getState().nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('test-1');
    expect(nodes[0].data.config.instructions).toBe('Test agent');
  });

  it('adds an edge via add_edge mutation', () => {
    // Add two nodes first
    useFlowStore.getState().applyMutations([
      { type: 'add_node', node_id: 'n1', node_type: 'input', config: {}, position: { x: 0, y: 0 } },
      { type: 'add_node', node_id: 'n2', node_type: 'output', config: {}, position: { x: 300, y: 0 } },
      { type: 'add_edge', source: 'n1', target: 'n2' },
    ]);
    const edges = useFlowStore.getState().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('n1');
    expect(edges[0].target).toBe('n2');
  });

  it('removes a node and its connected edges', () => {
    useFlowStore.getState().applyMutations([
      { type: 'add_node', node_id: 'n1', node_type: 'input', config: {}, position: { x: 0, y: 0 } },
      { type: 'add_node', node_id: 'n2', node_type: 'output', config: {}, position: { x: 300, y: 0 } },
      { type: 'add_edge', source: 'n1', target: 'n2' },
    ]);
    useFlowStore.getState().applyMutations([
      { type: 'remove_node', node_id: 'n1' },
    ]);
    expect(useFlowStore.getState().nodes).toHaveLength(1);
    expect(useFlowStore.getState().edges).toHaveLength(0);
  });
});
```

**Step 3: Run tests**

Run: `cd frontend && npx vitest run src/__tests__/applyMutations.test.ts`
Expected: All 3 tests pass.

Note: If vitest is not configured, install it: `npm install -D vitest` and add `"test": "vitest"` to package.json scripts.

**Step 4: Commit**

```bash
git add frontend/src/store/flowStore.ts frontend/src/__tests__/applyMutations.test.ts
git commit -m "feat: add applyMutations action to flowStore with tests"
```

---

### Task 8: Create auto-layout utility

When the AI generates a multi-node flow, nodes need sensible positions. Implement a simple left-to-right DAG layout.

**Files:**
- Create: `frontend/src/utils/autoLayout.ts`

**Step 1: Create the layout utility**

```typescript
import type { FlowMutation, AddNodeMutation } from '../types/mutations';

const NODE_WIDTH = 250;
const NODE_HEIGHT = 100;
const H_GAP = 100;
const V_GAP = 60;
const START_X = 80;
const START_Y = 80;

/**
 * Assigns positions to add_node mutations based on their edge connections.
 * Simple left-to-right layout: topological depth → x, index at depth → y.
 */
export function autoLayoutMutations(mutations: FlowMutation[]): FlowMutation[] {
  const addNodes = mutations.filter((m): m is AddNodeMutation => m.type === 'add_node');
  const addEdges = mutations.filter((m) => m.type === 'add_edge');

  if (addNodes.length === 0) return mutations;

  // Build adjacency from edges
  const children: Record<string, string[]> = {};
  const parents: Record<string, string[]> = {};
  for (const node of addNodes) {
    children[node.node_id] = [];
    parents[node.node_id] = [];
  }
  for (const edge of addEdges) {
    if ('source' in edge && 'target' in edge) {
      const src = edge.source as string;
      const tgt = edge.target as string;
      if (children[src]) children[src].push(tgt);
      if (parents[tgt]) parents[tgt].push(src);
    }
  }

  // Find roots (no parents)
  const roots = addNodes.filter((n) => parents[n.node_id].length === 0).map((n) => n.node_id);
  if (roots.length === 0 && addNodes.length > 0) {
    roots.push(addNodes[0].node_id);
  }

  // BFS to assign depth
  const depth: Record<string, number> = {};
  const queue = [...roots];
  for (const r of roots) depth[r] = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of children[current] || []) {
      if (depth[child] === undefined || depth[child] < depth[current] + 1) {
        depth[child] = depth[current] + 1;
        queue.push(child);
      }
    }
  }

  // Assign any unvisited nodes
  for (const node of addNodes) {
    if (depth[node.node_id] === undefined) depth[node.node_id] = 0;
  }

  // Group by depth, assign y positions
  const depthGroups: Record<number, string[]> = {};
  for (const [nodeId, d] of Object.entries(depth)) {
    if (!depthGroups[d]) depthGroups[d] = [];
    depthGroups[d].push(nodeId);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const [d, nodeIds] of Object.entries(depthGroups)) {
    const col = parseInt(d);
    const x = START_X + col * (NODE_WIDTH + H_GAP);
    for (let i = 0; i < nodeIds.length; i++) {
      const y = START_Y + i * (NODE_HEIGHT + V_GAP);
      positions[nodeIds[i]] = { x, y };
    }
  }

  // Apply positions to add_node mutations
  return mutations.map((m) => {
    if (m.type === 'add_node' && positions[m.node_id]) {
      return { ...m, position: positions[m.node_id] };
    }
    return m;
  });
}
```

**Step 2: Commit**

```bash
git add frontend/src/utils/autoLayout.ts
git commit -m "feat: add auto-layout utility for AI-generated flows"
```

---

### Task 9: Create backend /api/chat endpoint

The core AI backend. Accepts chat messages + flow state, calls an LLM with a system prompt that understands CoconutFlow's node types, and returns text + flow mutations.

**Files:**
- Create: `backend/app/api/chat.py`
- Modify: `backend/app/main.py` (register new router)

**Step 1: Install openai SDK (if not already available)**

The `agno[openai]` extra already includes the OpenAI SDK. Verify with:

```bash
cd backend && python3 -c "import openai; print(openai.__version__)"
```

If not available, add `openai>=1.0.0` to requirements.txt.

**Step 2: Create the chat endpoint**

Create `backend/app/api/chat.py`:

```python
"""
AI Chat API — natural language flow generation and editing.

Accepts chat messages + current flow state, returns text responses
and structured flow mutations (add/remove/update nodes and edges).
"""
from __future__ import annotations

import json
import os
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]  # [{"role": "user", "content": "..."}]
    flow_state: dict[str, Any]  # {nodes: [...], edges: [...]}


# Node type reference for the system prompt
NODE_TYPES_REFERENCE = """
Available node types and their configs:

1. input — Data entry point
   Config: { input_type: "text"|"file"|"url", placeholder: string, value?: string }

2. llm_agent — AI processing via LLM
   Config: { model_provider: "openai"|"anthropic"|"google"|"groq"|"ollama", model_id: string, instructions: string, temperature: number (0-1), tools: string[] }
   Common model_ids: "gpt-4o", "gpt-4o-mini", "claude-sonnet-4-20250514", "gemini-2.0-flash"

3. web_search — DuckDuckGo web search
   Config: { query_template: string, result_count: number }

4. knowledge_base — RAG with document retrieval
   Config: { files: [], sources: string[], chunk_size: number, top_k: number, search_type: "hybrid"|"similarity"|"keyword" }

5. conditional — If/else branching (LLM-evaluated)
   Config: { condition: string, true_label: string, false_label: string }
   Has two output handles: "true" and "false"

6. output — Final output display
   Config: { display_format: "text"|"markdown"|"json"|"table", copy_to_clipboard: boolean }

7. firecrawl_scrape — Web scraping
   Config: { url: string, formats: ["markdown"], include_metadata: boolean, credential_id: null }

8. apify_actor — Apify automation
   Config: { actor_id: string, input: {}, max_items: number, timeout_secs: number, credential_id: null }

9. mcp_server — Model Context Protocol server
   Config: { server_name: string, server_url: string, server_type: "stdio"|"sse"|"http", instructions: null, credential_id: null }

10. huggingface_inference — HuggingFace model inference
    Config: { model_id: string, task: string, parameters: {}, input_key: "inputs", credential_id: null }
"""

SYSTEM_PROMPT = f"""You are CoconutFlow's AI assistant. You help users build AI workflows by generating and editing visual node-based flows.

{NODE_TYPES_REFERENCE}

## How to respond

When the user describes what they want to build or change, respond with:
1. A brief message explaining what you're doing
2. A JSON array of mutations to apply to the canvas

## Mutation format

Your response MUST contain a JSON code block with mutations:

```json
{{"mutations": [...]}}
```

Available mutation types:
- {{"type": "add_node", "node_id": "<unique-id>", "node_type": "<type>", "label": "<display name>", "config": {{...}}, "position": {{"x": 0, "y": 0}}}}
- {{"type": "remove_node", "node_id": "<id>"}}
- {{"type": "update_config", "node_id": "<id>", "config": {{...}}}}
- {{"type": "add_edge", "source": "<node_id>", "target": "<node_id>", "source_handle": "output", "target_handle": "input"}}
- {{"type": "remove_edge", "source": "<node_id>", "target": "<node_id>"}}
- {{"type": "update_label", "node_id": "<id>", "label": "<new label>"}}

For node_id, use descriptive slugs like "input-1", "agent-summarizer", "output-1".
For conditional edges, use source_handle "true" or "false".

## Current flow state

The user's current canvas state is provided with each message. Use it to understand what already exists when making edits.

## Rules

- Generate sensible default configs for each node type
- Always include an input node and an output node in new flows
- Connect nodes with edges in logical data-flow order
- For llm_agent nodes, write clear, specific instructions
- Keep it simple — use the minimum nodes needed
- When editing, only mutate what the user asked to change
- Position values will be overridden by auto-layout — set them all to {{"x": 0, "y": 0}}
- If the user asks to run/execute the flow, respond with the message "I'll run that for you now." and NO mutations. The frontend will detect this and trigger execution.
"""


def _extract_mutations(text: str) -> list[dict] | None:
    """Extract mutations JSON from the LLM response text."""
    import re
    # Look for ```json ... ``` block containing mutations
    pattern = r'```json\s*(\{.*?\})\s*```'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            return data.get("mutations", [])
        except json.JSONDecodeError:
            return None
    return None


def _clean_message(text: str) -> str:
    """Remove the JSON code block from the message text."""
    import re
    return re.sub(r'```json\s*\{.*?\}\s*```', '', text, flags=re.DOTALL).strip()


@router.post("/")
async def chat(request: ChatRequest) -> dict[str, Any]:
    """Process a chat message and return AI response with optional flow mutations."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Server AI key not configured")

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)
    except ImportError:
        raise HTTPException(status_code=500, detail="OpenAI SDK not available")

    # Build messages for the LLM
    flow_context = f"\n\nCurrent flow state:\n```json\n{json.dumps(request.flow_state, indent=2)}\n```"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    # Add conversation history
    for msg in request.messages[:-1]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add latest message with flow state context
    last_msg = request.messages[-1]
    messages.append({
        "role": last_msg["role"],
        "content": last_msg["content"] + flow_context,
    })

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.3,
            max_tokens=4000,
        )
        raw_text = response.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM call failed: {str(e)}")

    mutations = _extract_mutations(raw_text)
    message = _clean_message(raw_text)

    result: dict[str, Any] = {"message": message}
    if mutations:
        result["mutations"] = mutations

    return result
```

**Step 3: Register the router in main.py**

In `backend/app/main.py`, add:

```python
from app.api.chat import router as chat_router
```

And register it:

```python
app.include_router(chat_router)
```

**Step 4: Write a basic test**

Create `backend/tests/test_chat_api.py`:

```python
"""Tests for the /api/chat endpoint."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_chat_endpoint_exists():
    """The /api/chat endpoint should exist and accept POST."""
    response = client.post("/api/chat", json={
        "messages": [{"role": "user", "content": "hello"}],
        "flow_state": {"nodes": [], "edges": []},
    })
    # Will fail with 500 if no API key, but should not 404
    assert response.status_code != 404


def test_extract_mutations():
    """Test mutation extraction from LLM response text."""
    from app.api.chat import _extract_mutations

    text = '''Here's your flow:
```json
{"mutations": [{"type": "add_node", "node_id": "input-1", "node_type": "input", "config": {}, "position": {"x": 0, "y": 0}}]}
```
'''
    mutations = _extract_mutations(text)
    assert mutations is not None
    assert len(mutations) == 1
    assert mutations[0]["type"] == "add_node"


def test_extract_mutations_no_json():
    """No mutations when response has no JSON block."""
    from app.api.chat import _extract_mutations
    assert _extract_mutations("Just a plain text response") is None


def test_clean_message():
    """Message cleaning removes JSON blocks."""
    from app.api.chat import _clean_message

    text = '''I created your flow.
```json
{"mutations": []}
```
Enjoy!'''
    cleaned = _clean_message(text)
    assert "```json" not in cleaned
    assert "I created your flow." in cleaned
    assert "Enjoy!" in cleaned
```

**Step 5: Run tests**

Run: `cd backend && pytest tests/test_chat_api.py -v`
Expected: All 4 tests pass.

**Step 6: Commit**

```bash
git add backend/app/api/chat.py backend/app/main.py backend/tests/test_chat_api.py
git commit -m "feat: add /api/chat endpoint for AI flow generation"
```

---

### Task 10: Create frontend chat API client

**Files:**
- Modify: `frontend/src/services/api.ts`

**Step 1: Add chat API function**

Add to `frontend/src/services/api.ts`:

```typescript
import type { ChatResponse } from '../types/mutations';

export const chatApi = {
  async send(messages: { role: string; content: string }[], flowState: { nodes: any[]; edges: any[] }): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, flow_state: flowState }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Chat request failed');
    }
    return response.json();
  },
};
```

Note: `API_BASE` should already be defined at the top of `api.ts` (e.g., `http://localhost:8000` or from env).

**Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add chatApi client for /api/chat endpoint"
```

---

### Task 11: Connect AIChatPanel to backend

Wire up the AI chat panel to call `/api/chat`, receive mutations, apply auto-layout, and update the canvas.

**Files:**
- Modify: `frontend/src/components/panels/AIChatPanel.tsx`

**Step 1: Replace the placeholder handleSend**

Replace the `handleSend` function in `AIChatPanel.tsx`:

```typescript
import { chatApi } from '../../services/api';
import { autoLayoutMutations } from '../../utils/autoLayout';
import type { FlowMutation } from '../../types/mutations';

// Inside the component:
const applyMutations = useFlowStore((s) => s.applyMutations);
const nodes = useFlowStore((s) => s.nodes);
const edges = useFlowStore((s) => s.edges);
const getFlowDefinition = useFlowStore((s) => s.getFlowDefinition);

const [isLoading, setIsLoading] = useState(false);

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
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, config: n.data.config, label: n.data.label })),
      edges: edges.map((e) => ({ source: e.source, target: e.target, source_handle: e.sourceHandle, target_handle: e.targetHandle })),
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
```

Also add a loading indicator in the messages area (before `messagesEndRef`):

```tsx
{isLoading && (
  <div className="flex justify-start">
    <div className="bg-gray-800/80 px-3 py-2 rounded-xl text-sm text-gray-400">
      Thinking...
    </div>
  </div>
)}
```

**Step 2: Verify manually**

1. Start both servers
2. Open `/flow` (empty canvas)
3. In the AI chat, type: "Build me a simple flow that takes user input and summarizes it with GPT-4o"
4. AI should respond and nodes should appear on the canvas
5. Type: "Add a web search step before the summarizer"
6. A web search node should appear and connect

**Step 3: Commit**

```bash
git add frontend/src/components/panels/AIChatPanel.tsx
git commit -m "feat: connect AIChatPanel to /api/chat backend with mutation support"
```

---

### Task 12: Add chat history persistence to flow save/load

Save chat messages with the flow so conversations persist across sessions.

**Files:**
- Modify: `frontend/src/store/flowStore.ts` — include `chatMessages` in `getFlowDefinition()` metadata and restore in `loadFlow()`

**Step 1: Save chat in getFlowDefinition**

In the `getFlowDefinition()` method, add chat messages to metadata:

```typescript
metadata: {
  ...existing metadata,
  chat_messages: get().chatMessages,
},
```

**Step 2: Restore chat in loadFlow**

In the `loadFlow()` method, after restoring nodes/edges:

```typescript
const chatMessages = flow.metadata?.chat_messages || [];
set({ chatMessages });
```

**Step 3: Commit**

```bash
git add frontend/src/store/flowStore.ts
git commit -m "feat: persist chat history in flow metadata"
```

---

## Phase 3: Unified Execution

### Task 13: Detect execution intent in AI chat

When the user says "run it" or similar, the AI chat should trigger flow execution instead of sending to the AI backend.

**Files:**
- Modify: `frontend/src/components/panels/AIChatPanel.tsx`

**Step 1: Add execution detection**

Add execution handling in `handleSend`, before the API call:

```typescript
import { flowWebSocket } from '../../services/websocket';
import { credentialsApi } from '../../services/api';

const isRunning = useFlowStore((s) => s.isRunning);

// Inside handleSend, after addMessage('user', text):
const runPatterns = /^(run|execute|run it|try it|go|start|run the flow|run this)/i;
if (runPatterns.test(text)) {
  // Extract optional input from the message (e.g., "run it with 'AI trends'")
  const inputMatch = text.match(/(?:with|using|for)\s+['""](.+?)['""]|(?:with|using|for)\s+(.+)$/i);
  const userInput = inputMatch?.[1] || inputMatch?.[2] || '';

  if (nodes.length === 0) {
    addMessage('system', 'No flow on the canvas yet. Describe what you want to build first!');
    setIsLoading(false);
    return;
  }

  try {
    const creds = await credentialsApi.list();
    if (creds.length === 0) {
      addMessage('system', 'You need an API key to run flows. Add one in the Keys page.');
      setIsLoading(false);
      return;
    }
  } catch { /* don't block */ }

  addMessage('assistant', `Running your flow${userInput ? ` with "${userInput}"` : ''}...`);

  try {
    const flow = getFlowDefinition();
    await flowWebSocket.executeFlow(flow, userInput);

    // Collect output after execution
    const currentNodes = useFlowStore.getState().nodes;
    const outputNode = currentNodes.find((n) => n.type === 'output' && n.data.output);
    const anyOutput = currentNodes.find((n) => n.data.output);
    const result = outputNode?.data.output || anyOutput?.data.output || 'Flow completed with no output.';
    addMessage('assistant', result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Execution failed';
    addMessage('system', msg);
  } finally {
    setIsLoading(false);
  }
  return;
}

// ... rest of handleSend (AI chat API call)
```

**Step 2: Verify manually**

1. Build a flow (via AI chat or manually): Input → LLM Agent → Output
2. Type "run it" in chat
3. Flow should execute, results appear in chat
4. Type "run it with 'latest AI trends'"
5. Flow should execute with that input

**Step 3: Commit**

```bash
git add frontend/src/components/panels/AIChatPanel.tsx
git commit -m "feat: detect execution intent in AI chat and trigger flow runs"
```

---

### Task 14: Remove old ChatPanel component

The old floating `ChatPanel` is now fully replaced by `AIChatPanel`. Clean it up.

**Files:**
- Delete: `frontend/src/components/panels/ChatPanel.tsx` (or keep as backup)
- Modify: `frontend/src/components/canvas/Toolbar.tsx` — remove chat toggle button if not already removed in Task 4

**Step 1: Remove ChatPanel**

Delete or rename `frontend/src/components/panels/ChatPanel.tsx`.

Remove any remaining imports of `ChatPanel` across the codebase.

**Step 2: Clean up Toolbar**

Ensure the chat toggle button (MessageSquare icon) is removed from `Toolbar.tsx` if it still exists.

**Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors referencing ChatPanel.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old ChatPanel — replaced by AIChatPanel"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1-5 | New layout: AI chat left, toolbar bottom, node sidebar collapsible right |
| 2 | 6-12 | AI chat generates and edits flows via natural language |
| 3 | 13-14 | Unified execution in chat, old ChatPanel removed |

Total: 14 tasks across 3 phases. Each phase is independently shippable.

**Parallelization opportunities (for agent teams):**
- Phase 1 Tasks 1-3 are independent (toolbar, sidebar, chat shell)
- Phase 2 Tasks 6-8 are independent (types, store logic, auto-layout)
- Phase 2 Task 9 (backend) and Tasks 6-8 (frontend) are independent
- Phase 3 Tasks 13-14 are sequential
