// Modo demo: permite ver la interfaz sin Supabase.
// IMPORTANTE: debe quedar en false (o sin definir) en la versión de entrega.
export const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === "true";

export const USUARIOS_DEMO = [
  { id: "demo-op-1", username: "operador1", password: "operador123", rol: "operador" },
  { id: "demo-ad-1", username: "admin1", password: "admin123", rol: "administrador" },
];

// Datos de ejemplo basados en los lotes del caso
export const INVENTARIO_DEMO = [
  { id: 1, codigo: "CAC001", origen: "Rivera", recibido: 100, consumido: 100, disponible: 0, estado: "pendiente" },
  { id: 2, codigo: "CAC002", origen: "Campoalegre", recibido: 150, consumido: 0, disponible: 150, estado: "liberado" },
  { id: 3, codigo: "CAC003", origen: "Algeciras", recibido: 80, consumido: 30, disponible: 50, estado: "pendiente" },
];

export const MERMAS_DEMO = [
  { id: 1, codigo: "CAC001", etapa: "Secado y selección", fecha: "2026-10-15", merma_pct: 20, alerta: true },
  { id: 2, codigo: "CAC003", etapa: "Limpieza", fecha: "2026-10-15", merma_pct: 10, alerta: false },
];