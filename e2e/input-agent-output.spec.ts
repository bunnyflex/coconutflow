/**
 * E2E Test: Build an "Input → LLM Agent → Output" flow
 *
 * This test simulates a real user:
 * 1. Opens the app
 * 2. Drags an Input node onto the canvas
 * 3. Drags an LLM Agent node onto the canvas
 * 4. Drags an Output node onto the canvas
 * 5. Connects Input → Agent → Output
 * 6. Configures each node
 * 7. Clicks Run and observes the result
 *
 * Every step captures screenshots and logs errors encountered.
 */

import { test, expect, type Page } from '@playwright/test';

const ERRORS: string[] = [];

/**
 * Helper: drag a node from the sidebar onto the canvas using
 * dispatched HTML5 drag events (Playwright's mouse simulation
 * doesn't trigger native dataTransfer).
 */
async function dragNodeToCanvas(
  page: Page,
  nodeType: string,
  targetX: number,
  targetY: number,
) {
  await page.evaluate(
    ({ nodeType, targetX, targetY }) => {
      // Find the canvas drop target
      const canvas = document.querySelector('.react-flow') as HTMLElement;
      if (!canvas) throw new Error('Canvas not found');

      // Build a DataTransfer with the node type
      const dt = new DataTransfer();
      dt.setData('application/agnoflow-node', nodeType);

      // Dispatch dragover first (required for drop to work)
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

test.describe('Flow: Input → LLM Agent → Output', () => {
  test.beforeEach(async ({ page }) => {
    // Reset errors for each test
    ERRORS.length = 0;

    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        ERRORS.push(`[Console Error] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      ERRORS.push(`[Page Error] ${err.message}`);
    });
  });

  test('Step 1: App loads correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/results/01-app-loaded.png', fullPage: true });

    // Verify the three-panel layout exists
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // Verify toolbar exists with Run button
    const runButton = page.locator('button', { hasText: 'Run' });
    await expect(runButton).toBeVisible();

    // Verify canvas area exists
    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible();
  });

  test('Step 2: Sidebar shows all 6 node types', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const sidebar = page.locator('aside').first();
    const expectedNodes = ['Input', 'Output', 'LLM Agent', 'Conditional', 'Web Search', 'Knowledge Base'];

    for (const name of expectedNodes) {
      const node = sidebar.locator(`text=${name}`).first();
      const visible = await node.isVisible();
      if (!visible) {
        ERRORS.push(`Sidebar missing node type: "${name}"`);
      }
    }

    await page.screenshot({ path: 'e2e/results/02-sidebar-nodes.png', fullPage: true });

    const sidebarErrors = ERRORS.filter((e) => e.includes('Sidebar missing'));
    expect(sidebarErrors).toHaveLength(0);
  });

  test('Step 3: Drag Input node onto canvas', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    await dragNodeToCanvas(page, 'input', canvasBox!.x + 200, canvasBox!.y + 200);
    await page.screenshot({ path: 'e2e/results/03-input-node-dropped.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    if (nodeCount === 0) {
      ERRORS.push('Input node was not created on canvas after drag-and-drop');
    }
    expect(nodeCount).toBeGreaterThanOrEqual(1);
  });

  test('Step 4: Drag all 3 nodes and verify', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    // Drag Input
    await dragNodeToCanvas(page, 'input', cx + 150, cy + 250);
    // Drag LLM Agent
    await dragNodeToCanvas(page, 'llm_agent', cx + 400, cy + 250);
    // Drag Output
    await dragNodeToCanvas(page, 'output', cx + 650, cy + 250);

    await page.screenshot({ path: 'e2e/results/04-three-nodes.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    if (nodeCount !== 3) {
      ERRORS.push(`Expected 3 nodes on canvas, found ${nodeCount}`);
    }
    expect(nodeCount).toBe(3);
  });

  test('Step 5: Click on LLM Agent node to open config panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();

    // Drop an LLM Agent node
    await dragNodeToCanvas(page, 'llm_agent', canvasBox!.x + 400, canvasBox!.y + 250);

    // Click the node to select it
    const agentNode = page.locator('.react-flow__node').first();
    await expect(agentNode).toBeVisible();
    await agentNode.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/results/05-config-panel.png', fullPage: true });

    // Config panel should show the node's type heading and form fields
    const providerLabel = page.locator('text=Provider').first();
    const panelVisible = await providerLabel.isVisible().catch(() => false);
    if (!panelVisible) {
      ERRORS.push('Config panel did not appear when clicking LLM Agent node (no Provider field)');
    }
    expect(panelVisible).toBe(true);
  });

  test('Step 6: Right-click node shows context menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();

    await dragNodeToCanvas(page, 'input', canvasBox!.x + 200, canvasBox!.y + 250);

    // Right-click the node
    const node = page.locator('.react-flow__node').first();
    await expect(node).toBeVisible();
    await node.click({ button: 'right' });
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/results/06-context-menu.png', fullPage: true });

    // Check for context menu items
    const deleteBtn = page.locator('text=Delete').first();
    const duplicateBtn = page.locator('text=Duplicate').first();
    const hasDelete = await deleteBtn.isVisible();
    const hasDuplicate = await duplicateBtn.isVisible();
    if (!hasDelete || !hasDuplicate) {
      ERRORS.push('Context menu missing Delete/Duplicate options');
    }
  });

  test('Step 7: Run button state', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Run should be disabled when empty
    const runButton = page.locator('button', { hasText: 'Run' });
    const disabledWhenEmpty = await runButton.isDisabled();
    expect(disabledWhenEmpty).toBe(true);

    // Drop a node — Run should become enabled
    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    await dragNodeToCanvas(page, 'input', canvasBox!.x + 200, canvasBox!.y + 250);

    const disabledWithNode = await runButton.isDisabled();
    if (disabledWithNode) {
      ERRORS.push('Run button still disabled after adding a node');
    }

    await page.screenshot({ path: 'e2e/results/07-run-button.png', fullPage: true });
  });

  test('Step 8: Build full flow and click Run', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    // Drop 3 nodes — spread widely to avoid overlap (known UI issue: nodes
    // land close together because screenToFlowPosition maps to canvas origin)
    await dragNodeToCanvas(page, 'input', cx + 200, cy + 150);
    await dragNodeToCanvas(page, 'llm_agent', cx + 500, cy + 300);
    await dragNodeToCanvas(page, 'output', cx + 200, cy + 450);

    await page.screenshot({ path: 'e2e/results/08a-nodes-placed.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(3);

    // Configure Input node: click it (use force to bypass potential overlap)
    const inputNode = page.locator('.react-flow__node-input').first();
    await inputNode.click({ force: true });
    await page.waitForTimeout(500);

    // Try to type a value into the input config
    const valueInput = page.locator('input[placeholder="Enter your input..."], textarea[placeholder]').first();
    if (await valueInput.isVisible()) {
      await valueInput.fill('What is the capital of France?');
    }

    await page.screenshot({ path: 'e2e/results/08b-input-configured.png', fullPage: true });

    // Click Run
    const runButton = page.locator('button', { hasText: 'Run' });
    if (await runButton.isEnabled()) {
      await runButton.click();
      // Wait for WebSocket execution attempt
      await page.waitForTimeout(5000);
    } else {
      ERRORS.push('Run button is disabled even with 3 nodes on canvas');
    }

    await page.screenshot({ path: 'e2e/results/08c-after-run.png', fullPage: true });

    // Capture any errors that appeared (toasts, node errors)
    const toastErrors = await page.locator('text=failed').count();
    if (toastErrors > 0) {
      ERRORS.push('Error toast appeared during execution');
    }
  });

  test.afterAll(() => {
    if (ERRORS.length > 0) {
      console.log('\n========== COLLECTED ERRORS ==========');
      ERRORS.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      console.log('======================================\n');
    } else {
      console.log('\n✓ No errors collected during test run\n');
    }
  });
});
