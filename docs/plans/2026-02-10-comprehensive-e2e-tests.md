# Comprehensive E2E Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand Playwright E2E test coverage beyond smoke tests to validate complete workflow execution, JSON loading, and real-time streaming behavior.

**Architecture:** Build on existing Playwright infrastructure (`e2e/workflow-smoke-test.spec.ts`) to test actual workflow execution with mocked APIs. Tests will validate the full compile-execute pipeline: canvas UI → WebSocket → backend compiler → execution engine → streaming results.

**Tech Stack:** Playwright, TypeScript, Mock Service Worker (MSW) for API mocking, WebSocket testing

---

## Prerequisites

**Completed:**
- ✅ Playwright smoke test passing (5/5 tests)
- ✅ 7 workflow JSON definitions in `docs/workflows/`
- ✅ Frontend dev server pattern established
- ✅ Helper functions (`dragNodeToCanvas`, `connectNodes`)

**Required:**
- Frontend server running on port 5173 or 5174
- Backend server running on port 8000
- Playwright installed and configured

---

## Task 1: Create WebSocket Testing Infrastructure

**Files:**
- Create: `e2e/helpers/websocket-mock.ts`
- Create: `e2e/helpers/execution-events.ts`

**Step 1: Write failing test for WebSocket connection**

```typescript
// e2e/workflow-execution.spec.ts
import { test, expect } from '@playwright/test';

test('should connect to WebSocket and receive events', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Mock WebSocket connection
  const messages: any[] = [];
  await page.exposeFunction('captureWSMessage', (msg: any) => {
    messages.push(msg);
  });

  // Intercept WebSocket messages
  await page.addInitScript(() => {
    const originalWebSocket = (window as any).WebSocket;
    (window as any).WebSocket = function(url: string) {
      const ws = new originalWebSocket(url);
      ws.addEventListener('message', (event) => {
        (window as any).captureWSMessage(JSON.parse(event.data));
      });
      return ws;
    };
  });

  // Build simple workflow and execute
  // ...

  expect(messages.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts`
Expected: FAIL - WebSocket testing infrastructure doesn't exist yet

**Step 3: Create WebSocket mock helper**

```typescript
// e2e/helpers/websocket-mock.ts
import type { Page } from '@playwright/test';

export interface ExecutionEvent {
  type: 'node_start' | 'node_output' | 'node_complete' | 'flow_complete' | 'error';
  node_id?: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

export async function setupWebSocketCapture(page: Page): Promise<ExecutionEvent[]> {
  const messages: ExecutionEvent[] = [];

  await page.exposeFunction('captureWSMessage', (msg: ExecutionEvent) => {
    messages.push(msg);
  });

  await page.addInitScript(() => {
    const originalWebSocket = (window as any).WebSocket;
    (window as any).WebSocket = function(url: string, protocols?: string | string[]) {
      const ws = new originalWebSocket(url, protocols);

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          (window as any).captureWSMessage(data);
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      });

      return ws;
    };
  });

  return messages;
}

export function waitForEvent(
  messages: ExecutionEvent[],
  type: ExecutionEvent['type'],
  timeout = 30000
): Promise<ExecutionEvent> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const event = messages.find(m => m.type === type);
      if (event) {
        clearInterval(interval);
        resolve(event);
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for event: ${type}`));
      }
    }, 100);
  });
}
```

**Step 4: Run test to verify it passes**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts`
Expected: PASS - WebSocket messages captured

**Step 5: Commit**

```bash
git add e2e/helpers/websocket-mock.ts e2e/workflow-execution.spec.ts
git commit -m "test: add WebSocket testing infrastructure for E2E tests"
```

---

## Task 2: Test Simple Workflow Execution (Input → Agent → Output)

**Files:**
- Modify: `e2e/workflow-execution.spec.ts`

**Step 1: Write failing test for workflow execution**

```typescript
test('should execute Input → Agent → Output workflow', async ({ page }) => {
  const messages = await setupWebSocketCapture(page);

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Build workflow
  await dragNodeToCanvas(page, 'input', 200, 300);
  await dragNodeToCanvas(page, 'llm_agent', 500, 300);
  await dragNodeToCanvas(page, 'output', 800, 300);

  // Configure input node
  const inputNode = page.locator('.react-flow__node').first();
  await inputNode.click();
  await page.fill('textarea[placeholder*="Enter"]', 'Test input');

  // Open chat panel and run
  await page.click('[data-testid="chat-toggle"]');
  await page.fill('[data-testid="chat-input"]', 'Hello');
  await page.click('[data-testid="run-button"]');

  // Wait for execution events
  const nodeStart = await waitForEvent(messages, 'node_start');
  expect(nodeStart).toBeDefined();

  const flowComplete = await waitForEvent(messages, 'flow_complete');
  expect(flowComplete).toBeDefined();
  expect(flowComplete.data).toHaveProperty('output');
});
```

