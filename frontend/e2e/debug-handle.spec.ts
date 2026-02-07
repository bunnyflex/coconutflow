import { test, expect } from '@playwright/test';

test('debug: inspect input node bounding boxes', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Add input node
  await page.evaluate(() => {
    const store = (window as any).__flowStore;
    if (store) store.getState().addNode('input', { x: 300, y: 300 });
  });

  await page.waitForTimeout(1000);

  // Take a screenshot for visual inspection
  await page.screenshot({ path: '/Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend/e2e/debug-input.png' });

  const node = page.locator('.react-flow__node-input').last();
  await expect(node).toBeVisible();

  // Check the full node wrapper bounding box
  const nodeBox = await node.boundingBox();
  console.log('Node wrapper:', JSON.stringify(nodeBox));

  // Check all elements with group+relative
  const groupRelatives = node.locator('[class*="group"]');
  const count = await groupRelatives.count();
  console.log('Elements with "group" class:', count);
  for (let i = 0; i < count; i++) {
    const box = await groupRelatives.nth(i).boundingBox();
    const cls = await groupRelatives.nth(i).getAttribute('class');
    console.log(`  [${i}] class="${cls?.substring(0, 80)}..." box:`, JSON.stringify(box));
  }

  // Check the label
  const label = node.locator('.font-semibold').first();
  const labelBox = await label.boundingBox();
  const labelText = await label.textContent();
  console.log('Label text:', labelText, 'box:', JSON.stringify(labelBox));

  // Check handle
  const handle = node.locator('.react-flow__handle-right');
  const handleBox = await handle.boundingBox();
  console.log('Handle:', JSON.stringify(handleBox));

  // Check the full card area by selecting the direct child of the node
  const directChild = node.locator('> *').first();
  const directChildBox = await directChild.boundingBox();
  const directChildCls = await directChild.getAttribute('class');
  console.log('Direct child class:', directChildCls?.substring(0, 100));
  console.log('Direct child box:', JSON.stringify(directChildBox));
});
