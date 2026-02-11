/**
 * Reusable E2E Test Helpers for Workflow Building
 *
 * Provides shared functions for dragging nodes, connecting edges,
 * configuring nodes, executing workflows, and loading JSON flows.
 */

import type { Page } from '@playwright/test';

/**
 * Drag a node from the sidebar onto the canvas using HTML5 drag events.
 * Playwright's native mouse simulation doesn't trigger dataTransfer,
 * so we dispatch synthetic DragEvents directly.
 */
export async function dragNodeToCanvas(
  page: Page,
  nodeType: string,
  targetX: number,
  targetY: number,
): Promise<void> {
  await page.evaluate(
    ({ nodeType, targetX, targetY }) => {
      const canvas = document.querySelector('.react-flow') as HTMLElement;
      if (!canvas) throw new Error('Canvas not found');

      const dt = new DataTransfer();
      dt.setData('application/coconutflow-node', nodeType);

      canvas.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer: dt,
        }),
      );

      canvas.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer: dt,
        }),
      );
    },
    { nodeType, targetX, targetY },
  );

  await page.waitForTimeout(500);
}

/**
 * Get the canvas bounding box for calculating drop positions.
 */
export async function getCanvasBounds(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const canvas = page.locator('.react-flow');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found or not visible');
  return box;
}

/**
 * Connect two nodes by adding an edge via the Zustand store.
 * Uses the store's onConnect method which mirrors what React Flow does
 * when users drag between handles in the UI.
 *
 * @param sourceIndex - Index of the source node in the store's nodes array
 * @param targetIndex - Index of the target node in the store's nodes array
 * @param sourceHandle - Optional source handle id (e.g. "true"/"false" for conditional)
 * @param targetHandle - Optional target handle id
 */
export async function connectNodes(
  page: Page,
  sourceIndex: number,
  targetIndex: number,
  sourceHandle: string | null = null,
  targetHandle: string | null = null,
): Promise<void> {
  await page.evaluate(
    ({ sourceIndex, targetIndex, sourceHandle, targetHandle }) => {
      const store = (window as any).__flowStore;
      if (!store) throw new Error('Flow store not found on window.__flowStore');

      const { nodes, onConnect } = store.getState();
      const sourceNode = nodes[sourceIndex];
      const targetNode = nodes[targetIndex];

      if (!sourceNode || !targetNode) {
        throw new Error(
          `Nodes not found at indices ${sourceIndex}, ${targetIndex}. ` +
            `Total nodes: ${nodes.length}`,
        );
      }

      onConnect({
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle,
        targetHandle,
      });
    },
    { sourceIndex, targetIndex, sourceHandle, targetHandle },
  );

  await page.waitForTimeout(300);
}

/**
 * Connect two nodes by their node IDs (instead of array indices).
 */
export async function connectNodesById(
  page: Page,
  sourceId: string,
  targetId: string,
  sourceHandle: string | null = null,
  targetHandle: string | null = null,
): Promise<void> {
  await page.evaluate(
    ({ sourceId, targetId, sourceHandle, targetHandle }) => {
      const store = (window as any).__flowStore;
      if (!store) throw new Error('Flow store not found on window.__flowStore');

      store.getState().onConnect({
        source: sourceId,
        target: targetId,
        sourceHandle,
        targetHandle,
      });
    },
    { sourceId, targetId, sourceHandle, targetHandle },
  );

  await page.waitForTimeout(300);
}

/**
 * Build a simple Input -> LLM Agent -> Output workflow on the canvas.
 * Drags 3 nodes AND connects them with edges: Input -> Agent -> Output.
 * Returns the canvas bounding box used for positioning.
 */
export async function buildSimpleWorkflow(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await getCanvasBounds(page);

  // Drag nodes onto canvas
  await dragNodeToCanvas(page, 'input', box.x + 200, box.y + 150);
  await dragNodeToCanvas(page, 'llm_agent', box.x + 500, box.y + 300);
  await dragNodeToCanvas(page, 'output', box.x + 200, box.y + 450);

  // Connect: Input (0) -> Agent (1) -> Output (2)
  await connectNodes(page, 0, 1);
  await connectNodes(page, 1, 2);

  return box;
}

/**
 * Open the chat panel by clicking the toggle button in the toolbar.
 */
export async function openChatPanel(page: Page): Promise<void> {
  const chatButton = page.locator('button[title="Toggle chat"]');
  await chatButton.click();
  await page.waitForTimeout(500);
}

/**
 * Send a message via the chat panel. Opens chat if not already open.
 */
export async function sendChatMessage(
  page: Page,
  message: string,
): Promise<void> {
  // Ensure chat panel is open
  const chatInput = page.locator('textarea[placeholder="Type a message..."]');
  const isVisible = await chatInput.isVisible().catch(() => false);
  if (!isVisible) {
    await openChatPanel(page);
  }

  await chatInput.fill(message);
  const sendButton = page.locator('button:has-text("Send")');
  await sendButton.click();
}

/**
 * Execute a workflow by clicking the Run button in the toolbar.
 */
export async function clickRunButton(page: Page): Promise<void> {
  const runButton = page.locator('button', { hasText: 'Run' });
  await runButton.click();
}

/**
 * Load a workflow definition into the app via the Zustand store.
 * This bypasses the FlowManager UI (which only loads from Supabase)
 * and directly calls store.loadFlow() with the JSON definition.
 */
export async function loadWorkflowFromJSON(
  page: Page,
  flowDefinition: Record<string, any>,
): Promise<void> {
  await page.evaluate((flow) => {
    // The store is exposed in main.tsx as window.__flowStore
    const store = (window as any).__flowStore;
    if (store) {
      store.getState().loadFlow(flow);
    } else {
      throw new Error(
        'Flow store not found on window.__flowStore. Ensure main.tsx exposes it.',
      );
    }
  }, flowDefinition);

  await page.waitForTimeout(500);
}

/**
 * Load a workflow JSON file from disk and inject it into the app store.
 * Reads the file from the filesystem and calls loadWorkflowFromJSON.
 */
export async function loadWorkflowFile(
  page: Page,
  filePath: string,
): Promise<Record<string, any>> {
  // Read the file using Node.js (runs in the test process, not the browser)
  const fs = await import('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  const flow = JSON.parse(content);

  await loadWorkflowFromJSON(page, flow);
  return flow;
}

/**
 * Wait for the application to fully load (canvas visible, sidebar visible).
 */
export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.locator('.react-flow').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('aside').first().waitFor({ state: 'visible', timeout: 5000 });
}
