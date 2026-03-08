# Public Beta Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get CoconutFlow ready for public beta — new users can sign up, add their API key, run a starter template, and build their own workflows with zero hand-holding.

**Architecture:** Four phases executed sequentially — fix existing TS errors, build first-run onboarding UX, create working seed templates, harden auth/CORS, and add a logged-out landing page. Frontend-first for phases 1-2 (user-facing), backend-first for phase 3 (security).

**Tech Stack:** React 18, Zustand, React Router 6, Tailwind CSS 4, FastAPI, Supabase Auth, Fernet encryption

---

## Phase 0: Fix Existing TypeScript Errors

### Task 1: Fix flowStore knowledge_base defaults

The `knowledge_base` default config in `flowStore.ts` is missing `sources` and `chunk_overlap` fields required by `KnowledgeBaseNodeConfig` in `types/flow.ts`. This causes a TS error and may cause runtime issues.

**Files:**
- Modify: `frontend/src/store/flowStore.ts:133`

**Step 1: Fix the defaults**

In `frontend/src/store/flowStore.ts`, line 133, change:
```typescript
knowledge_base: { files: [], chunk_size: 1000, top_k: 5, search_type: 'hybrid' },
```
to:
```typescript
knowledge_base: { files: [], sources: [], chunk_size: 1000, chunk_overlap: 200, top_k: 5, search_type: 'hybrid' },
```

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep flowStore`
Expected: No flowStore errors

**Step 3: Commit**

```bash
git add frontend/src/store/flowStore.ts
git commit -m "fix: add missing sources and chunk_overlap to KB defaults in flowStore"
```

### Task 2: Fix remaining TS warnings

Clean up unused imports flagged by `tsc`.

**Files:**
- Modify: `frontend/src/components/ui/Toast.tsx:1` — remove unused `useState`, `useCallback`
- Modify: `frontend/src/pages/CanvasPage.tsx:10` — remove unused `FlowDefinition` import
- Modify: `frontend/src/services/websocket.ts:30-31` — remove unused `reconnectAttempts`, `maxReconnectAttempts`

**Step 1: Fix each file**

Toast.tsx — remove `useState` and `useCallback` from the import line (keep other imports).

CanvasPage.tsx — remove the `FlowDefinition` import line.

websocket.ts — remove the `reconnectAttempts` and `maxReconnectAttempts` variable declarations.

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Only the FlowManager.tsx type mismatch remains (non-critical, `as` cast issue)

**Step 3: Commit**

```bash
git add frontend/src/components/ui/Toast.tsx frontend/src/pages/CanvasPage.tsx frontend/src/services/websocket.ts
git commit -m "fix: remove unused imports and variables"
```

---

## Phase 1: First-Run Experience

### Task 3: Create WelcomeModal component

A 3-step wizard shown once after first sign-up. Steps: welcome message, API key input, "try your first flow" CTA.

**Files:**
- Create: `frontend/src/components/onboarding/WelcomeModal.tsx`

**Step 1: Create the component**

Create `frontend/src/components/onboarding/WelcomeModal.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Key, Sparkles, ArrowRight, Loader2, Check } from 'lucide-react';
import { credentialsApi } from '../../services/api';

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setStep(2);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await credentialsApi.create({
        service_name: 'openai',
        credential_name: 'OpenAI API Key',
        api_key: apiKey.trim(),
      });
      setSaved(true);
      setTimeout(() => setStep(2), 800);
    } catch {
      setError('Failed to save key. You can add it later in Settings → Keys.');
    } finally {
      setSaving(false);
    }
  };

  const handleTryTemplate = () => {
    localStorage.setItem('coconut_has_seen_welcome', 'true');
    onClose();
    navigate('/templates');
  };

  const handleSkip = () => {
    localStorage.setItem('coconut_has_seen_welcome', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= step ? 'w-8 bg-indigo-500' : 'w-4 bg-gray-700'
                }`}
              />
            ))}
          </div>
          <button onClick={handleSkip} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Sparkles className="text-indigo-400" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">Welcome to CoconutFlow</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Build AI workflows visually — drag nodes, connect them, and run powerful agent pipelines without writing code.
              </p>
              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Get Started <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 1: API Key */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Key className="text-amber-400" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">Add your API key</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                CoconutFlow uses your own API keys to run AI models. Add an OpenAI key to get started.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2.5 text-gray-400 hover:text-white text-sm font-medium rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleSaveKey}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saved && <Check size={14} />}
                  {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Key'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Try a template */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Sparkles className="text-emerald-400" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">You're all set!</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Start with a template or create a flow from scratch. You can always add more API keys later in the Keys page.
              </p>
              <button
                onClick={handleTryTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Browse Templates <ArrowRight size={16} />
              </button>
              <button
                onClick={handleSkip}
                className="w-full px-4 py-2.5 text-gray-400 hover:text-white text-sm font-medium rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/onboarding/WelcomeModal.tsx
git commit -m "feat: add WelcomeModal onboarding wizard component"
```

### Task 4: Integrate WelcomeModal into DashboardPage

Show the modal on first visit (tracked via localStorage).

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

**Step 1: Add modal integration**

At the top of DashboardPage.tsx, add imports:
```typescript
import { WelcomeModal } from '../components/onboarding/WelcomeModal';
```

Inside the component, add state:
```typescript
const [showWelcome, setShowWelcome] = useState(() => {
  return !localStorage.getItem('coconut_has_seen_welcome');
});
```

Before the closing `</AppShell>`, add:
```tsx
{showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
```

**Step 2: Verify manually**

Open http://localhost:5173 in an incognito window. Should see the welcome modal. Click through all 3 steps. Refresh — modal should not reappear.

**Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: show WelcomeModal on first visit to dashboard"
```

### Task 5: Add empty dashboard state

When a user has zero flows, show a hero section + starter template cards instead of a blank grid.

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

**Step 1: Add empty state UI**

Find the section in DashboardPage that renders when there are no flows (the grid/list). Add an empty state block that shows when `flows.length === 0 && !loading`:

```tsx
{!loading && flows.length === 0 && (
  <div className="text-center py-16 space-y-6">
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-white">Build your first AI workflow</h2>
      <p className="text-gray-400 text-sm max-w-md mx-auto">
        Drag nodes onto a canvas, connect them, and run powerful AI pipelines. Start from a template or create from scratch.
      </p>
    </div>
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate('/flow')}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Create Flow
      </button>
      <button
        onClick={() => navigate('/templates')}
        className="px-5 py-2.5 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
      >
        Browse Templates
      </button>
    </div>
  </div>
)}
```

**Step 2: Verify manually**

Sign up as a new user (or clear flows). Dashboard should show hero state instead of empty grid.

**Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: add empty dashboard state with CTA for new users"
```

