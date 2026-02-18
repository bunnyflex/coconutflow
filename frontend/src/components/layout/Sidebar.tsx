import { Home, Layers, BookOpen, Key, FileText } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/flows', icon: Layers, label: 'My Flows', comingSoon: true },
  { to: '/templates', icon: BookOpen, label: 'Templates' },
  { to: '/keys', icon: Key, label: 'Keys' },
  { to: '/docs', icon: FileText, label: 'Docs' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-700/60 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-700/60">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 text-white font-semibold text-lg hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">🥥</span>
          <span>CoconutFlow</span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, comingSoon }) =>
          comingSoon ? (
            <div
              key={to}
              title="Coming soon"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 cursor-not-allowed select-none"
            >
              <Icon size={16} />
              {label}
              <span className="ml-auto text-xs text-gray-700">Soon</span>
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-400 border-l-2 border-indigo-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          )
        )}
      </nav>

      {/* Profile / auth section */}
      <div className="px-5 py-4 border-t border-gray-700/60">
        {user ? (
          <button
            onClick={() => navigate('/account')}
            className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors w-full"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold flex-shrink-0">
              {(user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ??
                user.email?.[0]?.toUpperCase() ??
                'U'}
            </div>
            <span className="truncate">
              {(user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Account'}
            </span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-3 text-sm text-gray-500 hover:text-white transition-colors w-full"
          >
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold flex-shrink-0">
              ?
            </div>
            <span>Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
}