**Step 2: Run test to verify it fails**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "Input → Agent → Output"`
Expected: FAIL - Need to identify correct selectors for chat panel

**Step 3: Find correct chat panel selectors**

Action: Read `frontend/src/components/panels/ChatPanel.tsx` to identify testable elements

**Step 4: Update test with correct selectors**

```typescript
// Use actual data-testid or class names from ChatPanel.tsx
await page.click('button:has-text("Chat")'); // Or correct selector
await page.fill('input[placeholder="Type your message..."]', 'Hello');
await page.click('button[type="submit"]');
```

**Step 5: Run test to verify it passes**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "Input → Agent → Output"`
Expected: PASS (or SKIP if backend not running - document requirement)

**Step 6: Commit**

```bash
git add e2e/workflow-execution.spec.ts
git commit -m "test: add E2E test for simple workflow execution"
```

---

## Task 3: Test Workflow JSON Loading

**Files:**
- Modify: `e2e/workflow-execution.spec.ts`

**Step 1: Write failing test for JSON loading**

```typescript
test('should load workflow from JSON file', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Click "Open" button in FlowManager
  await page.click('[data-testid="flow-open-button"]'); // Or correct selector

  // Select file (using Playwright's file chooser)
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Browse")'),
  ]);

  await fileChooser.setFiles('docs/workflows/competitive-intelligence.json');

  // Verify nodes loaded onto canvas
  await page.waitForTimeout(1000);
  const nodeCount = await page.locator('.react-flow__node').count();
  expect(nodeCount).toBe(6); // Input, Web Search, Firecrawl, KB, Agent, Output

  // Verify edges connected
  const edgeCount = await page.locator('.react-flow__edge').count();
  expect(edgeCount).toBe(5);
});
```

**Step 2: Run test to verify it fails**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "load workflow from JSON"`
Expected: FAIL - Need to identify FlowManager selectors

**Step 3: Read FlowManager component**

Action: Read `frontend/src/components/FlowManager.tsx` to find correct selectors

**Step 4: Implement JSON loading test with correct selectors**

Update test with actual component structure

**Step 5: Run test to verify it passes**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "load workflow from JSON"`
Expected: PASS - Workflow loads successfully

**Step 6: Commit**

```bash
git add e2e/workflow-execution.spec.ts
git commit -m "test: add E2E test for workflow JSON loading"
```

---

## Task 4: Test Conditional Branching Workflow

**Files:**
- Modify: `e2e/workflow-execution.spec.ts`

**Step 1: Write failing test for conditional execution**

```typescript
test('should execute conditional branching workflow', async ({ page }) => {
  const messages = await setupWebSocketCapture(page);

  await page.goto('http://localhost:5173');

  // Load conditional workflow JSON
  // (Use helper function from Task 3)
  await loadWorkflowJSON(page, 'docs/workflows/social-media-analytics.json');

  // Execute workflow
  await page.click('[data-testid="chat-toggle"]');
  await page.fill('[data-testid="chat-input"]', 'test input');
  await page.click('[data-testid="run-button"]');

  // Wait for conditional node to execute
  const conditionalStart = await waitForEvent(messages, 'node_start');
  expect(conditionalStart.node_id).toContain('conditional');

  // Verify one branch was taken (other skipped)
  const nodeCompleteEvents = messages.filter(m => m.type === 'node_complete');
  const skippedOutputs = nodeCompleteEvents.filter(e =>
    e.data?.status === 'skipped'
  );
  expect(skippedOutputs.length).toBeGreaterThan(0);

  // Verify flow completes
  const flowComplete = await waitForEvent(messages, 'flow_complete');
  expect(flowComplete).toBeDefined();
});
```

**Step 2: Run test to verify behavior**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "conditional branching"`
Expected: Either PASS or reveal issues with conditional execution

**Step 3: Fix any issues discovered**

If test reveals bugs in conditional branching:
- Document the bug
- Create fix in separate task
- Mark test as `.skip()` with TODO comment

**Step 4: Run test to verify it passes**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "conditional branching"`
Expected: PASS

