/**
 * E2E Test: Chat Panel
 *
 * Tests the chatbot-style interaction panel:
 * 1. Chat button toggles the panel open/closed
 * 2. Sending a message runs the flow and shows response
 * 3. Warning when sending with no flow on canvas
 */

import { test, expect, type Page } from '@playwright/test';

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
      dt.setData('application/agnoflow-node', nodeType);
      canvas.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true, cancelable: true,
          clientX: targetX, clientY: targetY, dataTransfer: dt,
        }),
      );
      canvas.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true, cancelable: true,
          clientX: targetX, clientY: targetY, dataTransfer: dt,
        }),
      );
    },
    { nodeType, targetX, targetY },
  );
  await page.waitForTimeout(500);
}

test.describe('Chat Panel', () => {
  test('Chat button toggles chat panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Chat panel should not be visible initially
    const chatPanel = page.locator('text=Send a message to run your flow');
    await expect(chatPanel).not.toBeVisible();

    // Click chat button in toolbar
    const chatButton = page.locator('button[title="Toggle chat"]');
    await expect(chatButton).toBeVisible();
    await chatButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/results/chat-01-open.png', fullPage: true });

    // Chat panel should now be visible
    await expect(chatPanel).toBeVisible();

    // Click again to close
    await chatButton.click();
    await page.waitForTimeout(500);
    await expect(chatPanel).not.toBeVisible();
  });

  test('Chat sends message and receives flow output', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Build a simple Input → LLM Agent → Output flow
    const canvas = page.locator('.react-flow');
    const canvasBox = await canvas.boundingBox();
    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    await dragNodeToCanvas(page, 'input', cx + 200, cy + 150);
    await dragNodeToCanvas(page, 'llm_agent', cx + 500, cy + 300);
    await dragNodeToCanvas(page, 'output', cx + 200, cy + 450);

    // Open chat panel
    const chatButton = page.locator('button[title="Toggle chat"]');
    await chatButton.click();
    await page.waitForTimeout(500);

    // Type a message
    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Hello');

    // Send button should be enabled
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeEnabled();

    await page.screenshot({ path: 'e2e/results/chat-02-ready.png', fullPage: true });

    // Send the message
    await sendButton.click();

    // User message bubble should appear
    const userBubble = page.locator('text=Hello').first();
    await expect(userBubble).toBeVisible({ timeout: 5000 });

    // Wait for flow execution
    await page.waitForTimeout(8000);

    await page.screenshot({ path: 'e2e/results/chat-03-response.png', fullPage: true });

    // Should have at least 2 message bubbles (user + assistant/system)
    const bubbles = page.locator('[class*="rounded-xl"]');
    const count = await bubbles.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Chat shows warning when no flow exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Open chat panel
    const chatButton = page.locator('button[title="Toggle chat"]');
    await chatButton.click();
    await page.waitForTimeout(500);

    // Type and send on empty canvas
    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.fill('Hello');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    await page.waitForTimeout(1000);

    // Should show a warning toast
    const warning = page.locator('text=No flow').first();
    const hasWarning = await warning.isVisible().catch(() => false);

    await page.screenshot({ path: 'e2e/results/chat-04-no-flow.png', fullPage: true });

    expect(hasWarning).toBe(true);
  });
});
