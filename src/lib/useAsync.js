import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async loader when deps change; ignores results from superseded runs. */
export function useAsync(loader, deps) {
  const [state, setState] = useState({ loading: true, data: undefined, error: null });
  const run = useRef(0);
  const load = useCallback(() => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then(
      (data) => id === run.current && setState({ loading: false, data, error: null }),
      (error) => id === run.current && setState({ loading: false, data: undefined, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}
