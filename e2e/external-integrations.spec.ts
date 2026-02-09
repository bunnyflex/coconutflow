/**
 * E2E Test: External Integrations (Firecrawl, Apify, MCP, Hugging Face)
 *
 * This test validates all 4 external integration node types:
 * 1. Firecrawl Scrape - Web scraping to Markdown/JSON
 * 2. Apify Actor - Run pre-built scrapers
 * 3. MCP Server - Model Context Protocol integration
 * 4. Hugging Face Inference - Run open-source models
 *
 * Each test:
 * - Drags nodes onto canvas
 * - Opens config panel
 * - Verifies configuration fields exist
 * - Takes screenshots for debugging
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

test.describe('External Integrations: All 4 Node Types', () => {
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

  test('Firecrawl Scrape: Node creation and config panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    // Drag Firecrawl Scrape node onto canvas
    await dragNodeToCanvas(page, 'firecrawl_scrape', canvasBox!.x + 300, canvasBox!.y + 200);
    await page.screenshot({ path: 'e2e/results/firecrawl-01-node-dropped.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Click node to open config panel
    const firecrawlNode = page.locator('.react-flow__node').first();
    await expect(firecrawlNode).toBeVisible();
    await firecrawlNode.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/results/firecrawl-02-config-panel.png', fullPage: true });

    // Verify config panel shows Firecrawl-specific fields
    const urlField = page.locator('text=URL').first();
    const urlVisible = await urlField.isVisible().catch(() => false);
    if (!urlVisible) {
      ERRORS.push('Firecrawl config panel missing URL field');
    }
    expect(urlVisible).toBe(true);

    // Verify other Firecrawl fields
    const formatsField = page.locator('text=Formats').first();
    const formatsVisible = await formatsField.isVisible().catch(() => false);
    if (!formatsVisible) {
      ERRORS.push('Firecrawl config panel missing Formats field');
    }

    // Take final screenshot
    await page.screenshot({ path: 'e2e/results/firecrawl-03-final.png', fullPage: true });
  });

  test('Apify Actor: Node creation and config panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    // Drag Apify Actor node onto canvas
    await dragNodeToCanvas(page, 'apify_actor', canvasBox!.x + 300, canvasBox!.y + 200);
    await page.screenshot({ path: 'e2e/results/apify-01-node-dropped.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Click node to open config panel
    const apifyNode = page.locator('.react-flow__node').first();
    await expect(apifyNode).toBeVisible();
    await apifyNode.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/results/apify-02-config-panel.png', fullPage: true });

    // Verify config panel shows Apify-specific fields
    const actorIdField = page.locator('text=Actor ID').first();
    const actorIdVisible = await actorIdField.isVisible().catch(() => false);
    if (!actorIdVisible) {
      ERRORS.push('Apify config panel missing Actor ID field');
    }
    expect(actorIdVisible).toBe(true);

    // Verify other Apify fields
    const maxItemsField = page.locator('text=Max Items').first();
    const maxItemsVisible = await maxItemsField.isVisible().catch(() => false);
    if (!maxItemsVisible) {
      ERRORS.push('Apify config panel missing Max Items field');
    }

    // Take final screenshot
    await page.screenshot({ path: 'e2e/results/apify-03-final.png', fullPage: true });
  });

  test('MCP Server: Node creation and config panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    // Drag MCP Server node onto canvas
    await dragNodeToCanvas(page, 'mcp_server', canvasBox!.x + 300, canvasBox!.y + 200);
    await page.screenshot({ path: 'e2e/results/mcp-01-node-dropped.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Click node to open config panel
    const mcpNode = page.locator('.react-flow__node').first();
    await expect(mcpNode).toBeVisible();
    await mcpNode.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/results/mcp-02-config-panel.png', fullPage: true });

    // Verify config panel shows MCP-specific fields
    const serverNameField = page.locator('text=Server Name').first();
    const serverNameVisible = await serverNameField.isVisible().catch(() => false);
    if (!serverNameVisible) {
      ERRORS.push('MCP config panel missing Server Name field');
    }
    expect(serverNameVisible).toBe(true);

    // Verify other MCP fields
    const serverUrlField = page.locator('text=Server URL').first();
    const serverUrlVisible = await serverUrlField.isVisible().catch(() => false);
    if (!serverUrlVisible) {
      ERRORS.push('MCP config panel missing Server URL field');
    }

    // Take final screenshot
    await page.screenshot({ path: 'e2e/results/mcp-03-final.png', fullPage: true });
  });

  test('Hugging Face Inference: Node creation and config panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    // Drag Hugging Face Inference node onto canvas
    await dragNodeToCanvas(page, 'huggingface_inference', canvasBox!.x + 300, canvasBox!.y + 200);
    await page.screenshot({ path: 'e2e/results/hf-01-node-dropped.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Click node to open config panel
    const hfNode = page.locator('.react-flow__node').first();
    await expect(hfNode).toBeVisible();
    await hfNode.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/results/hf-02-config-panel.png', fullPage: true });

    // Verify config panel shows Hugging Face-specific fields
    const modelIdField = page.locator('text=Model ID').first();
    const modelIdVisible = await modelIdField.isVisible().catch(() => false);
    if (!modelIdVisible) {
      ERRORS.push('Hugging Face config panel missing Model ID field');
    }
    expect(modelIdVisible).toBe(true);

    // Verify other HF fields
    const taskField = page.locator('text=Task').first();
    const taskVisible = await taskField.isVisible().catch(() => false);
    if (!taskVisible) {
      ERRORS.push('Hugging Face config panel missing Task field');
    }

    // Take final screenshot
    await page.screenshot({ path: 'e2e/results/hf-03-final.png', fullPage: true });
  });

  test('Full Flow: Input → Firecrawl Scrape → Output', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    // Drop 3 nodes in a row
    await dragNodeToCanvas(page, 'input', cx + 150, cy + 250);
    await dragNodeToCanvas(page, 'firecrawl_scrape', cx + 400, cy + 250);
    await dragNodeToCanvas(page, 'output', cx + 650, cy + 250);

    await page.screenshot({ path: 'e2e/results/firecrawl-flow-01-nodes.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(3);

    // Configure Input node
    const inputNode = page.locator('.react-flow__node-input').first();
    await inputNode.click({ force: true });
    await page.waitForTimeout(500);

    const valueInput = page.locator('input[placeholder="Enter your input..."], textarea[placeholder]').first();
    if (await valueInput.isVisible()) {
      await valueInput.fill('https://example.com');
    }

    await page.screenshot({ path: 'e2e/results/firecrawl-flow-02-input-configured.png', fullPage: true });

    // Note: We won't click Run since we're using stub data and don't have real API keys
    // The test validates that the UI accepts the node types and shows proper config panels
  });

  test('Full Flow: Input → Apify Actor → Output', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    // Drop 3 nodes in a row
    await dragNodeToCanvas(page, 'input', cx + 150, cy + 250);
    await dragNodeToCanvas(page, 'apify_actor', cx + 400, cy + 250);
    await dragNodeToCanvas(page, 'output', cx + 650, cy + 250);

    await page.screenshot({ path: 'e2e/results/apify-flow-01-nodes.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(3);

    // Configure Apify node
    const apifyNode = page.locator('.react-flow__node').nth(1);
    await apifyNode.click({ force: true });
    await page.waitForTimeout(500);

    const actorIdInput = page.locator('input[placeholder*="apify/"]').first();
    if (await actorIdInput.isVisible()) {
      await actorIdInput.fill('apify/instagram-scraper');
    }

    await page.screenshot({ path: 'e2e/results/apify-flow-02-apify-configured.png', fullPage: true });
  });

  test('Full Flow: Input → MCP Server → Output', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    // Drop 3 nodes in a row
    await dragNodeToCanvas(page, 'input', cx + 150, cy + 250);
    await dragNodeToCanvas(page, 'mcp_server', cx + 400, cy + 250);
    await dragNodeToCanvas(page, 'output', cx + 650, cy + 250);

    await page.screenshot({ path: 'e2e/results/mcp-flow-01-nodes.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(3);

    // Configure MCP node
    const mcpNode = page.locator('.react-flow__node').nth(1);
    await mcpNode.click({ force: true });
    await page.waitForTimeout(500);

    const serverNameInput = page.locator('input[placeholder*="GitHub"], input[placeholder*="server"]').first();
    if (await serverNameInput.isVisible()) {
      await serverNameInput.fill('GitHub');
    }

    await page.screenshot({ path: 'e2e/results/mcp-flow-02-mcp-configured.png', fullPage: true });
  });

  test('Full Flow: Input → Hugging Face Inference → Output', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    // Drop 3 nodes in a row
    await dragNodeToCanvas(page, 'input', cx + 150, cy + 250);
    await dragNodeToCanvas(page, 'huggingface_inference', cx + 400, cy + 250);
    await dragNodeToCanvas(page, 'output', cx + 650, cy + 250);

    await page.screenshot({ path: 'e2e/results/hf-flow-01-nodes.png', fullPage: true });

    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(3);

    // Configure HF node
    const hfNode = page.locator('.react-flow__node').nth(1);
    await hfNode.click({ force: true });
    await page.waitForTimeout(500);

    const modelIdInput = page.locator('input[placeholder*="meta-llama"], input[placeholder*="model"]').first();
    if (await modelIdInput.isVisible()) {
      await modelIdInput.fill('meta-llama/Llama-3.2-3B');
    }

    await page.screenshot({ path: 'e2e/results/hf-flow-02-hf-configured.png', fullPage: true });
  });

  test.afterAll(() => {
    if (ERRORS.length > 0) {
      console.log('\n========== COLLECTED ERRORS ==========');
      ERRORS.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      console.log('======================================\n');
    } else {
      console.log('\n✓ No errors collected during external integrations test run\n');
    }
  });
});
