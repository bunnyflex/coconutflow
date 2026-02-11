# E2E Testing Guide

## Overview

CoconutFlow uses [Playwright](https://playwright.dev) for end-to-end testing of the complete workflow building and execution pipeline. Tests validate everything from canvas UI interactions to WebSocket streaming execution events.

## Test Structure

### Smoke Tests (`e2e/workflow-smoke-test.spec.ts`)

Basic UI verification that doesn't require backend:

- Application loads without errors
- All 10 node types visible in sidebar
- Drag-and-drop places nodes on canvas
- Config panel opens on node click

### Execution Tests (`e2e/workflow-execution.spec.ts`)

Full workflow execution requiring both frontend and backend:

- WebSocket message capture infrastructure
- Simple workflow execution (Input -> Agent -> Output)
- JSON workflow loading via store
- Conditional branching with skipped nodes
- Streaming output rendering in chat panel
- Error handling (empty canvas, execution failures)
- Save/load flow persistence via Supabase

### Chat Panel Tests (`e2e/chat-panel.spec.ts`)

Chat panel interaction:

- Toggle open/close
- Send messages and receive responses
- Warning on empty canvas

### Additional Tests

- `e2e/input-agent-output.spec.ts` - Detailed step-by-step flow building
- `e2e/external-integrations.spec.ts` - External integration node UI tests
- `e2e/kb-chat-demo.spec.ts` - Knowledge Base with chat execution
- `e2e/kb-multi-source-demo.spec.ts` - Multi-source KB pipeline

## Running Tests

### Prerequisites

- Node.js 20+
- Frontend server on port 5173 (`cd frontend && npm run dev`)
- Backend server on port 8000 (`cd backend && uvicorn app.main:app --reload --port 8000`)
- Playwright installed (`npx playwright install chromium`)

### Local Execution

```bash
# Start dev servers (in separate terminals)
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev

# Run all tests
npx playwright test

# Run a specific test file
npx playwright test e2e/workflow-execution.spec.ts

# Run a specific test by name
npx playwright test -g "should build and execute a simple workflow"

# Run in headed mode (see the browser)
npx playwright test --headed

# Run with Playwright UI debugger
npx playwright test --ui

# Run with step-by-step debugging
npx playwright test --debug
```

### CI/CD

Tests run automatically via GitHub Actions on:

- Push to `main` or `develop` branches
- Pull requests targeting `main`

See `.github/workflows/e2e-tests.yml` for the pipeline configuration.

## Test Helpers

### WebSocket Capture (`e2e/helpers/websocket-mock.ts`)

Intercept WebSocket execution events for assertions:

```typescript
import { setupWebSocketCapture, waitForEvent, getWebSocketMessages } from './helpers/websocket-mock';

// Must be called BEFORE page.goto()
await setupWebSocketCapture(page);
await page.goto('/');

// After execution, check events
const messages = await getWebSocketMessages(page);
const flowComplete = await waitForEvent(page, 'flow_complete', 30000);
```

### Workflow Builder (`e2e/helpers/workflow-builder.ts`)

Build and interact with workflows:

```typescript
import { buildSimpleWorkflow, sendChatMessage, loadWorkflowFile } from './helpers/workflow-builder';

// Build Input -> Agent -> Output
await buildSimpleWorkflow(page);

// Or load from JSON
await loadWorkflowFile(page, 'docs/workflows/local-dev-helper.json');

// Execute via chat
await sendChatMessage(page, 'Hello world');
```

### Available Helper Functions

| Function | Description |
|----------|-------------|
| `dragNodeToCanvas(page, nodeType, x, y)` | Drag a node from sidebar to canvas |
| `getCanvasBounds(page)` | Get canvas bounding box for positioning |
| `buildSimpleWorkflow(page)` | Create Input -> Agent -> Output |
| `openChatPanel(page)` | Open the chat panel |
| `sendChatMessage(page, text)` | Send a message via chat |
| `clickRunButton(page)` | Click the Run button |
| `loadWorkflowFromJSON(page, flow)` | Load a flow definition object |
| `loadWorkflowFile(page, path)` | Load a workflow JSON file from disk |
| `waitForAppReady(page)` | Wait for app to fully load |
| `setupWebSocketCapture(page)` | Set up WS message interception |
| `waitForEvent(page, type, timeout)` | Wait for specific WS event |
| `getWebSocketMessages(page)` | Get all captured WS messages |
| `clearWebSocketMessages(page)` | Clear captured messages |

## Writing New Tests

### Template

```typescript
import { test, expect } from '@playwright/test';
import { setupWebSocketCapture, waitForEvent } from './helpers/websocket-mock';
import { buildSimpleWorkflow, sendChatMessage, waitForAppReady } from './helpers/workflow-builder';

test('should do something useful', async ({ page }) => {
  // Set up WS capture BEFORE navigation
  await setupWebSocketCapture(page);

  await page.goto('/');
  await waitForAppReady(page);

  // Build workflow
  await buildSimpleWorkflow(page);

  // Execute
  await sendChatMessage(page, 'test input');

  // Assert on WebSocket events
  const messages = await getWebSocketMessages(page);
  expect(messages.length).toBeGreaterThan(0);

  // Assert on UI
  const bubbles = page.locator('[class*="rounded-xl"]');
  expect(await bubbles.count()).toBeGreaterThanOrEqual(2);
});
```

### Key Selectors

| Element | Selector |
|---------|----------|
| Canvas | `.react-flow` |
| Any node | `.react-flow__node` |
| Specific node type | `.react-flow__node-input`, `.react-flow__node-llm_agent`, etc. |
| Edges | `.react-flow__edge` |
| Chat toggle | `button[title="Toggle chat"]` |
| Chat input | `textarea[placeholder="Type a message..."]` |
| Send button | `button:has-text("Send")` |
| Run button | `page.locator('button', { hasText: 'Run' })` |
| Save button | `button[title="Save flow"]` |
| Open button | `button[title="Open saved flow"]` |
| Clear button | `button[title="Clear canvas"]` |
| Sidebar | `page.locator('aside').first()` |

## Debugging Failed Tests

### View Test Report

```bash
# Open HTML report after test run
npx playwright show-report e2e/report
```

### View Screenshots

Failed tests capture screenshots automatically in `e2e/results/`. Tests also take named screenshots at key steps.

### Debug a Single Test

```bash
npx playwright test --debug -g "test name substring"
```

### Check Console Errors

Many tests capture console errors. Check the test output for `[Console Error]` or `[Page Error]` messages.

### Check Server Logs

```bash
# Backend logs (terminal running uvicorn)
# Look for Python tracebacks or WebSocket errors

# Frontend console errors are captured in test screenshots
```

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

Verify backend is running and accessible:

```bash
curl http://localhost:8000/
# Should return {"status":"ok","service":"AgnoFlow API","version":"0.1.0"}
```

### Tests timeout waiting for execution

- Check that `OPENAI_API_KEY` is set in the backend `.env`
- Verify backend can reach the LLM provider
- Increase test timeout in `playwright.config.ts` if needed

### Drag-and-drop doesn't work

The MIME type must be `application/coconutflow-node`. If tests use the old `application/agnoflow-node`, nodes won't be created.

## Best Practices

1. **Call `setupWebSocketCapture` before `page.goto`** - The init script must register before the app loads
2. **Use `waitForAppReady`** - Ensures canvas and sidebar are visible before interacting
3. **Take screenshots at key steps** - Aids debugging when tests fail in CI
4. **Handle backend-optional tests gracefully** - Some tests should pass even without backend
5. **Clean up test data** - Delete flows created during save/load tests
6. **Use helpers instead of duplicating code** - Import from `e2e/helpers/`
7. **Use the correct MIME type** - `application/coconutflow-node` (not `agnoflow-node`)
