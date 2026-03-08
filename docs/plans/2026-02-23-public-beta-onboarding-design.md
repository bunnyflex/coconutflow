# Public Beta Onboarding Design

**Date**: 2026-02-23
**Status**: Approved
**Goal**: Get CoconutFlow ready for public beta — strangers can sign up, add their own API key, and build/run AI workflows with zero hand-holding.

## Context

- App is local-only; deployment handled separately by developer
- Users bring their own LLM API keys (BYOK model)
- Auth (Supabase) exists but authorization isn't enforced
- 7 pre-seeded templates exist but use old schema and won't load
- No onboarding flow for new users

## Phase 1: First-Run Experience

### Welcome Modal (shows once after first sign-up)

3-step wizard:
1. **"Welcome to CoconutFlow"** — one-sentence explanation of what it does
2. **"Add your API key"** — inline OpenAI key input that saves to `/api/credentials`. Skip button for later.
3. **"Try your first flow"** — auto-opens a simple Input → Agent → Output template on the canvas

Implementation:
- Track `has_seen_welcome` in localStorage
- Modal component in `components/onboarding/WelcomeModal.tsx`
- Shown on DashboardPage when `has_seen_welcome` is false

### Empty Dashboard State

When user has zero flows, replace blank grid with:
- Hero section: "Build your first AI workflow" + "Create Flow" CTA button
- 3 starter template cards below (simplest working templates)

### BYOK Nudge

When user tries to run a flow without any API key saved:
- Toast notification: "Add an API key in Settings → Keys to run flows"
- Links to `/keys` page

## Phase 2: Working Templates

### 5 Starter Templates (replace old schema)

| Template | Flow Pattern | Category | Complexity |
|----------|-------------|----------|-----------|
| Simple Q&A | Input → LLM Agent → Output | getting-started | Beginner |
| Web Researcher | Input → Web Search → LLM Agent → Output | research | Beginner |
| Content Writer | Input → LLM Agent (outline) → LLM Agent (write) → Output | content | Intermediate |
| Smart Router | Input → Conditional → Agent-A / Agent-B → Output | automation | Intermediate |
| RAG Assistant | Input → Knowledge Base → LLM Agent → Output | data | Advanced |

Requirements:
- Use current node type schema (matching `types/flow.ts` and `models/flow.py`)
- Each template has description, category, tags, author="CoconutFlow"
- Stored in Supabase as `is_featured=true` flows
- Seed script at `scripts/seed_templates.py` inserts via API
- Replace old `docs/workflows/` JSON files with current-schema versions

## Phase 3: Auth + Security Hardening

### CORS Lockdown
- Add `ALLOWED_ORIGINS` env var to backend
- Default to `["http://localhost:5173"]` in dev, production URL in prod
- Replace `allow_origins=["*"]` in `main.py`

### User-Scoped Authorization
- Flows API: enforce `user_id` — users can only GET/PUT/DELETE their own flows
- Featured templates remain visible to all (read-only)
- Pass `user_id` from Supabase JWT or header

### Credentials Scoped to User
- Replace hardcoded `user_id="system"` in `credentials.py`
- Filter credentials by authenticated user's ID
- Each user's keys are isolated

## Phase 4: Landing Page

### Logged-Out Landing (`/`)
- Hero: "Build AI workflows visually" + product screenshot/GIF
- "Get Started" CTA → `/login`
- Brief feature highlights (3 cards: visual builder, BYOK, templates)

### Routing Logic
- Logged-in users: `/` → DashboardPage (current behavior)
- Logged-out users: `/` → LandingPage
- Check `authStore.user` to decide

## Phasing Summary

| Phase | Scope | Dependencies |
|-------|-------|-------------|
| Phase 1 | First-run experience | None |
| Phase 2 | Working templates | None (parallel with Phase 1) |
| Phase 3 | Auth hardening | Phases 1-2 should be done first |
| Phase 4 | Landing page | Phase 3 (needs auth routing) |
