import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const BackendContext = createContext(null);
const AuthContext = createContext(null);

export function BackendProvider({ backend, children }) {
  const [auth, setAuth] = useState({ loading: true, session: null, isOwner: false, error: null });

  const refresh = useCallback(
    async (session) => {
      if (!session) {
        setAuth({ loading: false, session: null, isOwner: false, error: null });
        return;
      }
      try {
        const isOwner = await backend.isOwner();
        setAuth({ loading: false, session, isOwner, error: null });
      } catch (e) {
        setAuth({ loading: false, session, isOwner: false, error: e.message });
      }
    },
    [backend],
  );

  useEffect(() => {
    let alive = true;
    backend.getSession().then((s) => alive && refresh(s));
    const off = backend.onAuthChange((s) => alive && refresh(s));
    return () => {
      alive = false;
      off();
    };
  }, [backend, refresh]);

  return (
    <BackendContext.Provider value={backend}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </BackendContext.Provider>
  );
}

export const useBackend = () => useContext(BackendContext);
export const useAuth = () => useContext(AuthContext);
