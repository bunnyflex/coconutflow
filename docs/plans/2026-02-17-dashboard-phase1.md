# Dashboard Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add a home dashboard at `/` with Recent + My Flows grid, search, and tag filtering — replacing the current "open canvas immediately" behavior.

**Architecture:** Install react-router-dom, split App.tsx into two routes (`/` = DashboardPage, `/flow/:id` = CanvasPage). Add AppShell with sidebar for all dashboard pages. FlowCard component shows node badges, tags, and actions. Canvas page loads flow from URL param on mount.

**Tech Stack:** React 18, react-router-dom v6 (new), Zustand, Tailwind CSS v4, lucide-react, existing MagicUI components, Supabase via existing `flowApi`.

---

## Task 1: Install react-router-dom + wire up routes

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx` (gut and replace)
- Create: `frontend/src/pages/CanvasPage.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx` (stub only)

**Step 1: Install react-router-dom**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npm install react-router-dom@6
```

Expected: `added N packages` — no errors.

**Step 2: Wrap app in BrowserRouter in main.tsx**

Read `frontend/src/main.tsx` first. It likely calls `ReactDOM.createRoot(...).render(<App />)`.

Replace with:
```tsx
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 3: Create `frontend/src/pages/CanvasPage.tsx`**

Move the entire canvas layout from App.tsx into this file:

```tsx
import { ReactFlowProvider } from 'reactflow';
import { FlowCanvas } from '../components/canvas/FlowCanvas';
import { NodeSidebar } from '../components/panels/NodeSidebar';
import { ConfigPanel } from '../components/panels/ConfigPanel';
import { ChatPanel } from '../components/panels/ChatPanel';
import { useFlowStore } from '../store/flowStore';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { flowApi } from '../services/api';

export function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const { flowId, loadFlow, isChatOpen } = useFlowStore();

  useEffect(() => {
    if (id && id !== flowId) {
      flowApi.get(id).then((flow) => loadFlow(flow)).catch(console.error);
    }
  }, [id]);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen bg-gray-950 overflow-hidden">
        <NodeSidebar />
        <FlowCanvas />
        <ConfigPanel />
        {isChatOpen && <ChatPanel />}
      </div>
    </ReactFlowProvider>
  );
}
```

**Step 4: Create stub `frontend/src/pages/DashboardPage.tsx`**

```tsx
export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">Dashboard coming soon</p>
    </div>
  );
}
```

**Step 5: Replace App.tsx with router**

```tsx
import { Routes, Route } from 'react-router-dom';
import { CanvasPage } from './pages/CanvasPage';
import { DashboardPage } from './pages/DashboardPage';
import { Toaster } from './components/ui/Toast';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/flow" element={<CanvasPage />} />
        <Route path="/flow/:id" element={<CanvasPage />} />
      </Routes>
      <Toaster />
    </>
  );
}
```

> Note: Check the actual import path for `Toaster` by reading the existing App.tsx before replacing it.

**Step 6: Verify it works**

```bash
export PATH="/opt/homebrew/bin:$PATH"
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
npx vite build --mode development 2>&1 | grep -E "error|Error|warning"
```

Expected: No TypeScript errors. (No test file for this task — routing is verified by build.)

**Step 7: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/main.tsx frontend/src/App.tsx frontend/src/pages/
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add react-router-dom, split canvas into CanvasPage, add DashboardPage stub"
```

---

## Task 2: AppShell + Sidebar

**Files:**
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`

**Step 1: Create `frontend/src/components/layout/Sidebar.tsx`**

```tsx
import { Home, Layers, BookOpen, Key, FileText } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/flows', icon: Layers, label: 'My Flows' },
  { to: '/templates', icon: BookOpen, label: 'Templates' },
  { to: '/keys', icon: Key, label: 'Keys' },
  { to: '/docs', icon: FileText, label: 'Docs' },
];

