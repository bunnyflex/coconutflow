import { Routes, Route } from 'react-router-dom';
import { CanvasPage } from './pages/CanvasPage';
import { DashboardPage } from './pages/DashboardPage';
import ToastContainer from './components/ui/Toast';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/flow" element={<CanvasPage />} />
        <Route path="/flow/:id" element={<CanvasPage />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
