import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * New pages start at the top. Back/Forward (POP) keeps the browser's own scroll restoration, and
 * filter changes on the same page don't jump; only a new path or a new results page scrolls.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  const type = useNavigationType();
  const page = new URLSearchParams(search).get('page');
  useEffect(() => {
    if (type !== 'POP') window.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, page]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