export function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-700/60 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-700/60">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 text-white font-semibold text-lg hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">🥥</span>
          <span>CoconutFlow</span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-400 border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Profile stub — Phase 3 will fill this in with auth */}
      <div className="px-5 py-4 border-t border-gray-700/60">
        <button className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors w-full">
          <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold">
            U
          </div>
          <span>Account</span>
        </button>
      </div>
    </aside>
  );
}
```

**Step 2: Create `frontend/src/components/layout/AppShell.tsx`**

```tsx
import { Sidebar } from './Sidebar';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen bg-gray-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

**Step 3: Update DashboardPage to use AppShell**

```tsx
import { AppShell } from '../components/layout/AppShell';

export function DashboardPage() {
  return (
    <AppShell>
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-gray-400 mt-2">Your flows will appear here.</p>
      </div>
    </AppShell>
  );
}
```

**Step 4: Verify build**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npx vite build --mode development 2>&1 | grep -E "^.*error" | head -20
```

Expected: No errors.

**Step 5: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/components/layout/ frontend/src/pages/DashboardPage.tsx
git commit -m "feat: add AppShell and Sidebar navigation"
```

---

## Task 3: FlowCard component

**Files:**
- Create: `frontend/src/components/dashboard/FlowCard.tsx`

The card shows: node type colored dots, flow name, description, tags, node count, last modified, and a kebab menu.

**Step 1: Create `frontend/src/components/dashboard/FlowCard.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, ExternalLink, Copy, Trash2, Download } from 'lucide-react';
import type { FlowDefinition, NodeType } from '../../types/flow';

// Accent colors matching NodeShell.tsx exactly
const NODE_COLORS: Record<NodeType, string> = {
  input: '#3b82f6',
  output: '#10b981',
  llm_agent: '#6366f1',
  conditional: '#f59e0b',
  web_search: '#06b6d4',
  knowledge_base: '#a855f7',
  firecrawl_scrape: '#f97316',
  apify_actor: '#f43f5e',
  mcp_server: '#14b8a6',
  huggingface_inference: '#8b5cf6',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface FlowCardProps {
  flow: FlowDefinition;
  onDelete: (id: string) => void;
  onDuplicate: (flow: FlowDefinition) => void;
}

export function FlowCard({ flow, onDelete, onDuplicate }: FlowCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Unique node types in order of appearance
  const nodeTypes = [...new Set(flow.nodes.map((n) => n.type))].slice(0, 5) as NodeType[];
  const extraCount = flow.nodes.length > 5 ? flow.nodes.length - 5 : 0;

  const tags: string[] = (flow.metadata?.tags as string[]) ?? [];
  const updatedAt = flow.metadata?.updated_at as string | undefined;

  return (
    <div
      className="relative bg-gray-800/50 border border-gray-700/60 rounded-xl p-4 cursor-pointer hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-150 group"
      onClick={() => navigate(`/flow/${flow.id}`)}
    >
      {/* Node type dots */}
      <div className="flex items-center gap-1.5 mb-3">
        {nodeTypes.map((type) => (
          <span
            key={type}
            title={type}
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: NODE_COLORS[type] ?? '#6b7280' }}
          />
        ))}
        {extraCount > 0 && (
          <span className="text-xs text-gray-500">+{extraCount}</span>
        )}
      </div>

      {/* Title + kebab */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-white text-sm leading-snug line-clamp-1">
          {flow.name || 'Untitled Flow'}
        </h3>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* Description */}
      {flow.description && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{flow.description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>{flow.nodes.length} node{flow.nodes.length !== 1 ? 's' : ''}</span>
        {updatedAt && (
          <>
            <span>·</span>
            <span>{timeAgo(updatedAt)}</span>
          </>
        )}
      </div>

      {/* Kebab dropdown */}
      {menuOpen && (
        <div
          className="absolute right-3 top-10 z-20 bg-gray-900 border border-gray-700/60 rounded-lg shadow-xl py-1 w-44"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { icon: ExternalLink, label: 'Open', action: () => navigate(`/flow/${flow.id}`) },
            { icon: Copy, label: 'Duplicate', action: () => { onDuplicate(flow); setMenuOpen(false); } },
            { icon: Download, label: 'Export Python', action: () => { window.open(`/api/flows/${flow.id}/export/python`); setMenuOpen(false); } },
            { icon: Trash2, label: 'Delete', action: () => { onDelete(flow.id!); setMenuOpen(false); }, danger: true },
          ].map(({ icon: Icon, label, action, danger }) => (
            <button
              key={label}
              onClick={action}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npx vite build --mode development 2>&1 | grep -E "^.*error" | head -20
```

Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/components/dashboard/FlowCard.tsx
git commit -m "feat: add FlowCard component with node badges, tags, and kebab menu"
```

---

## Task 4: DashboardPage — fetch + display Recent + My Flows

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx` (full implementation)
- Modify: `frontend/src/services/api.ts` (add `duplicate` method)

