/**
 * @fileoverview Configuración del cliente Supabase y utilidades de conexión.
 * Expone la inicialización del SDK de Supabase (@supabase/supabase-js) cuando
 * las variables de entorno están presentes, permitiendo interactuar con servicios
 * de Supabase (autenticación, storage o realtime) de forma complementaria a Drizzle ORM.
 */

const { createClient } = require('@supabase/supabase-js')

/**
 * Crea e inicializa una instancia del cliente de Supabase si las credenciales
 * requeridas existen en las variables de entorno.
 *
 * @param {Object} [options] - Parámetros de inicialización opcionales.
 * @param {string} [options.supabaseUrl] - URL del proyecto Supabase.
 * @param {string} [options.supabaseKey] - API key (anon o service_role) de Supabase.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null} Instancia del cliente o null si no está configurado.
 */
function createSupabaseClient(options = {}) {
  const supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL
  const supabaseKey =
    options.supabaseKey ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

module.exports = {
  createSupabaseClient,
}
