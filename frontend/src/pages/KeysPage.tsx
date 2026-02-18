import { useEffect, useState } from 'react';
import { Trash2, Plus, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { credentialsApi, type Credential } from '../services/api';

const SERVICES = ['OpenAI', 'Anthropic', 'Firecrawl', 'Apify', 'HuggingFace', 'Other'];

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

export function KeysPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Credential | null>(null);

  // Form state
  const [service, setService] = useState('OpenAI');
  const [credName, setCredName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { loadCredentials(); }, []);

  async function loadCredentials() {
    try {
      setLoading(true);
      setError(null);
      setCredentials(await credentialsApi.list());
    } catch {
      setError('Failed to load credentials. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const created = await credentialsApi.create({
        service_name: service,
        credential_name: credName,
        api_key: apiKey,
      });
      setCredentials((prev) => [created, ...prev]);
      setShowForm(false);
      setCredName('');
      setApiKey('');
      setService('OpenAI');
    } catch {
      setFormError('Failed to save credential. Check backend is running.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cred: Credential) {
    setDeleting(cred.id);
    try {
      await credentialsApi.delete(cred.id);
      setCredentials((prev) => prev.filter((c) => c.id !== cred.id));
    } catch {
      setError('Failed to delete credential.');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">API Keys</h1>
            <p className="text-gray-400 text-sm mt-1">
              Stored encrypted. Keys are never shown after saving.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'Add Key'}
          </button>
        </div>

        {/* Add Key Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 bg-gray-800/50 border border-gray-700/60 rounded-xl p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Service</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  value={credName}
                  onChange={(e) => setCredName(e.target.value)}
                  placeholder="e.g. Production"
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  required
                  className="w-full px-3 py-2 pr-9 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {formError && <p className="text-xs text-red-400">{formError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save Key
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading keys...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && credentials.length === 0 && !error && (
          <div className="text-center py-16 text-gray-500 text-sm">
            No API keys saved yet. Add your first key above.
          </div>
        )}

        {/* Credentials table */}
        {!loading && credentials.length > 0 && (
          <div className="border border-gray-700/60 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/60 bg-gray-800/30">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Service</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Key</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred, i) => (
                  <tr
                    key={cred.id}
                    className={i < credentials.length - 1 ? 'border-b border-gray-700/40' : ''}
                  >
                    <td className="px-4 py-3 text-white font-medium">{cred.service_name}</td>
                    <td className="px-4 py-3 text-gray-300">{cred.credential_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">••••••••••••</td>
                    <td className="px-4 py-3 text-gray-500">{timeAgo(cred.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDelete(cred)}
                        disabled={deleting === cred.id}
                        className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {deleting === cred.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Confirm delete dialog */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 max-w-sm w-full">
              <h3 className="text-white font-medium mb-2">Delete API Key?</h3>
              <p className="text-gray-400 text-sm mb-4">
                Remove{' '}
                <strong className="text-white">
                  {confirmDelete.service_name} — {confirmDelete.credential_name}
                </strong>
                ? This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
