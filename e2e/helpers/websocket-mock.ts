/**
 * WebSocket Testing Infrastructure
 *
 * Provides helpers to intercept and assert on WebSocket execution events
 * during E2E tests. Works by patching the browser's WebSocket constructor
 * via page.addInitScript before navigation.
 */

import type { Page } from '@playwright/test';

export interface ExecutionEvent {
  type:
    | 'flow_start'
    | 'node_start'
    | 'node_output'
    | 'node_complete'
    | 'node_skipped'
    | 'flow_complete'
    | 'error'
    | 'pong';
  node_id?: string | null;
  flow_id?: string | null;
  data?: any;
  message?: string;
  timestamp?: string;
}

/**
 * Set up WebSocket message capture on the page.
 *
 * IMPORTANT: Call this BEFORE page.goto() so the init script registers
 * before the app creates any WebSocket connections.
 *
 * Captured messages are stored in the page's window.__wsMessages array
 * and can be retrieved with getWebSocketMessages().
 */
export async function setupWebSocketCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__wsMessages = [];

    const OriginalWebSocket = window.WebSocket;

    (window as any).WebSocket = function (
      url: string | URL,
      protocols?: string | string[],
    ) {
      const ws = new OriginalWebSocket(url, protocols);

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          (window as any).__wsMessages.push(data);
        } catch {
          // Non-JSON message, skip
        }
      });

      return ws;
    } as any;

    // Preserve prototype chain
    (window as any).WebSocket.prototype = OriginalWebSocket.prototype;
    (window as any).WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    (window as any).WebSocket.OPEN = OriginalWebSocket.OPEN;
    (window as any).WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    (window as any).WebSocket.CLOSED = OriginalWebSocket.CLOSED;
  });
}

/**
 * Retrieve all captured WebSocket messages from the page.
 */
export async function getWebSocketMessages(
  page: Page,
): Promise<ExecutionEvent[]> {
  return page.evaluate(() => (window as any).__wsMessages || []);
}

/**
 * Clear all captured WebSocket messages.
 */
export async function clearWebSocketMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__wsMessages = [];
  });
}

/**
 * Wait for a specific execution event type to appear in captured messages.
 * Polls the page's message store at intervals.
 */
export async function waitForEvent(
  page: Page,
  type: ExecutionEvent['type'],
  timeout = 30000,
): Promise<ExecutionEvent> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const messages: ExecutionEvent[] = await getWebSocketMessages(page);
    const event = messages.find((m) => m.type === type);
    if (event) return event;
    await page.waitForTimeout(200);
  }

  throw new Error(
    `Timeout (${timeout}ms) waiting for WebSocket event: ${type}`,
  );
}

/**
 * Wait for all expected event types to appear.
 */
export async function waitForEvents(
  page: Page,
  types: ExecutionEvent['type'][],
  timeout = 30000,
): Promise<ExecutionEvent[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const messages: ExecutionEvent[] = await getWebSocketMessages(page);
    const found = types.map((t) => messages.find((m) => m.type === t));
    if (found.every(Boolean)) return found as ExecutionEvent[];
    await page.waitForTimeout(200);
  }

  const messages = await getWebSocketMessages(page);
  const missing = types.filter((t) => !messages.find((m) => m.type === t));
  throw new Error(
    `Timeout (${timeout}ms) waiting for events: ${missing.join(', ')}`,
  );
}

/**
 * Get all events of a specific type from captured messages.
 */
export async function getEventsOfType(
  page: Page,
  type: ExecutionEvent['type'],
): Promise<ExecutionEvent[]> {
  const messages: ExecutionEvent[] = await getWebSocketMessages(page);
  return messages.filter((m) => m.type === type);
}
