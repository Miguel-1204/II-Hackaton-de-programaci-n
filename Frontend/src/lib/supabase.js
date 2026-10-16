import { createClient } from "@supabase/supabase-js";
import { MODO_DEMO } from "./demo";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!MODO_DEMO && (!url || !anonKey)) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env");
}

export const supabase = MODO_DEMO ? null : createClient(url, anonKey);
