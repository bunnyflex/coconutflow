#!/usr/bin/env node

/**
 * Node Catalog Verification Script
 *
 * Programmatically verifies that NODE_TYPE_CATALOG in frontend/src/types/flow.ts
 * contains all 10 required node types with correct structure.
 *
 * Usage: node scripts/verify-node-catalog.js
 */

const fs = require('fs');
const path = require('path');

// Expected node types
const EXPECTED_NODES = [
  // Original 6 nodes
  { type: 'input', label: 'Input', category: 'input_output', icon: 'ArrowDownToLine' },
  { type: 'output', label: 'Output', category: 'input_output', icon: 'ArrowUpFromLine' },
  { type: 'llm_agent', label: 'LLM Agent', category: 'processing', icon: 'Bot' },
  { type: 'conditional', label: 'Conditional', category: 'processing', icon: 'GitBranch' },
  { type: 'web_search', label: 'Web Search', category: 'tools', icon: 'Globe' },
  { type: 'knowledge_base', label: 'Knowledge Base', category: 'tools', icon: 'BookOpen' },
  // New 4 external integration nodes
  { type: 'firecrawl_scrape', label: 'Firecrawl Scrape', category: 'tools', icon: 'Flame' },
  { type: 'apify_actor', label: 'Apify Actor', category: 'tools', icon: 'PlayCircle' },
  { type: 'mcp_server', label: 'MCP Server', category: 'tools', icon: 'Blocks' },
  { type: 'huggingface_inference', label: 'Hugging Face', category: 'tools', icon: 'Brain' },
];

const REQUIRED_ICONS = [
  'ArrowDownToLine', 'ArrowUpFromLine', 'Bot', 'GitBranch', 'Globe', 'BookOpen',
  'Flame', 'PlayCircle', 'Blocks', 'Brain'
];

const REQUIRED_CATEGORIES = ['input_output', 'processing', 'tools'];

function main() {
  console.log('🔍 Verifying NODE_TYPE_CATALOG...\n');

  const flowTsPath = path.join(__dirname, '../frontend/src/types/flow.ts');

  if (!fs.existsSync(flowTsPath)) {
    console.error('❌ Error: Could not find frontend/src/types/flow.ts');
    process.exit(1);
  }

  const content = fs.readFileSync(flowTsPath, 'utf8');

  // Check 1: Icon imports
  console.log('✓ Step 1: Verify icon imports');
  const importMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/);
  if (!importMatch) {
    console.error('❌ Could not find lucide-react import');
    process.exit(1);
  }

  const importedIcons = importMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let missingIcons = [];
  REQUIRED_ICONS.forEach(icon => {
    if (!importedIcons.includes(icon)) {
      missingIcons.push(icon);
    }
  });

  if (missingIcons.length > 0) {
    console.error(`❌ Missing icon imports: ${missingIcons.join(', ')}`);
    process.exit(1);
  }
  console.log(`  → All ${REQUIRED_ICONS.length} icons imported: ${REQUIRED_ICONS.join(', ')}\n`);

  // Check 2: NODE_TYPE_CATALOG definition
  console.log('✓ Step 2: Verify NODE_TYPE_CATALOG structure');

  const catalogMatch = content.match(/export const NODE_TYPE_CATALOG.*?=\s*\[(.*?)\];/s);
  if (!catalogMatch) {
    console.error('❌ Could not find NODE_TYPE_CATALOG definition');
    process.exit(1);
  }

  const catalogContent = catalogMatch[1];

  // Check 3: Count node entries
  console.log('✓ Step 3: Count node entries');
  const nodeEntries = catalogContent.match(/type:\s*['"](\w+)['"]/g);
  if (!nodeEntries) {
    console.error('❌ Could not parse node entries');
    process.exit(1);
  }

  const nodeCount = nodeEntries.length;
  if (nodeCount !== 10) {
    console.error(`❌ Expected 10 nodes, found ${nodeCount}`);
    process.exit(1);
  }
  console.log(`  → Found ${nodeCount} node entries\n`);

  // Check 4: Verify each expected node
  console.log('✓ Step 4: Verify each node definition');
  let allFound = true;

  EXPECTED_NODES.forEach(expected => {
    const nodeRegex = new RegExp(
      `type:\\s*['"]${expected.type}['"].*?` +
      `label:\\s*['"]${expected.label}['"].*?` +
      `category:\\s*['"]${expected.category}['"]`,
      's'
    );

    if (!nodeRegex.test(catalogContent)) {
      console.error(`❌ Node "${expected.type}" missing or incorrect`);
      allFound = false;
    } else {
      // Check if icon is used (approximate check)
      const iconRegex = new RegExp(`ic\\(${expected.icon}\\)`);
      if (!iconRegex.test(catalogContent)) {
        console.warn(`⚠️  Node "${expected.type}" may not use expected icon "${expected.icon}"`);
      }
    }
  });

  if (!allFound) {
    process.exit(1);
  }

  // Print summary table
  console.log('\n📊 Node Catalog Summary:\n');
  console.log('┌─────┬──────────────────────┬─────────────────┬────────────────┬──────────────┐');
  console.log('│  #  │ Type                 │ Label           │ Category       │ Icon         │');
  console.log('├─────┼──────────────────────┼─────────────────┼────────────────┼──────────────┤');

  EXPECTED_NODES.forEach((node, i) => {
    const num = (i + 1).toString().padStart(2, ' ');
    const type = node.type.padEnd(20, ' ');
    const label = node.label.padEnd(15, ' ');
    const category = node.category.padEnd(14, ' ');
    const icon = node.icon.padEnd(12, ' ');
    const marker = i >= 6 ? '⭐' : '  '; // Mark new external nodes

    console.log(`│ ${num} ${marker}│ ${type} │ ${label} │ ${category} │ ${icon} │`);
  });

  console.log('└─────┴──────────────────────┴─────────────────┴────────────────┴──────────────┘');

  // Category distribution
  console.log('\n📂 Category Distribution:\n');
  const categoryCounts = {};
  EXPECTED_NODES.forEach(node => {
    categoryCounts[node.category] = (categoryCounts[node.category] || 0) + 1;
  });

  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`  ${category.padEnd(15, ' ')}: ${count} nodes`);
  });

  console.log('\n✅ All verifications passed! UI should display all 10 nodes correctly.\n');
}

main();
