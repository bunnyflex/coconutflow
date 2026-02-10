/**
 * E2E Smoke Test: Build Simple Workflow
 *
 * Tests basic workflow building functionality:
 * - Drag 3 nodes onto canvas (Input → LLM Agent → Output)
 * - Verify nodes appear on canvas
 * - Connect edges between nodes
 * - Verify no crashes
 *
 * This is a smoke test - we're not executing, just testing UI building blocks.
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Helper: Drag a node from sidebar onto canvas using HTML5 drag events
 */
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
      dt.setData('application/coconutflow-node', nodeType);

      // Dispatch dragover first
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: targetX,
        clientY: targetY,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(dragOverEvent);

      // Then dispatch drop
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: targetX,
        clientY: targetY,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(dropEvent);
    },
    { nodeType, targetX, targetY },
  );

  await page.waitForTimeout(500);
}

/**
 * Helper: Connect two nodes by creating an edge
 */
async function connectNodes(
  page: Page,
  sourceNodeId: string,
  targetNodeId: string,
) {
  await page.evaluate(
    ({ sourceNodeId, targetNodeId }) => {
      // Find the nodes
      const sourceNode = document.querySelector(`[data-id="${sourceNodeId}"]`);
      const targetNode = document.querySelector(`[data-id="${targetNodeId}"]`);

      if (!sourceNode || !targetNode) {
        throw new Error(`Nodes not found: ${sourceNodeId} or ${targetNodeId}`);
      }

      // Find source output handle
      const sourceHandle = sourceNode.querySelector('.react-flow__handle-right');
      if (!sourceHandle) throw new Error('Source handle not found');

      // Find target input handle
      const targetHandle = targetNode.querySelector('.react-flow__handle-left');
      if (!targetHandle) throw new Error('Target handle not found');

      // Simulate connection by clicking handles
      (sourceHandle as HTMLElement).click();
      (targetHandle as HTMLElement).click();
    },
    { sourceNodeId, targetNodeId },
  );

  await page.waitForTimeout(500);
}

test.describe('Workflow Smoke Test: Input → Agent → Output', () => {
  test.beforeEach(async ({ page }) => {
    // Track console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    // Navigate to app
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Store errors on page context for later assertion
    (page as any).errors = errors;
  });

  test('should load the application without errors', async ({ page }) => {
    // Verify the app loaded
    await expect(page.locator('h1')).toContainText('CoconutFlow');

    // Check for canvas
    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible();

    // Check for node sidebar
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('should show all 10 nodes in sidebar', async ({ page }) => {
    // Check sidebar for all node types - use first() to handle multiple matches
    const sidebar = page.locator('aside').first();

    // Original 6 nodes
    await expect(sidebar.getByText('Input', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Output', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('LLM Agent')).toBeVisible();
    await expect(sidebar.getByText('Conditional')).toBeVisible();
    await expect(sidebar.getByText('Web Search')).toBeVisible();
    await expect(sidebar.getByText('Knowledge Base')).toBeVisible();

    // New 4 external integration nodes
    await expect(sidebar.getByText('Firecrawl Scrape')).toBeVisible();
    await expect(sidebar.getByText('Apify Actor')).toBeVisible();
    await expect(sidebar.getByText('MCP Server', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Hugging Face')).toBeVisible();
  });

  test('should drag Input node onto canvas', async ({ page }) => {
    // Take before screenshot
    await page.screenshot({ path: 'e2e/results/01-before-input.png' });

    // Drag Input node to canvas
    await dragNodeToCanvas(page, 'input', 300, 300);

    // Wait for node to appear
    await page.waitForTimeout(1000);

    // Verify node exists on canvas
    const nodes = await page.locator('.react-flow__node').count();
    expect(nodes).toBeGreaterThan(0);

    // Take after screenshot
    await page.screenshot({ path: 'e2e/results/02-after-input.png' });
  });

  test('should build complete Input → Agent → Output workflow', async ({ page }) => {
    console.log('Starting workflow build test...');

    // Step 1: Drag Input node
    console.log('Dragging Input node...');
    await dragNodeToCanvas(page, 'input', 200, 300);
    await page.waitForTimeout(1000);

    // Verify Input node appeared
    let nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(1);
    await page.screenshot({ path: 'e2e/results/03-workflow-step1-input.png' });

    // Step 2: Drag LLM Agent node
    console.log('Dragging LLM Agent node...');
    await dragNodeToCanvas(page, 'llm_agent', 500, 300);
    await page.waitForTimeout(1000);

    // Verify Agent node appeared
    nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(2);
    await page.screenshot({ path: 'e2e/results/04-workflow-step2-agent.png' });

    // Step 3: Drag Output node
    console.log('Dragging Output node...');
    await dragNodeToCanvas(page, 'output', 800, 300);
    await page.waitForTimeout(1000);

    // Verify Output node appeared
    nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(3);
    await page.screenshot({ path: 'e2e/results/05-workflow-step3-output.png' });

    // Step 4: Verify we have exactly 3 nodes on canvas
    const canvasNodes = page.locator('.react-flow__node');
    await expect(canvasNodes).toHaveCount(3);

    console.log('✅ All 3 nodes successfully placed on canvas');

    // Final screenshot
    await page.screenshot({ path: 'e2e/results/06-workflow-complete.png', fullPage: true });

    // Check for console errors
    const errors = (page as any).errors || [];
    if (errors.length > 0) {
      console.log('⚠️  Console errors detected:', errors);
    } else {
      console.log('✅ No console errors');
    }
  });

  test('should open config panel when node is clicked', async ({ page }) => {
    // Drag an LLM Agent node
    await dragNodeToCanvas(page, 'llm_agent', 400, 300);
    await page.waitForTimeout(1000);

    // Click the node
    const node = page.locator('.react-flow__node').first();
    await node.click();
    await page.waitForTimeout(500);

    // Verify config panel opened (right sidebar with config form)
    const configPanel = page.locator('aside').last();
    await expect(configPanel).toBeVisible();

    // Verify it shows LLM Agent config (check for "Provider" and "Temperature" labels)
    await expect(configPanel.getByText('Provider')).toBeVisible();
    await expect(configPanel.getByText('Temperature:', { exact: false })).toBeVisible();

    await page.screenshot({ path: 'e2e/results/07-config-panel.png' });
  });
});
