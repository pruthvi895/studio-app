import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

if (import.meta.env.VITE_SMOKE === 'true') {
  void import('./smoke').then(({ installSmokeHooks }) => installSmokeHooks());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
