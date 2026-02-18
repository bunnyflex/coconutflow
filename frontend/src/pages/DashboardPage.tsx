import { AppShell } from '../components/layout/AppShell';

export function DashboardPage() {
  return (
    <AppShell>
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-gray-400 mt-2">Your flows will appear here.</p>
      </div>
    </AppShell>
  );
}