### Task 6: Add BYOK nudge toast

When a user runs a flow without any saved API credentials, show a toast linking to the Keys page.

**Files:**
- Modify: `frontend/src/services/websocket.ts` (or the component that initiates execution)
- Modify: `frontend/src/components/panels/ChatPanel.tsx` (where the user clicks "Run")

**Step 1: Find the execution trigger**

Look at `ChatPanel.tsx` — find where execution is triggered (the send/run handler). Before sending the WebSocket message, check if the user has any credentials:

```typescript
import { credentialsApi } from '../../services/api';
```

In the run/send handler, add a check before executing:
```typescript
// Check if user has any API keys before running
try {
  const creds = await credentialsApi.list();
  if (creds.length === 0) {
    // Show toast or inline warning
    addToast('Add an API key in Keys to run flows', 'warning', '/keys');
    return;
  }
} catch {
  // Don't block execution if credentials check fails
}
```

Note: Adapt this to however the toast system works in `components/ui/Toast.tsx`. If the toast doesn't support links, show a plain message: "Add an API key in Settings → Keys to run flows".

**Step 2: Verify manually**

Remove all credentials from Keys page. Try to run a flow from Chat panel. Should see toast warning.

**Step 3: Commit**

```bash
git add frontend/src/components/panels/ChatPanel.tsx
git commit -m "feat: show BYOK nudge when running flow without API keys"
```

---

## Phase 2: Working Templates

### Task 7: Update seed templates to current schema

The existing seed script at `backend/scripts/seed_templates.py` already has 5 templates. Verify they use the current node type schema matching `types/flow.ts` and `models/flow.py`. Update any stale configs.

**Files:**
- Modify: `backend/scripts/seed_templates.py`

**Step 1: Audit current templates**

Read `backend/scripts/seed_templates.py` fully. Check each template's nodes use valid `NodeType` values from `models/flow.py` and config shapes match the Pydantic models. Key things to verify:
- Node types are from the enum: `input`, `llm_agent`, `web_search`, `knowledge_base`, `conditional`, `output`, `firecrawl_scrape`, `apify_actor`, `mcp_server`, `huggingface_inference`
- Config keys match the Pydantic model field names (e.g., `model_provider` not `provider`, `instructions` not `system_prompt`)
- Edge handles use the correct format (`output` for source, `input` for target; conditional uses `true`/`false` handles)

