import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AppShell } from '../components/layout/AppShell';
import { ChevronRight } from 'lucide-react';

// Import all docs as raw strings using Vite's ?raw suffix
import gettingStarted from '../docs/getting-started.md?raw';
import firstFlow from '../docs/first-flow.md?raw';
import nodeInput from '../docs/nodes/input.md?raw';
import nodeLLMAgent from '../docs/nodes/llm-agent.md?raw';
import nodeWebSearch from '../docs/nodes/web-search.md?raw';
import nodeKnowledgeBase from '../docs/nodes/knowledge-base.md?raw';
import nodeConditional from '../docs/nodes/conditional.md?raw';
import nodeOutput from '../docs/nodes/output.md?raw';
import nodeFirecrawl from '../docs/nodes/firecrawl.md?raw';
import nodeApify from '../docs/nodes/apify.md?raw';
import nodeMCP from '../docs/nodes/mcp-server.md?raw';
import nodeHuggingFace from '../docs/nodes/huggingface.md?raw';
import tutorialResearch from '../docs/tutorials/research-pipeline.md?raw';
import tutorialRAG from '../docs/tutorials/rag-documents.md?raw';
import apiPythonExport from '../docs/api/python-export.md?raw';

const DOCS: Record<string, string> = {
  'getting-started': gettingStarted,
  'first-flow': firstFlow,
  'nodes/input': nodeInput,
  'nodes/llm-agent': nodeLLMAgent,
  'nodes/web-search': nodeWebSearch,
  'nodes/knowledge-base': nodeKnowledgeBase,
  'nodes/conditional': nodeConditional,
  'nodes/output': nodeOutput,
  'nodes/firecrawl': nodeFirecrawl,
  'nodes/apify': nodeApify,
  'nodes/mcp-server': nodeMCP,
  'nodes/huggingface': nodeHuggingFace,
  'tutorials/research-pipeline': tutorialResearch,
  'tutorials/rag-documents': tutorialRAG,
  'api/python-export': apiPythonExport,
};

interface DocItem {
  id: string;
  label: string;
}

interface DocSection {
  title: string;
  items: DocItem[];
}

const STRUCTURE: DocSection[] = [
  {
    title: 'Getting Started',
    items: [
      { id: 'getting-started', label: 'What is CoconutFlow?' },
      { id: 'first-flow', label: 'Your first flow' },
    ],
  },
  {
    title: 'Node Reference',
    items: [
      { id: 'nodes/input', label: 'Input' },
      { id: 'nodes/llm-agent', label: 'LLM Agent' },
      { id: 'nodes/web-search', label: 'Web Search' },
      { id: 'nodes/knowledge-base', label: 'Knowledge Base' },
      { id: 'nodes/conditional', label: 'Conditional' },
      { id: 'nodes/output', label: 'Output' },
      { id: 'nodes/firecrawl', label: 'Firecrawl' },
      { id: 'nodes/apify', label: 'Apify' },
      { id: 'nodes/mcp-server', label: 'MCP Server' },
      { id: 'nodes/huggingface', label: 'Hugging Face' },
    ],
  },
  {
    title: 'Tutorials',
    items: [
      { id: 'tutorials/research-pipeline', label: 'Research Pipeline' },
      { id: 'tutorials/rag-documents', label: 'RAG with Documents' },
    ],
  },
  {
    title: 'API & Export',
    items: [{ id: 'api/python-export', label: 'Python Export' }],
  },
];

export function DocsPage() {
  const [selected, setSelected] = useState('getting-started');
  const content =
    DOCS[selected] ?? '# Not found\nThis document does not exist yet.';

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Docs nav sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-gray-700/60 px-3 py-6 overflow-y-auto">
          {STRUCTURE.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-1">
                {section.title}
              </p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  className={`w-full text-left flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors ${
                    selected === item.id
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {selected === item.id && (
                    <ChevronRight size={12} className="flex-shrink-0" />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-10 py-8">
          <article className="prose prose-invert prose-sm max-w-2xl">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </main>
      </div>
    </AppShell>
  );
}
