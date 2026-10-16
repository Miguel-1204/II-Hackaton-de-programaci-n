import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  cerrarSesion,
  iniciarSesion,
  obtenerPerfil,
} from "../services/authService";


// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      try {
        if (data.session && activo)
          setUsuario(await obtenerPerfil(data.session.user.id));
      } catch {
        if (activo) setUsuario(null);
      } finally {
        if (activo) setCargando(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") setUsuario(null);
    });
    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const perfil = await iniciarSesion(username, password);
    setUsuario(perfil);
    return perfil;
  }, []);

  const logout = useCallback(async () => {
    await cerrarSesion();
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ usuario, cargando, login, logout }),
    [usuario, cargando, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
