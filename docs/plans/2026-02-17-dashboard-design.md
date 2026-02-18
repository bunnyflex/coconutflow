# CoconutFlow Dashboard Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add a home dashboard that replaces the "open canvas immediately" behavior, giving users a launchpad to manage their flows, browse templates, and access account settings.

**Architecture:** New `/dashboard` route as the app entry point; canvas stays at `/flow/:id`. Dashboard is a React page with sidebar navigation, three content sections (Recent, My Flows, Templates), and supporting pages (Keys, Docs, Auth). Backend needs new Supabase tables for templates and stars.

**Tech Stack:** React + React Router v6, Tailwind CSS v4, Zustand, Supabase (auth + DB), existing MagicUI components, Geist font.

---

## Design System

Use existing CoconutFlow colors. No new colors introduced.

**Node accent colors** (from `NodeShell.tsx`):
- `input` → blue-400 / `#3b82f6`
- `llm_agent` → indigo-400 / `#6366f1`
- `output` → emerald-400 / `#10b981`
- `conditional` → amber-400 / `#f59e0b`
- `web_search` → cyan-400 / `#06b6d4`
- `knowledge_base` → purple-400 / `#a855f7`
- `firecrawl_scrape` → orange-400 / `#f97316`
- `apify_actor` → rose-400 / `#f43f5e`
- `mcp_server` → teal-400 / `#14b8a6`
- `huggingface_inference` → violet-400 / `#8b5cf6`

**Backgrounds:** `bg-gray-950` (page), `bg-gray-900` (sidebar), `bg-gray-800/50` (cards)
**Borders:** `border-gray-700/60`
**Text:** `text-white` (headings), `text-gray-400` (meta)

---

## Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `DashboardPage` | Home: Recent + My Flows + Templates |
| `/flows` | `MyFlowsPage` | Full paginated My Flows grid |
| `/templates` | `TemplatesPage` | Featured + Community tabs |
| `/flow/:id` | `CanvasPage` (existing) | Flow editor canvas |
| `/keys` | `KeysPage` | API credentials manager |
| `/docs` | `DocsPage` | Internal documentation |
| `/login` | `LoginPage` | Sign in / sign up |
| `/account` | `AccountPage` | Profile + billing settings |

---

## Layout: AppShell

Every authenticated page shares a two-column shell:

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content (flex-grow)  │
└──────────────────────────────────────────────────────┘
```

### Sidebar

```
┌──────────────┐
│ 🥥 CoconutFlow│  ← logo + wordmark
├──────────────┤
│ Home         │  active = indigo left-border + bg
│ My Flows     │
│ Templates    │
│ Keys         │
│ Docs         │
├──────────────┤  ← spacer (flex-grow)
│ [Avatar]     │  ← profile section (bottom-pinned)
│ Username     │
│ ↓ dropdown   │  Account Settings, Sign Out
└──────────────┘
```

Unauthenticated: Show "Sign In" button at bottom instead of avatar.

---

## Dashboard Home (`/`)

Three stacked sections:

### Section 1: Recent (horizontal strip)

```
Recent Flows
──────────────────────────────────────────────────────
[Card] [Card] [Card] [Card]  →  (scroll)
```

Shows last 4 flows ordered by `updated_at`. If none: empty state with "Create your first flow →" CTA.

### Section 2: My Flows (grid)

```
My Flows                              [+ New Flow]  [🔍 Search]
──────────────────────────────────────────────────────────────
[Card] [Card] [Card]
[Card] [Card] [Card]
```

Filterable by tag. Shows all user flows ordered by `updated_at`. Clicking a card opens `/flow/:id`.

### Section 3: Templates (tabbed gallery)

```
Templates
[Featured] [Community]
──────────────────────────────────────────────────────
[TemplateCard] [TemplateCard] [TemplateCard]
[TemplateCard] [TemplateCard] [TemplateCard]
```

"Featured" = curated by CoconutFlow team (seeded in DB).
"Community" = flows published by users.

---

## Flow Card Component

Used in both Recent and My Flows sections.

```
┌──────────────────────────────────────┐
│  ● input  ● llm_agent  ● output      │  ← node type badges (colored dots)
│                                      │
│  Research Pipeline            ⋮      │  ← title + kebab menu
│  Scrapes the web and                 │
│  summarises results                  │  ← description (2 lines max)
│                                      │
│  #research  #scraping                │  ← tag chips
│                                      │
│  5 nodes  ·  2h ago                  │  ← metadata row
└──────────────────────────────────────┘
```

**Node type badges:** Small colored dots using existing accent colors. Show up to 5 unique node types, then "+N more".

**Kebab menu (⋮) actions:**
- Open
- Duplicate (clone to My Flows)
- Rename
- Export Python
- Publish to Community (toggles `is_public` flag)
- Delete (with confirmation)

**Card states:**
- Default: `border-gray-700/60`
- Hover: `border-gray-600` + subtle lift (`translate-y-[-2px]`)
- Active/selected: `border-indigo-500/60`

---

## Template Card Component

Same shape as Flow Card, adds community metadata:

```
┌──────────────────────────────────────┐
│  ● input  ● firecrawl  ● llm_agent   │
│                                      │
│  Competitive Intel Pipeline          │
│  Scrapes competitor sites and        │
│  generates a SWOT analysis           │
│                                      │
│  #research  #competitive             │
│                                      │
│  by @affinitylabs    ★ 42            │
│                   [Use Template]     │  ← CTA
└──────────────────────────────────────┘
```

**"Use Template" action:**
1. Clone flow to user's My Flows (duplicate nodes/edges)
2. Redirect to `/flow/:newId`
3. Show toast: "Template cloned — you're now editing your copy"

---

## Search

Global search bar in the My Flows header. Filters the displayed grid client-side by:
- Flow name
- Flow description
- Tags

Backend search (Supabase full-text) can be added later for scale.

---

## Tags / Categories

Tags are stored as `string[]` in the `flows` table `metadata.tags` JSONB field (already exists).

**Tag UI:**
- Displayed as small colored chips on cards
- Click a tag on a card → filters the grid to that tag
- In flow editor: tag manager in the Save dialog

---

## Keys Page (`/keys`)

Surfaces the existing `credentials` Supabase table.

```
API Keys & Credentials
────────────────────────────────────────────────────
Service          Name           Added        Actions
────────────────────────────────────────────────────
Firecrawl        My Key         3 days ago   [Edit] [Delete]
OpenAI           Production     1 week ago   [Edit] [Delete]
────────────────────────────────────────────────────
                                             [+ Add Key]