**Step 5: Commit**

```bash
git add e2e/workflow-execution.spec.ts
git commit -m "test: add E2E test for conditional branching workflow"
```

---

## Task 5: Test Streaming Output Rendering

**Files:**
- Modify: `e2e/workflow-execution.spec.ts`

**Step 1: Write failing test for streaming UI updates**

```typescript
test('should display streaming output in real-time', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Build simple workflow
  await dragNodeToCanvas(page, 'input', 200, 300);
  await dragNodeToCanvas(page, 'llm_agent', 500, 300);
  await dragNodeToCanvas(page, 'output', 800, 300);

  // Execute
  await page.click('[data-testid="chat-toggle"]');
  await page.fill('[data-testid="chat-input"]', 'Count to 10');
  await page.click('[data-testid="run-button"]');

  // Verify streaming updates appear
  const chatPanel = page.locator('[data-testid="chat-panel"]');

  // Wait for partial output (should update before completion)
  await page.waitForFunction(
    (selector) => {
      const panel = document.querySelector(selector);
      return panel && panel.textContent && panel.textContent.length > 10;
    },
    '[data-testid="chat-panel"]',
    { timeout: 10000 }
  );

  // Verify output continues to grow
  const initialLength = await chatPanel.textContent().then(t => t?.length || 0);
  await page.waitForTimeout(1000);
  const finalLength = await chatPanel.textContent().then(t => t?.length || 0);

  expect(finalLength).toBeGreaterThan(initialLength);
});
```

**Step 2: Run test to verify it fails**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "streaming output"`
Expected: FAIL - Need correct chat panel selectors

**Step 3: Identify streaming output elements**

Action: Read `frontend/src/components/panels/ChatPanel.tsx` for output rendering

**Step 4: Update test with correct selectors**

Modify test to use actual chat message containers

**Step 5: Run test to verify it passes**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "streaming output"`
Expected: PASS - Streaming updates visible

**Step 6: Commit**

```bash
git add e2e/workflow-execution.spec.ts
git commit -m "test: add E2E test for streaming output rendering"
```

---

## Task 6: Test Error Handling and Recovery

**Files:**
- Modify: `e2e/workflow-execution.spec.ts`

**Step 1: Write failing test for error scenarios**

```typescript
test('should display error when node fails', async ({ page }) => {
  const messages = await setupWebSocketCapture(page);

  await page.goto('http://localhost:5173');

  // Build workflow with invalid config (to trigger error)
  await dragNodeToCanvas(page, 'llm_agent', 400, 300);

  // Clear required field to cause validation error
  const node = page.locator('.react-flow__node').first();
  await node.click();
  await page.fill('textarea[placeholder*="assistant"]', ''); // Empty instructions

  // Attempt execution
  await page.click('[data-testid="chat-toggle"]');
  await page.fill('[data-testid="chat-input"]', 'test');
  await page.click('[data-testid="run-button"]');

  // Verify error event received
  const errorEvent = await waitForEvent(messages, 'error', 10000);
  expect(errorEvent).toBeDefined();
  expect(errorEvent.message).toContain('error');

  // Verify error displayed in UI
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "error when node fails"`
Expected: FAIL - Need error display selectors

**Step 3: Check error display implementation**

Action: Verify how errors are shown in ChatPanel or ExecutionLog

**Step 4: Update test with correct error selectors**

Modify test based on actual error rendering

**Step 5: Run test to verify it passes**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "error when node fails"`
Expected: PASS - Errors displayed correctly

**Step 6: Commit**

```bash
git add e2e/workflow-execution.spec.ts
git commit -m "test: add E2E test for error handling and display"
```

---

## Task 7: Test Save/Load Flow Persistence

**Files:**
- Modify: `e2e/workflow-execution.spec.ts`

**Step 1: Write failing test for save/load cycle**

```typescript
test('should save and load flow from Supabase', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Build simple workflow
  await dragNodeToCanvas(page, 'input', 200, 300);
  await dragNodeToCanvas(page, 'output', 500, 300);

  const flowName = `test-flow-${Date.now()}`;

  // Save flow
  await page.click('[data-testid="save-button"]');
  await page.fill('[data-testid="flow-name-input"]', flowName);
  await page.click('[data-testid="save-confirm"]');

  // Verify save success message
  await expect(page.locator('text=Saved successfully')).toBeVisible({ timeout: 5000 });

  // Clear canvas
  await page.click('[data-testid="clear-canvas"]'); // Or refresh page
  await page.reload();

  // Load saved flow
  await page.click('[data-testid="open-button"]');
  await page.click(`text=${flowName}`);

  // Verify nodes restored
  const nodeCount = await page.locator('.react-flow__node').count();
  expect(nodeCount).toBe(2);
});
```

**Step 2: Run test to verify it fails**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "save and load flow"`
Expected: FAIL - Need FlowManager selectors