**Step 1: Add `duplicate` method to `frontend/src/services/api.ts`**

Read the file first, then add after `exportPython`:

```typescript
async duplicate(id: string): Promise<FlowDefinition> {
  const original = await this.get(id);
  const copy = {
    ...original,
    id: undefined,
    name: `${original.name} (copy)`,
    metadata: {
      ...original.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  return this.create(copy as FlowDefinition);
},
```

**Step 2: Implement `frontend/src/pages/DashboardPage.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { FlowCard } from '../components/dashboard/FlowCard';
import { flowApi } from '../services/api';
import type { FlowDefinition } from '../types/flow';

export function DashboardPage() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await flowApi.list();
      // Sort by updated_at descending
      const sorted = [...data].sort((a, b) => {
        const aDate = (a.metadata?.updated_at as string) ?? '';
        const bDate = (b.metadata?.updated_at as string) ?? '';
        return bDate.localeCompare(aDate);
      });
      setFlows(sorted);
    } catch (e) {
      setError('Failed to load flows. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flow? This cannot be undone.')) return;
    await flowApi.delete(id);
    setFlows((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDuplicate = async (flow: FlowDefinition) => {
    const copy = await flowApi.duplicate(flow.id!);
    setFlows((prev) => [copy, ...prev]);
  };

  const handleNew = () => {
    navigate('/flow');
  };

  const recent = flows.slice(0, 4);

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">My Flows</h1>
            <p className="text-gray-400 text-sm mt-1">Build and manage your AI workflows</p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Flow
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading flows...</span>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm py-4 px-4 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        {!loading && !error && flows.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm">No flows yet.</p>
            <button
              onClick={handleNew}
              className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm underline"
            >
              Create your first flow →
            </button>
          </div>
        )}

        {!loading && flows.length > 0 && (
          <>
            {/* Recent strip */}
            <section className="mb-10">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Recent</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recent.map((flow) => (
                  <div key={flow.id} className="w-64 flex-shrink-0">
                    <FlowCard flow={flow} onDelete={handleDelete} onDuplicate={handleDuplicate} />
                  </div>
                ))}
              </div>
            </section>

            {/* All flows grid */}
            <section>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">All Flows</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {flows.map((flow) => (
                  <FlowCard key={flow.id} flow={flow} onDelete={handleDelete} onDuplicate={handleDuplicate} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
```

**Step 3: Verify build**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npx vite build --mode development 2>&1 | grep -E "error" | head -20
```

Expected: No errors.

**Step 4: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/pages/DashboardPage.tsx frontend/src/services/api.ts
git commit -m "feat: implement DashboardPage with Recent + My Flows grid"
```

---

## Task 5: Search + Tag filter

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

Add a search bar and tag filter above the All Flows grid. Filtering is client-side only.

**Step 1: Add search + tag state and filter logic to DashboardPage**

After the existing state declarations, add:

```tsx
const [search, setSearch] = useState('');
const [activeTag, setActiveTag] = useState<string | null>(null);
```

Compute filtered flows and all unique tags:

