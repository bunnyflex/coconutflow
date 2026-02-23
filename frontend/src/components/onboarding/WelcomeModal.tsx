import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Key, Sparkles, ArrowRight, Loader2, Check } from 'lucide-react';
import { credentialsApi } from '../../services/api';

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setStep(2);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await credentialsApi.create({
        service_name: 'openai',
        credential_name: 'OpenAI API Key',
        api_key: apiKey.trim(),
      });
      setSaved(true);
      setTimeout(() => setStep(2), 800);
    } catch {
      setError('Failed to save key. You can add it later in Settings → Keys.');
    } finally {
      setSaving(false);
    }
  };

  const handleTryTemplate = () => {
    localStorage.setItem('coconut_has_seen_welcome', 'true');
    onClose();
    navigate('/templates');
  };

  const handleSkip = () => {
    localStorage.setItem('coconut_has_seen_welcome', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= step ? 'w-8 bg-indigo-500' : 'w-4 bg-gray-700'
                }`}
              />
            ))}
          </div>
          <button onClick={handleSkip} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Sparkles className="text-indigo-400" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">Welcome to CoconutFlow</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Build AI workflows visually — drag nodes, connect them, and run powerful agent pipelines without writing code.
              </p>
              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Get Started <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 1: API Key */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Key className="text-amber-400" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">Add your API key</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                CoconutFlow uses your own API keys to run AI models. Add an OpenAI key to get started.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2.5 text-gray-400 hover:text-white text-sm font-medium rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleSaveKey}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saved && <Check size={14} />}
                  {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Key'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: You're all set */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Sparkles className="text-emerald-400" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">You're all set!</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Start with a template or create a flow from scratch. You can always add more API keys later in the Keys page.
              </p>
              <button
                onClick={handleTryTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Browse Templates <ArrowRight size={16} />
              </button>
              <button
                onClick={handleSkip}
                className="w-full px-4 py-2.5 text-gray-400 hover:text-white text-sm font-medium rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
