import { render } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from '../../src/App.jsx';
import { BackendProvider } from '../../src/lib/backend/BackendContext.jsx';
import { createDemoBackend } from '../../src/lib/backend/demoBackend.js';

export function LocationProbe() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

export const nav = { go: null };
function NavProbe() {
  nav.go = useNavigate();
  return null;
}

export function renderApp(path, backend = createDemoBackend()) {
  const utils = render(
    <BackendProvider backend={backend}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
        <NavProbe />
      </MemoryRouter>
    </BackendProvider>,
  );
  return { ...utils, backend };
}
