import { useEffect } from 'react';
import { pageTitle } from '../config/shop.js';

/** Sets the browser tab title to "<title> · <shop name>" while the page is shown. */
export function usePageTitle(title) {
  useEffect(() => {
    if (title !== undefined) document.title = pageTitle(title);
  }, [title]);
}
