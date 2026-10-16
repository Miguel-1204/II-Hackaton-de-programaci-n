import { supabase } from "../lib/supabase";

const DOMINIO = import.meta.env.VITE_AUTH_DOMAIN ?? "cacao.local";
const aCorreo = (username) => `${username.trim().toLowerCase()}@${DOMINIO}`;

export async function obtenerPerfil(userId) {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, username, rol")
    .eq("id", userId)
    .single();
  if (error)
    throw new Error("No se pudo cargar tu perfil. Contacta al administrador.");
  return data;
}

export async function iniciarSesion(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: aCorreo(username),
    password,
  });

  if (error) {
    if (error.name === "AuthRetryableFetchError") {
      throw new Error(
        "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.",
      );
    }
    throw new Error("Usuario o contraseña incorrectos.");
  }
  return obtenerPerfil(data.user.id);
}

export const cerrarSesion = () => supabase.auth.signOut();
