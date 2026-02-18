import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

export function AccountPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [displayName, setDisplayName] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const isEmailAuth = user?.app_metadata?.provider === 'email';

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } });
      if (error) throw error;
      setMessage('Display name updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage('Password updated.');
      setNewPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password update failed');
    } finally {
      setSavingPw(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return (
      <AppShell>
        <div className="px-8 py-8">
          <p className="text-gray-400">
            You are not signed in.{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-400 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-lg">
        <h1 className="text-2xl font-semibold text-white mb-6">Account</h1>

        {message && <p className="text-sm text-green-400 mb-4">{message}</p>}
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {/* Email — read-only */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            value={user.email ?? ''}
            readOnly
            className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400 cursor-not-allowed"
          />
        </div>

        {/* Display name */}
        <form onSubmit={handleUpdateName} className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">Display Name</label>
          <div className="flex gap-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save
            </button>
          </div>
        </form>

        {/* Change password — email auth only */}
        {isEmailAuth && (
          <form onSubmit={handleUpdatePassword} className="mb-6">
            <label className="block text-sm text-gray-400 mb-1">New Password</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                minLength={6}
                className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={savingPw || !newPassword}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
              >
                {savingPw && <Loader2 size={12} className="animate-spin" />}
                Update
              </button>
            </div>
          </form>
        )}

        {/* Sign out */}
        <div className="pt-4 border-t border-gray-700/60">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </AppShell>
  );
}
