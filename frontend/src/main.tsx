import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { useFlowStore } from './store/flowStore'
import { useAuthStore } from './store/authStore'

// Expose store for E2E testing in dev mode
if (import.meta.env.DEV) {
  (window as any).__flowStore = useFlowStore;
}

// Initialize auth session on app startup
useAuthStore.getState().init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
