import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useFlowStore } from './store/flowStore'

// Expose store for E2E testing in dev mode
if (import.meta.env.DEV) {
  (window as any).__flowStore = useFlowStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
