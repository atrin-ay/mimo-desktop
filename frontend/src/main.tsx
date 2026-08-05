import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<div className="flex items-center justify-center min-h-screen bg-obsidian text-white text-sm font-mono">Something went wrong, reload the app.</div>}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