```

Keys are masked (`sk-••••••••1234`). Edit = re-enter value. Uses existing `/api/credentials` endpoints (or creates them if missing).

---

## Docs Page (`/docs`)

Internal documentation rendered from Markdown. Structure:

```
Docs
────────────────────────
Getting Started
  · What is CoconutFlow?
  · Your first flow
Node Reference
  · Input
  · LLM Agent
  · Web Search
  · Knowledge Base
  · Conditional
  · Output
  · Firecrawl
  · Apify
  · MCP Server
  · Hugging Face
Tutorials
  · Research Pipeline
  · RAG with documents
API & Export
  · Python export
  · REST API
```

Docs content stored as `.md` files in `frontend/src/docs/`. Rendered with `@tailwindcss/typography`.

---

## Auth Pages

### Login / Signup (`/login`)

Full-screen dark page (no sidebar):

```
┌─────────────────────────────────────┐
│         🥥 CoconutFlow              │
│                                     │
│   [Continue with Google]            │
│         ── or ──                    │
│   Email  ___________________        │
│   Password __________________       │
│                                     │
│   [Sign In]        [Sign Up]        │
│                                     │
│   Forgot password?                  │
└─────────────────────────────────────┘
```

Uses Supabase Auth (email/password + Google OAuth).

### Account Page (`/account`)

- Display name, avatar upload
- Email (read-only if OAuth)
- Change password (email auth only)
- Danger zone: Delete account

---

## Database Changes

### Flows table — add `is_public` column

```sql
ALTER TABLE flows ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE flows ADD COLUMN user_id TEXT;  -- links to Supabase auth.users
```

### New: `flow_stars` table

```sql
CREATE TABLE flow_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id TEXT REFERENCES flows(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flow_id, user_id)
);
```

### New: `profiles` table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Phases

### Phase 1 — Core Dashboard (no auth)
- AppShell + Sidebar
- DashboardPage with Recent + My Flows grid
- FlowCard component with node badges, tags, kebab menu
- React Router setup (add `/`, `/flow/:id` routes)
- Tag filtering + search

### Phase 2 — Templates
- TemplatesPage with Featured/Community tabs
- TemplateCard component
- "Use Template" clone action
- Seed 5–10 featured templates in DB

### Phase 3 — Auth
- Supabase Auth integration
- Login/Signup pages
- Profile section in sidebar
- User-scoped flows (`user_id` on flows table)
- AccountPage

### Phase 4 — Keys + Docs
- KeysPage (surface existing credentials backend)
- DocsPage (Markdown-rendered internal docs)

---

## Missing Nothing? Final Checklist

- [x] Home dashboard (Recent + My Flows + Templates)
- [x] Sidebar navigation
- [x] Flow card with node badges, tags, kebab menu
- [x] Template gallery (Featured + Community tabs)
- [x] Fork/clone from template
- [x] Global search
- [x] Tag filtering
- [x] API credentials manager (Keys page)
- [x] Internal documentation page
- [x] Auth (login, signup, Google OAuth)
- [x] Profile / account management
- [x] Star/upvote for community flows
- [x] Publish flow to community
- [x] Database schema additions
