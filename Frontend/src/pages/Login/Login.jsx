import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./Login.css";

const rutaPorRol = (rol) => (rol === "administrador" ? "/admin" : "/");

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: "", password: "" });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Si ya hay sesión, no tiene sentido mostrar el login
  if (usuario) return <Navigate to={rutaPorRol(usuario.rol)} replace />;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: "" }));
    if (errorGeneral) setErrorGeneral("");
  };

  const validar = () => {
    const nuevos = {};
    if (!form.username.trim())
      nuevos.username = "Escribe tu nombre de usuario.";
    if (!form.password) nuevos.password = "Escribe tu contraseña.";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando || !validar()) return;

    setCargando(true);
    setErrorGeneral("");
    try {
      const perfil = await login(form.username, form.password);
      const destino = location.state?.from?.pathname ?? rutaPorRol(perfil.rol);
      navigate(destino, { replace: true });
    } catch (err) {
      setForm((prev) => ({ ...prev, password: "" }));
      setErrorGeneral(err.message);
    } finally {
      setCargando(false);
    }
  };

  const claseInput = (campo) =>
    `login-input w-full rounded-lg border bg-white px-4 py-3 text-cacao-900 placeholder:text-cacao-500/60
     focus:outline-none focus:ring-2 focus:ring-mazorca-500 focus:border-mazorca-500
     ${errores[campo] ? "border-peligro-600" : "border-cacao-200"}`;

  return (
    <main className="login-fondo min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-cacao-50/80 p-8 shadow-xl backdrop-blur-md border border-white/30">
        <p className="font-display text-lg font-semibold text-cacao-700">
          Cacao del Huila
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-cacao-800">
          Iniciar sesión
        </h1>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {errorGeneral && (
            <div
              role="alert"
              className="rounded-lg border border-peligro-600 bg-peligro-600/10 px-4 py-3 text-sm text-peligro-600"
            >
              {errorGeneral}
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-cacao-800"
            >
              Nombre de usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={form.username}
              onChange={handleChange}
              aria-invalid={!!errores.username}
              aria-describedby={errores.username ? "username-error" : undefined}
              className={claseInput("username")}
              placeholder="operador1"
            />
            {errores.username && (
              <p
                id="username-error"
                className="mt-1.5 text-sm text-peligro-600"
              >
                {errores.username}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-cacao-800"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={verClave ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                aria-invalid={!!errores.password}
                aria-describedby={
                  errores.password ? "password-error" : undefined
                }
                className={`${claseInput("password")} pr-24`}
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                aria-pressed={verClave}
                className="absolute inset-y-0 right-2 my-1.5 rounded-md px-3 text-sm font-medium text-cacao-700
                           hover:bg-cacao-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-mazorca-500"
              >
                {verClave ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {errores.password && (
              <p
                id="password-error"
                className="mt-1.5 text-sm text-peligro-600"
              >
                {errores.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="login-btn w-full rounded-lg bg-cacao-800 px-4 py-3 font-semibold text-cacao-50
                       hover:bg-cacao-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-mazorca-500
                       focus-visible:ring-offset-2 focus-visible:ring-offset-cacao-50
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? "Verificando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
