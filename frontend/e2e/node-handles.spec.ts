import { test, expect } from '@playwright/test';

/**
 * E2E tests verifying ReactFlow node handles sit flush on the MagicCard edge
 * and all text content is properly contained within the card boundary.
 *
 * Uses the Zustand store exposed on window.__flowStore (dev mode only)
 * to add nodes programmatically — avoids flaky HTML5 drag-and-drop simulation.
 */

const NODE_CONFIGS: { type: string; label: string; hasLeft: boolean; hasRight: boolean }[] = [
  { type: 'input',          label: 'Input',          hasLeft: false, hasRight: true },
  { type: 'output',         label: 'Output',         hasLeft: true,  hasRight: false },
  { type: 'llm_agent',      label: 'LLM Agent',      hasLeft: true,  hasRight: true },
  { type: 'conditional',    label: 'Conditional',     hasLeft: true,  hasRight: true },
  { type: 'web_search',     label: 'Web Search',      hasLeft: true,  hasRight: true },
  { type: 'knowledge_base', label: 'Knowledge Base',  hasLeft: true,  hasRight: true },
];

test.describe('Node handle positioning & text alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  for (const cfg of NODE_CONFIGS) {
    test(`${cfg.type}: handles on card edge, text inside card`, async ({ page }) => {
      // Add the node programmatically via the exposed Zustand store
      await page.evaluate((nodeType) => {
        const store = (window as any).__flowStore;
        if (store) {
          store.getState().addNode(nodeType, { x: 300, y: 300 });
        }
      }, cfg.type);

      // Wait for the node to render
      const nodeSelector = `.react-flow__node-${cfg.type}`;
      const node = page.locator(nodeSelector).last();
      await expect(node).toBeVisible({ timeout: 5000 });

      // Get the MagicCard outer div (has "group" and "relative" in its class)
      const cardOuter = node.locator('[class*="group"][class*="relative"]').first();
      const cardBox = await cardOuter.boundingBox();
      expect(cardBox, 'Card should have a bounding box').toBeTruthy();

      // --- Handle position checks ---

      if (cfg.hasRight) {
        const rightHandles = node.locator('.react-flow__handle-right');
        const count = await rightHandles.count();
        expect(count, `${cfg.type} should have right handle(s)`).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          const hBox = await rightHandles.nth(i).boundingBox();
          expect(hBox).toBeTruthy();
          const handleCenterX = hBox!.x + hBox!.width / 2;
          const cardRight = cardBox!.x + cardBox!.width;
          const offset = Math.abs(handleCenterX - cardRight);
          expect(offset, `${cfg.type} right handle ${i}: center ${handleCenterX.toFixed(1)} vs card right ${cardRight.toFixed(1)}`).toBeLessThan(5);
        }
      }

      if (cfg.hasLeft) {
        const leftHandles = node.locator('.react-flow__handle-left');
        const count = await leftHandles.count();
        expect(count, `${cfg.type} should have left handle(s)`).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          const hBox = await leftHandles.nth(i).boundingBox();
          expect(hBox).toBeTruthy();
          const handleCenterX = hBox!.x + hBox!.width / 2;
          const cardLeft = cardBox!.x;
          const offset = Math.abs(handleCenterX - cardLeft);
          expect(offset, `${cfg.type} left handle ${i}: center ${handleCenterX.toFixed(1)} vs card left ${cardLeft.toFixed(1)}`).toBeLessThan(5);
        }
      }

      // --- Text alignment checks ---
      // Note: ReactFlow's zoom transform causes getBoundingClientRect() to have
      // sub-pixel rounding differences between parent and child elements.
      // We use a generous tolerance since the visual alignment is correct.

      const labelEl = node.locator('.font-semibold').first();
      await expect(labelEl).toBeVisible();
      const labelBox = await labelEl.boundingBox();
      expect(labelBox).toBeTruthy();

      // Label left edge should be inside or very close to card left
      expect(labelBox!.x, `${cfg.type} label left edge inside card`).toBeGreaterThanOrEqual(cardBox!.x - 2);
      // Label top should be inside the card
      expect(labelBox!.y, `${cfg.type} label top inside card`).toBeGreaterThanOrEqual(cardBox!.y - 2);
      // Label bottom should be inside the card
      expect(labelBox!.y + labelBox!.height, `${cfg.type} label bottom inside card`).toBeLessThanOrEqual(cardBox!.y + cardBox!.height + 2);
    });
  }
});