**Step 3: Implement with correct FlowManager UI**

Read FlowManager component and update selectors

**Step 4: Run test to verify it passes**

Run: `PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/workflow-execution.spec.ts -g "save and load flow"`
Expected: PASS - Save/load works correctly

**Step 5: Cleanup test data**

Add cleanup step to delete test flow from Supabase:

```typescript
test.afterEach(async () => {
  // Call DELETE /api/flows/:id to cleanup
});
```

**Step 6: Commit**

```bash
git add e2e/workflow-execution.spec.ts
git commit -m "test: add E2E test for flow save/load persistence"
```

---

## Task 8: Create Test Helpers and Utilities

**Files:**
- Create: `e2e/helpers/workflow-builder.ts`

**Step 1: Extract reusable helper functions**

```typescript
// e2e/helpers/workflow-builder.ts
import type { Page } from '@playwright/test';

export async function buildSimpleWorkflow(page: Page) {
  await dragNodeToCanvas(page, 'input', 200, 300);
  await dragNodeToCanvas(page, 'llm_agent', 500, 300);
  await dragNodeToCanvas(page, 'output', 800, 300);
}

export async function configureNode(
  page: Page,
  nodeIndex: number,
  config: Record<string, any>
) {
  const node = page.locator('.react-flow__node').nth(nodeIndex);
  await node.click();

  // Fill config fields based on config object
  for (const [key, value] of Object.entries(config)) {
    const input = page.locator(`[name="${key}"]`);
    if (await input.isVisible()) {
      await input.fill(String(value));
    }
  }
}

export async function executeWorkflow(
  page: Page,
  inputText: string
) {
  await page.click('[data-testid="chat-toggle"]');
  await page.fill('[data-testid="chat-input"]', inputText);
  await page.click('[data-testid="run-button"]');
}

export async function loadWorkflowJSON(
  page: Page,
  filepath: string
) {
  await page.click('[data-testid="open-button"]');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="browse-button"]'),
  ]);
  await fileChooser.setFiles(filepath);
  await page.waitForTimeout(1000); // Wait for load
}
```

**Step 2: Refactor existing tests to use helpers**

Update Tests 2-7 to use these helper functions

**Step 3: Add TypeScript types**

```typescript
// e2e/helpers/types.ts
export interface WorkflowConfig {
  nodes: Array<{
    type: string;
    x: number;
    y: number;
    config?: Record<string, any>;
  }>;
  edges?: Array<{
    source: number;
    target: number;
  }>;
}

export interface ExecutionOptions {
  inputText: string;
  timeout?: number;
  expectError?: boolean;
}
```

**Step 4: Document helper usage**

Add JSDoc comments to all helper functions

**Step 5: Commit**

```bash
git add e2e/helpers/
git commit -m "test: extract reusable E2E test helpers"
```

---

## Task 9: Add CI/CD Pipeline for E2E Tests

**Files:**
- Create: `.github/workflows/e2e-tests.yml`

**Step 1: Write GitHub Actions workflow**

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          cd frontend && npm install
          cd ../backend && pip install -r requirements.txt

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Start backend server
        run: |
          cd backend
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Start frontend server
        run: |
          cd frontend
          npm run build
          npm run preview &

      - name: Wait for servers
        run: |
          npx wait-on http://localhost:8000/health http://localhost:5173

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: playwright-report/
```

**Step 2: Add health check endpoint**

Action: Ensure backend has `/health` endpoint for CI readiness check

**Step 3: Test CI workflow locally**

Run: `act push` (using nektos/act) or create PR to test in GitHub

**Step 4: Add badge to README**

Update root README.md with CI status badge

**Step 5: Commit**

```bash
git add .github/workflows/e2e-tests.yml
git commit -m "ci: add GitHub Actions workflow for E2E tests"
```

---

## Task 10: Document E2E Testing Strategy

**Files:**
- Create: `docs/testing/e2e-testing-guide.md`

**Step 1: Write comprehensive testing guide**

```markdown
# E2E Testing Guide

