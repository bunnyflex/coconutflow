import { useNavigate } from 'react-router-dom';
import { ArrowRight, Workflow, Key, BookOpen } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800/60">
        <span className="text-lg font-semibold text-white tracking-tight">CoconutFlow</span>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Build AI workflows <span className="text-indigo-400">visually</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl">
          Drag, connect, and run powerful AI agent pipelines — no code required. Bring your own API keys and start building in minutes.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors text-base"
        >
          Get Started Free <ArrowRight size={18} />
        </button>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 pb-16 max-w-4xl mx-auto w-full">
        {[
          { icon: Workflow, title: 'Visual Builder', desc: 'Drag nodes onto a canvas and connect them into AI pipelines' },
          { icon: Key, title: 'Bring Your Own Keys', desc: 'Use your own OpenAI, Anthropic, or Google API keys — we never store them in plaintext' },
          { icon: BookOpen, title: 'Starter Templates', desc: 'Pick from ready-made templates for research, content writing, and more' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-5 space-y-3">
            <Icon className="text-indigo-400" size={24} />
            <h3 className="text-white font-medium text-sm">{title}</h3>
            <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
