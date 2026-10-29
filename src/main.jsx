import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { AppRoutes } from './App.jsx';
import { BackendProvider } from './lib/backend/BackendContext.jsx';
import { backendFromEnv } from './lib/backend/index.js';

const { backend, configError } = backendFromEnv();
const root = createRoot(document.getElementById('root'));

if (!backend) {
  root.render(
    <main style={{ maxWidth: 560, margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
      <h1>Site not configured</h1>
      <p>{configError}</p>
      <p>See README.md, “Setup”.</p>
    </main>,
  );
} else {
  root.render(
    <StrictMode>
      <BackendProvider backend={backend}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </BackendProvider>
    </StrictMode>,
  );
}