## Overview

CoconutFlow uses Playwright for end-to-end testing of the complete workflow building and execution pipeline.

## Test Structure

### Smoke Tests (`e2e/workflow-smoke-test.spec.ts`)
Basic UI verification:
- Application loads without errors
- All 10 nodes visible in sidebar
- Drag-and-drop functionality works
- Config panel opens on node click

### Execution Tests (`e2e/workflow-execution.spec.ts`)
Full workflow execution:
- WebSocket streaming
- Simple workflow execution (Input → Agent → Output)
- Conditional branching
- JSON workflow loading
- Error handling
- Save/load persistence

## Running Tests

### Locally
```bash
# Start dev servers
cd backend && uvicorn app.main:app --reload --port 8000 &
cd frontend && npm run dev &

# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/workflow-smoke-test.spec.ts

# Run with UI (debug mode)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed
```

### CI/CD
Tests run automatically on:
- Push to main/develop branches
- Pull requests to main

## Writing New Tests

### Test Template
```typescript
import { test, expect } from '@playwright/test';
import { setupWebSocketCapture, waitForEvent } from './helpers/websocket-mock';
import { buildSimpleWorkflow, executeWorkflow } from './helpers/workflow-builder';

test('should do something useful', async ({ page }) => {
  const messages = await setupWebSocketCapture(page);
  await page.goto('http://localhost:5173');

  // Build workflow
  await buildSimpleWorkflow(page);

  // Execute
  await executeWorkflow(page, 'test input');

  // Assert
  const flowComplete = await waitForEvent(messages, 'flow_complete');
  expect(flowComplete).toBeDefined();
});
```

### Helper Functions
- `setupWebSocketCapture()` - Intercept WebSocket messages
- `waitForEvent()` - Wait for specific execution event
- `buildSimpleWorkflow()` - Create Input → Agent → Output
- `configureNode()` - Set node configuration
- `executeWorkflow()` - Run workflow via chat panel
- `loadWorkflowJSON()` - Load workflow from JSON file

## Debugging Failed Tests

### View Screenshots
Failed tests automatically capture screenshots:
```bash
open playwright-report/index.html
```

### Run Single Test in Debug Mode
```bash
npx playwright test --debug -g "test name substring"
```

### Check Server Logs
```bash
# Backend logs
tail -f backend/logs/app.log

# Frontend console (in test output)
# Look for browser console.log/error messages
```

## Best Practices

1. **Wait for network idle**: `await page.waitForLoadState('networkidle')`
2. **Use data-testid**: Prefer `[data-testid="..."]` over brittle selectors
3. **Verify WebSocket events**: Always check execution events, not just UI
4. **Clean up test data**: Delete flows/documents created during tests
5. **Mock external APIs**: Use MSW for Firecrawl, Apify, etc. in tests

## Troubleshooting

### Port already in use
```bash
lsof -ti:5173 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

### Playwright not installed
```bash
npx playwright install --with-deps chromium
```

### WebSocket connection fails
Check that backend is running and accessible at `ws://localhost:8000/ws/execution`
```

**Step 2: Add troubleshooting examples**

Include common failure scenarios with solutions

**Step 3: Link from main README**

Update root README.md to reference E2E testing guide

**Step 4: Commit**

```bash
git add docs/testing/e2e-testing-guide.md
git commit -m "docs: add comprehensive E2E testing guide"
```

---

## Success Criteria

✅ **WebSocket testing infrastructure** - Can capture and assert on execution events
✅ **Simple workflow execution test** - Input → Agent → Output validates
✅ **JSON loading test** - Can load workflow definitions from files
✅ **Conditional branching test** - Verifies branch skipping works correctly
✅ **Streaming output test** - Real-time UI updates visible
✅ **Error handling test** - Errors displayed correctly in UI
✅ **Save/load persistence test** - Supabase integration works
✅ **Reusable test helpers** - DRY test code with shared utilities
✅ **CI/CD pipeline** - Automated testing on push/PR
✅ **Comprehensive documentation** - Testing guide for contributors

---

## Notes

- **Backend dependency**: Most tests require backend server running
- **Mock external APIs**: Use MSW to avoid hitting real Firecrawl/Apify/HF APIs in tests
- **Test isolation**: Each test should be independent (no shared state)
- **Performance**: WebSocket tests may take 10-30 seconds for full execution
- **Screenshots**: Playwright automatically captures screenshots on failure

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-10-comprehensive-e2e-tests.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
