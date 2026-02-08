/**
 * DEMO: Knowledge Base Multi-Source RAG (VISIBLE BROWSER)
 *
 * Watch the browser build and execute a RAG flow with:
 * - File upload (AI healthcare document)
 * - Website URL (Python docs)
 * - YouTube URL (tutorial video)
 */

import { test, expect } from '@playwright/test';

test.describe('KB Multi-Source Demo', () => {
  test('Build and run RAG flow with file + website + YouTube', async ({ page }) => {
    console.log('\n🎬 === KNOWLEDGE BASE MULTI-SOURCE RAG DEMO ===\n');

    // Step 1: Load app
    console.log('📱 [1/10] Loading CoconutFlow app...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    console.log('✅ App loaded\n');

    // Step 2: Drag Input node
    console.log('📥 [2/10] Dragging Input node onto canvas...');
    await page.evaluate(() => {
      const canvas = document.querySelector('.react-flow') as HTMLElement;
      if (!canvas) throw new Error('Canvas not found');

      const dt = new DataTransfer();
      dt.setData('application/agnoflow-node', 'input');

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 300,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(dragOverEvent);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 300,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(dropEvent);
    });
    await page.waitForTimeout(1000);
    console.log('✅ Input node added\n');

    // Step 3: Configure Input with query
    console.log('⚙️  [3/10] Configuring Input node with query...');
    const inputNode = page.locator('.react-flow__node').first();
    await inputNode.click();
    await page.waitForTimeout(500);

    const inputField = page.locator('textarea, input[type="text"]').first();
    await inputField.fill('What are the main applications of AI in healthcare?');
    console.log('   Query: "What are the main applications of AI in healthcare?"');
    console.log('✅ Input configured\n');

    // Step 4: Drag Knowledge Base node
    console.log('📚 [4/10] Dragging Knowledge Base node...');
    await page.evaluate(() => {
      const canvas = document.querySelector('.react-flow') as HTMLElement;
      const dt = new DataTransfer();
      dt.setData('application/agnoflow-node', 'knowledge_base');

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: 600,
        clientY: 300,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(dragOverEvent);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: 600,
        clientY: 300,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(dropEvent);
    });
    await page.waitForTimeout(1000);
    console.log('✅ Knowledge Base node added\n');

    // Step 5: Drag Output node
    console.log('📤 [5/10] Dragging Output node...');
    await page.evaluate(() => {
      const canvas = document.querySelector('.react-flow') as HTMLElement;
      const dt = new DataTransfer();
      dt.setData('application/agnoflow-node', 'output');

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: 900,
        clientY: 300,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(dragOverEvent);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: 900,
        clientY: 300,
        dataTransfer: dt,
      });
      canvas.dispatchEvent(dropEvent);
    });
    await page.waitForTimeout(1000);
    console.log('✅ Output node added\n');

    // Step 6: Connect nodes programmatically
    console.log('🔗 [6/10] Connecting nodes: Input → KB → Output...');
    await page.evaluate(() => {
      const store = (window as any).flowStore;
      if (!store) throw new Error('Flow store not found');

      const { nodes, addEdge } = store.getState();
      const inputNode = nodes[0];
      const kbNode = nodes[1];
      const outputNode = nodes[2];

      // Input → KB
      addEdge({
        id: 'e1',
        source: inputNode.id,
        target: kbNode.id,
        sourceHandle: null,
        targetHandle: null,
      });

      // KB → Output
      addEdge({
        id: 'e2',
        source: kbNode.id,
        target: outputNode.id,
        sourceHandle: null,
        targetHandle: null,
      });
    });
    await page.waitForTimeout(1000);
    console.log('✅ Nodes connected\n');

    // Step 7: Configure KB with multi-source
    console.log('🔧 [7/10] Configuring Knowledge Base with MULTI-SOURCE...');
    const kbNode = page.locator('.react-flow__node').nth(1);
    await kbNode.click();
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const store = (window as any).flowStore;
      const nodes = store.getState().nodes;
      const kbNode = nodes.find((n: any) => n.type === 'knowledge_base');

      store.getState().updateNode(kbNode.id, {
        data: {
          ...kbNode.data,
          config: {
            knowledge_base: {
              kb_type: 'document',
              vector_db: 'pgvector',
              sources: [
                '/Users/affinitylabs/Downloads/coconut/coconutflow-main/backend/uploads/655140be-5451-4328-a8bc-b4c317d81f87.txt',
                'https://docs.python.org/3/tutorial/introduction.html',
                'https://www.youtube.com/watch?v=kqtD5dpn9C8'
              ],
              chunk_size: 500,
              chunk_overlap: 50,
              top_k: 5,
              search_type: 'hybrid'
            }
          }
        }
      });
    });
    await page.waitForTimeout(500);

    console.log('   📄 Source 1: File (AI healthcare document)');
    console.log('   🌐 Source 2: Website (Python documentation)');
    console.log('   🎥 Source 3: YouTube (tutorial video)');
    console.log('✅ Multi-source configured\n');

    // Step 8: Run the flow
    console.log('🚀 [8/10] Running the RAG flow...');
    console.log('   This will:');
    console.log('   1. Load all 3 sources (file, website, YouTube)');
    console.log('   2. Chunk the documents (500 chars, 50 overlap)');
    console.log('   3. Embed chunks with OpenAI');
    console.log('   4. Store in Supabase pgvector');
    console.log('   5. Query with RAG agent (GPT-4o-mini)');
    console.log('   6. Generate answer\n');

    const runButton = page.locator('button', { hasText: 'Run' });
    await runButton.click();
    await page.waitForTimeout(2000);
    console.log('✅ Flow started\n');

    // Step 9: Watch execution
    console.log('⏳ [9/10] Watching RAG pipeline execute...');
    console.log('   (This takes 30-60 seconds with real documents)');
    console.log('   Watch the browser - nodes will show running status!\n');

    // Monitor WebSocket events
    let completionDetected = false;
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('flow_complete')) {
        completionDetected = true;
      }
    });

    // Wait for completion (max 90 seconds)
    for (let i = 0; i < 18; i++) {
      await page.waitForTimeout(5000);
      if (completionDetected) {
        console.log('   ✅ Flow completed!');
        break;
      }
      console.log(`   ⏳ Still running... (${(i + 1) * 5}s elapsed)`);
    }

    await page.waitForTimeout(2000);

    // Step 10: Check results
    console.log('\n📊 [10/10] Checking RAG results...');
    const outputNode = page.locator('.react-flow__node').nth(2);
    await outputNode.click();
    await page.waitForTimeout(1000);

    const configPanel = page.locator('aside').last();
    const outputText = await configPanel.textContent() || '';

    const hasHealthcareContent =
      outputText.toLowerCase().includes('healthcare') ||
      outputText.toLowerCase().includes('diagnosis') ||
      outputText.toLowerCase().includes('medical') ||
      outputText.toLowerCase().includes('drug');

    console.log(`   RAG Answer Preview: ${outputText.substring(0, 200)}...`);
    console.log(`   Contains healthcare content: ${hasHealthcareContent ? '✅ YES' : '❌ NO'}\n`);

    // Keep browser open for inspection
    console.log('🎉 === DEMO COMPLETE ===');
    console.log('Browser will stay open for 30 seconds for inspection...\n');
    await page.waitForTimeout(30000);

    expect(hasHealthcareContent).toBe(true);
  });
});