**Step 2: Fix any schema mismatches**

Update templates in the seed script to match current schema. Each template should include:
- `is_featured: True`
- `is_public: True`
- `category` (one of: research, content, automation, data)
- `metadata.author: "CoconutFlow"`
- `metadata.tags: [...]` (2-3 relevant tags)

**Step 3: Test the seed script**

Run:
```bash
cd backend && python3 scripts/seed_templates.py
```
Expected: Templates inserted (or skipped if already exist)

**Step 4: Verify templates load in frontend**

Open http://localhost:5173/templates — Featured tab should show the templates. Click "Use Template" on one — should open on the canvas with correct node layout.

**Step 5: Commit**

```bash
git add backend/scripts/seed_templates.py
git commit -m "fix: update seed templates to match current node schema"
```

### Task 8: Remove old workflow JSON files

The files in `docs/workflows/` use the old schema and are now replaced by the seed script.

**Files:**
- Delete: `docs/workflows/code-review-assistant.json`
- Delete: `docs/workflows/competitive-intelligence.json`
- Delete: `docs/workflows/lead-enrichment.json`
- Delete: `docs/workflows/local-dev-helper.json`
- Delete: `docs/workflows/research-synthesis.json`
- Delete: `docs/workflows/social-media-analytics.json`
- Delete: `docs/workflows/translation-pipeline.json`
- Keep: `docs/workflows/README.md` (update to reference seed script)

**Step 1: Remove old files, update README**

```bash
rm docs/workflows/code-review-assistant.json docs/workflows/competitive-intelligence.json docs/workflows/lead-enrichment.json docs/workflows/local-dev-helper.json docs/workflows/research-synthesis.json docs/workflows/social-media-analytics.json docs/workflows/translation-pipeline.json
```

Update `docs/workflows/README.md` to say templates are now seeded via `backend/scripts/seed_templates.py`.

**Step 2: Commit**

```bash
git add -A docs/workflows/
git commit -m "chore: remove old-schema workflow JSONs, templates now seeded via script"
```

---

## Phase 3: Auth + Security Hardening

### Task 9: Lock down CORS

Replace the wildcard CORS with an env-var-driven allowed origins list.

**Files:**
- Modify: `backend/app/main.py:37-43`

**Step 1: Write the failing test**

Create `backend/tests/test_cors.py`:
```python
import pytest
from unittest.mock import patch
import os


def test_cors_uses_env_var():
    """CORS should read ALLOWED_ORIGINS from env, not use wildcard."""
    with patch.dict(os.environ, {"ALLOWED_ORIGINS": "https://myapp.com,https://staging.myapp.com"}):
        # Re-import to pick up env change
        import importlib
        import app.main as main_mod
        importlib.reload(main_mod)

        # Check that the middleware was configured (inspect app middleware stack)
        cors_middleware = None
        for middleware in main_mod.app.user_middleware:
            if 'CORSMiddleware' in str(middleware):
                cors_middleware = middleware
                break

        assert cors_middleware is not None
```

Note: This test may need adaptation based on how FastAPI exposes middleware config. An alternative is to just test the response headers directly:

```python
from fastapi.testclient import TestClient


def test_cors_rejects_unknown_origin():
    """Requests from unknown origins should not get CORS headers."""
    os.environ["ALLOWED_ORIGINS"] = "https://myapp.com"
    import importlib
    import app.main as main_mod
    importlib.reload(main_mod)

    client = TestClient(main_mod.app)
    response = client.get("/health", headers={"Origin": "https://evil.com"})
    assert "access-control-allow-origin" not in response.headers
```

**Step 2: Implement CORS lockdown**

In `backend/app/main.py`, replace the CORS block:
```python
import os

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Step 3: Verify**

Run: `cd backend && pytest tests/test_cors.py -v`
Expected: PASS

Also verify dev still works: open http://localhost:5173, check browser console for CORS errors.

**Step 4: Commit**

```bash
git add backend/app/main.py backend/tests/test_cors.py
git commit -m "feat: lock down CORS to ALLOWED_ORIGINS env var"
```

### Task 10: Scope credentials to authenticated user

Replace hardcoded `user_id="system"` with actual user ID from request.

**Files:**
- Modify: `backend/app/api/credentials.py`

**Step 1: Add user_id parameter**

In each endpoint, accept `user_id` as a query parameter (matching the pattern in `flows.py`):

For `create_credential`: change `"user_id": "system"` to `"user_id": user_id` where `user_id` comes from the request.

For `list_credentials`: add `.eq("user_id", user_id)` filter.

For `delete_credential`: add `.eq("user_id", user_id)` to the delete query for safety.

```python
@router.post("/", status_code=201, response_model=CredentialResponse)
async def create_credential(payload: CredentialCreate, user_id: str = "system") -> dict:
    # ... existing code, but use the user_id parameter
    row = {
        "service_name": payload.service_name,
        "credential_name": payload.credential_name,
        "encrypted_key": encrypted,
        "user_id": user_id,
    }
