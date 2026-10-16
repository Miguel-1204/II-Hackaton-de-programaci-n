const { and, asc, count, eq, ilike, or } = require('drizzle-orm')
const { productores } = require('../db/schema')

function createProductoresModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para productores')
  }

  function buildFilters(filters) {
    const conditions = []
    if (!filters.includeInactive) {
      conditions.push(eq(productores.activo, true))
    }
    if (filters.municipio) {
      conditions.push(ilike(productores.municipio, filters.municipio))
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`
      conditions.push(
        or(
          ilike(productores.nombre, pattern),
          ilike(productores.identificacion, pattern),
        ),
      )
    }
    return conditions.length ? and(...conditions) : undefined
  }

  return {
    async findById(id) {
      const [producer] = await db
        .select()
        .from(productores)
        .where(eq(productores.id, id))
        .limit(1)
      return producer || null
    },

    async list(filters) {
      const where = buildFilters(filters)
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(productores)
        .where(where)
      const items = await db
        .select()
        .from(productores)
        .where(where)
        .orderBy(asc(productores.nombre), asc(productores.id))
        .limit(filters.limit)
        .offset((filters.page - 1) * filters.limit)

      return { items, page: filters.page, limit: filters.limit, total }
    },

    async create(data) {
      const [producer] = await db
        .insert(productores)
        .values(data)
        .returning()
      return producer
    },

    async update(id, data) {
      const [producer] = await db
        .update(productores)
        .set(data)
        .where(eq(productores.id, id))
        .returning()
      return producer || null
    },

    async deactivate(id) {
      const [producer] = await db
        .update(productores)
        .set({ activo: false })
        .where(eq(productores.id, id))
        .returning()
      return producer || null
    },
  }
}

module.exports = { createProductoresModel }
