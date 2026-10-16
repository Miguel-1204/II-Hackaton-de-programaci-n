import { supabase } from "../lib/supabase";
import { MODO_DEMO, USUARIOS_DEMO } from "../lib/demo";

const CLAVE_DEMO = "demo_usuario";

// Supabase Auth exige un correo. El usuario escribe solo su "nombre de usuario"
// y aquí se convierte: operador1 -> operador1@cacao.local
// Ese mismo correo debe existir en usuarios.correo.
const DOMINIO = import.meta.env.VITE_AUTH_DOMAIN ?? "cacao.local";
const aCorreo = (username) => `${username.trim().toLowerCase()}@${DOMINIO}`;

// Un usuario puede tener varios roles (usuario_roles). Se usa uno principal.
const rolPrincipal = (roles) => (roles.includes("administrador") ? "administrador" : roles[0]);

export function leerSesionDemo() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_DEMO));
  } catch {
    return null;
  }
}

// Lee el perfil desde usuarios + usuario_roles + roles
export async function obtenerPerfil(correo) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, correo, activo, usuario_roles(roles(nombre))")
    .eq("correo", correo.toLowerCase())
    .single();

  if (error || !data) {
    throw new Error("No se pudo cargar tu perfil. Contacta al administrador.");
  }
  if (!data.activo) {
    throw new Error("Tu usuario está desactivado. Contacta al administrador.");
  }

  const roles = data.usuario_roles.map((ur) => ur.roles.nombre);
  if (roles.length === 0) {
    throw new Error("Tu usuario no tiene un rol asignado. Contacta al administrador.");
  }

  return {
    id: data.id,
    nombre: data.nombre,
    correo: data.correo,
    rol: rolPrincipal(roles),
    roles,
  };
}

export async function iniciarSesion(username, password) {
  if (MODO_DEMO) {
    const u = USUARIOS_DEMO.find(
      (x) => x.username === username.trim().toLowerCase() && x.password === password
    );
    if (!u) throw new Error("Usuario o contraseña incorrectos.");
    const perfil = {
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: rolPrincipal(u.roles),
      roles: u.roles,
    };
    sessionStorage.setItem(CLAVE_DEMO, JSON.stringify(perfil));
    return perfil;
  }

  const correo = aCorreo(username);
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password });

  if (error) {
    // No se revela cuál dato falló (HU01)
    if (error.name === "AuthRetryableFetchError") {
      throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
    }
    throw new Error("Usuario o contraseña incorrectos.");
  }

  try {
    return await obtenerPerfil(correo);
  } catch (err) {
    // Si el perfil falla, no se deja una sesión a medias
    await supabase.auth.signOut();
    throw err;
  }
}

export async function cerrarSesion() {
  if (MODO_DEMO) {
    sessionStorage.removeItem(CLAVE_DEMO);
    return;
  }
  await supabase.auth.signOut();
}