import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  cerrarSesion,
  haySesion,
  iniciarSesion,
  obtenerPerfil,
} from "../services/authService";
import { clearToken } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null); // { id, nombre, correo, rol, roles }
  const [cargando, setCargando] = useState(true);

  // Restaura la sesión al recargar la página
  useEffect(() => {
    const onUnauthorized = () => setUsuario(null);
    window.addEventListener("kaotrace:unauthorized", onUnauthorized);
    if (!haySesion()) {
      setCargando(false);
      return () => window.removeEventListener("kaotrace:unauthorized", onUnauthorized);
    }

    let activo = true;
    obtenerPerfil().then((perfil) => {
      if (activo) setUsuario(perfil);
    }).catch(() => {
      clearToken();
      if (activo) setUsuario(null);
    }).finally(() => {
      if (activo) setCargando(false);
    });
    return () => {
      activo = false;
      window.removeEventListener("kaotrace:unauthorized", onUnauthorized);
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
    [usuario, cargando, login, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
