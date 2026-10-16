import { supabase } from "../lib/supabase";
import { MODO_DEMO, INVENTARIO_DEMO, MERMAS_DEMO } from "../lib/demo";

export async function obtenerResumenOperador() {
  if (MODO_DEMO) {
    return { inventario: INVENTARIO_DEMO, mermas: MERMAS_DEMO };
  }

  const [inventario, mermas] = await Promise.all([
    supabase.from("v_inventario_lotes").select("*").order("codigo"),
    supabase.from("v_mermas").select("*").order("fecha", { ascending: false }),
  ]);

  if (inventario.error || mermas.error) {
    throw new Error("No se pudo cargar el resumen. Revisa tu conexión e intenta de nuevo.");
  }
  return { inventario: inventario.data, mermas: mermas.data };
}