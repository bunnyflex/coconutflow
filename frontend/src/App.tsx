import { Routes, Route, Navigate } from 'react-router-dom';
import { CanvasPage } from './pages/CanvasPage';
import { DashboardPage } from './pages/DashboardPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { KeysPage } from './pages/KeysPage';
import { DocsPage } from './pages/DocsPage';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import ToastContainer from './components/ui/Toast';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/flow" element={<CanvasPage />} />
        <Route path="/flow/:id" element={<CanvasPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/keys" element={<KeysPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
