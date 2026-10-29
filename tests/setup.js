import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// jsdom has no layout, so scrolling is a no-op (ScrollToTop calls it on navigation).
if (typeof window !== 'undefined') window.scrollTo = () => {};

afterEach(async () => {
  if (typeof document !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});