```tsx
// All unique tags across all flows
const allTags = [...new Set(flows.flatMap((f) => (f.metadata?.tags as string[]) ?? []))].sort();

// Filtered for All Flows grid (not applied to Recent strip)
const filteredFlows = flows.filter((f) => {
  const q = search.toLowerCase();
  const matchesSearch =
    !q ||
    f.name?.toLowerCase().includes(q) ||
    f.description?.toLowerCase().includes(q) ||
    ((f.metadata?.tags as string[]) ?? []).some((t) => t.toLowerCase().includes(q));
  const matchesTag = !activeTag || ((f.metadata?.tags as string[]) ?? []).includes(activeTag);
  return matchesSearch && matchesTag;
});
```

**Step 2: Add search bar + tag chips above the All Flows grid**

Replace the `<section>` for All Flows with:

```tsx
<section>
  <div className="flex items-center gap-3 mb-4 flex-wrap">
    <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">All Flows</h2>

    {/* Search */}
    <div className="flex-1 min-w-48 max-w-xs">
      <input
        type="text"
        placeholder="Search flows..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700/60 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
      />
    </div>

    {/* Tag chips */}
    {allTags.length > 0 && (
      <div className="flex gap-1.5 flex-wrap">
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              activeTag === tag
                ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-400'
                : 'bg-gray-800 border-gray-700/60 text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>
    )}
  </div>

  {filteredFlows.length === 0 && (search || activeTag) ? (
    <p className="text-gray-500 text-sm py-8 text-center">
      No flows match your filters.{' '}
      <button
        onClick={() => { setSearch(''); setActiveTag(null); }}
        className="text-indigo-400 hover:text-indigo-300 underline"
      >
        Clear filters
      </button>
    </p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredFlows.map((flow) => (
        <FlowCard key={flow.id} flow={flow} onDelete={handleDelete} onDuplicate={handleDuplicate} />
      ))}
    </div>
  )}
</section>
```

**Step 3: Verify build**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npx vite build --mode development 2>&1 | grep -E "error" | head -20
```

Expected: No errors.

**Step 4: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: add search and tag filter to dashboard"
```

---

## Task 6: "New Flow" navigates to canvas + back button on canvas

When the user clicks "New Flow" on the dashboard, they navigate to `/flow` which opens a blank canvas. We need a way to get back to the dashboard from the canvas.

**Files:**
- Modify: `frontend/src/components/canvas/Toolbar.tsx`

**Step 1: Read Toolbar.tsx first**

Read `frontend/src/components/canvas/Toolbar.tsx` to see the current buttons and their layout.

**Step 2: Add a "← Home" button to Toolbar.tsx**

Add at the very left of the toolbar (before the existing buttons):

```tsx
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

// Inside the component:
const navigate = useNavigate();

// In JSX, first button in the toolbar:
<button
  onClick={() => navigate('/')}
  title="Back to dashboard"
  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700/60 rounded-lg transition-colors border border-gray-700/40"
>
  <Home size={13} />
  <span>Home</span>
</button>
```

**Step 3: Verify build**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend
export PATH="/opt/homebrew/bin:$PATH"
npx vite build --mode development 2>&1 | grep -E "error" | head -20
```

Expected: No errors.

**Step 4: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main
git add frontend/src/components/canvas/Toolbar.tsx
git commit -m "feat: add Home button to canvas toolbar for dashboard navigation"
```

---

## Final Verification

After all tasks complete:

1. Start dev server: `export PATH="/opt/homebrew/bin:$PATH" && cd frontend && npx vite --port 5173`
2. Open `http://localhost:5173` — should show Dashboard (not canvas)
3. Verify: Recent strip shows last 4 flows, grid shows all flows
4. Verify: Search filters the grid in real-time
5. Verify: Clicking a tag chip filters the grid
6. Verify: Clicking a flow card opens the canvas at `/flow/:id`
7. Verify: "New Flow" button navigates to `/flow` (blank canvas)
8. Verify: "Home" button in canvas toolbar returns to `/`
9. Verify: Sidebar nav links are highlighted correctly per route
10. Verify: Duplicate in kebab menu creates a copy and shows it in the grid
