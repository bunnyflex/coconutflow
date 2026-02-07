import { test, expect } from '@playwright/test';

test('debug: verify animated beam edges render', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Add two nodes and connect them
  await page.evaluate(() => {
    const store = (window as any).__flowStore;
    if (!store) return;
    const s = store.getState();
    s.addNode('input', { x: 100, y: 200 });
    s.addNode('llm_agent', { x: 500, y: 200 });
  });

  await page.waitForTimeout(500);

  // Connect them via store
  await page.evaluate(() => {
    const store = (window as any).__flowStore;
    if (!store) return;
    const s = store.getState();
    const nodes = s.nodes;
    if (nodes.length >= 2) {
      s.onConnect({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: 'output',
        targetHandle: 'input',
      });
    }
  });

  await page.waitForTimeout(1500); // Wait for animation to start

  // Take screenshot
  await page.screenshot({
    path: '/Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend/e2e/debug-edge.png',
    fullPage: true,
  });

  // Verify edge exists
  const edges = page.locator('.react-flow__edge');
  const edgeCount = await edges.count();
  console.log('Edge count:', edgeCount);

  // Check for SVG gradient (the motion.linearGradient)
  const gradients = page.locator('linearGradient');
  const gradientCount = await gradients.count();
  console.log('linearGradient count:', gradientCount);

  // Check for the base wire path (strokeOpacity 0.2)
  const paths = page.locator('.react-flow__edge path');
  const pathCount = await paths.count();
  console.log('Edge path count:', pathCount);

  expect(edgeCount).toBeGreaterThan(0);
  expect(pathCount).toBeGreaterThanOrEqual(2); // base wire + gradient beam
});