```

**Step 2: Update frontend to pass user_id**

In `frontend/src/services/api.ts`, update `credentialsApi.list()` and `credentialsApi.create()` to include `?user_id={userId}` query param from the auth store.

**Step 3: Test manually**

Sign in as a user, add a key, verify it appears. Sign in as different user (or sign out), verify keys are separate.

**Step 4: Commit**

```bash
git add backend/app/api/credentials.py frontend/src/services/api.ts
git commit -m "feat: scope credentials to authenticated user"
```

### Task 11: Enforce flow ownership

Currently `flows.py` filters by `user_id` but doesn't enforce it — anyone can GET/PUT/DELETE any flow by ID.

**Files:**
- Modify: `backend/app/api/flows.py`

**Step 1: Add ownership checks**

For `get_flow`, `update_flow`, `delete_flow` — after fetching the flow, verify the `user_id` matches. Featured templates (`is_featured=True`) should remain readable by all.

In `update_flow` and `delete_flow`:
```python
# After fetching the flow:
if row.get("user_id") and row["user_id"] != user_id:
    raise HTTPException(status_code=403, detail="Not authorized to modify this flow")
```

Add `user_id: Optional[str] = None` parameter to the update and delete endpoints.

**Step 2: Test manually**

Try to delete another user's flow — should get 403.

**Step 3: Commit**

```bash
git add backend/app/api/flows.py
git commit -m "feat: enforce flow ownership on update and delete"
```

---

## Phase 4: Landing Page

### Task 12: Create LandingPage component

A simple marketing page for logged-out users.

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`

**Step 1: Create the component**

```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Workflow, Key, BookOpen } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800/60">
        <span className="text-lg font-semibold text-white tracking-tight">CoconutFlow</span>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Build AI workflows <span className="text-indigo-400">visually</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl">
          Drag, connect, and run powerful AI agent pipelines — no code required. Bring your own API keys and start building in minutes.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors text-base"
        >
          Get Started Free <ArrowRight size={18} />
        </button>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 pb-16 max-w-4xl mx-auto w-full">
        {[
          { icon: Workflow, title: 'Visual Builder', desc: 'Drag nodes onto a canvas and connect them into AI pipelines' },
          { icon: Key, title: 'Bring Your Own Keys', desc: 'Use your own OpenAI, Anthropic, or Google API keys — we never store them in plaintext' },
          { icon: BookOpen, title: 'Starter Templates', desc: 'Pick from ready-made templates for research, content writing, and more' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5 space-y-3">
            <Icon className="text-indigo-400" size={24} />
            <h3 className="text-white font-medium text-sm">{title}</h3>
            <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/LandingPage.tsx
git commit -m "feat: add LandingPage for logged-out users"
```

### Task 13: Route logged-out users to LandingPage

Update the root route to show LandingPage for logged-out users and DashboardPage for logged-in users.

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add auth-aware routing**

```tsx
import { LandingPage } from './pages/LandingPage';
import { useAuthStore } from './store/authStore';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  // Don't flash landing page while auth is loading
  if (loading) return null;

  return (
    <>
      <Routes>
        <Route path="/" element={user ? <DashboardPage /> : <LandingPage />} />
        {/* ... rest of routes unchanged */}
      </Routes>
      <ToastContainer />
    </>
  );
}
```

**Step 2: Verify manually**

- Logged out: http://localhost:5173/ → shows landing page
- Click "Get Started" → goes to /login
- After login: http://localhost:5173/ → shows dashboard

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: route logged-out users to LandingPage"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 0 | 1-2 | Fix TS errors, clean codebase |
| 1 | 3-6 | Welcome modal, empty state, BYOK nudge |
| 2 | 7-8 | Working seed templates, remove old JSONs |
| 3 | 9-11 | CORS lockdown, user-scoped credentials + flows |
| 4 | 12-13 | Landing page with auth-aware routing |

Total: 13 tasks, ~4 phases, each phase independently shippable.
