const { eq } = require('drizzle-orm')
const { roles, usuarioRoles, usuarios } = require('../db/schema')

function createAuthModel(db) {
  if (!db) {
    throw new Error('La base de datos es necesaria para el modelo de autenticación')
  }

  async function findUser(where) {
    const rows = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        correo: usuarios.correo,
        passwordHash: usuarios.passwordHash,
        activo: usuarios.activo,
        rol: roles.nombre,
      })
      .from(usuarios)
      .leftJoin(usuarioRoles, eq(usuarioRoles.usuarioId, usuarios.id))
      .leftJoin(roles, eq(roles.id, usuarioRoles.rolId))
      .where(where)

    if (rows.length === 0) {
      return null
    }

    const { passwordHash, ...user } = rows[0]
    return {
      ...user,
      passwordHash,
      roles: [...new Set(rows.map((row) => row.rol).filter(Boolean))],
    }
  }

  return {
    findByEmail(email) {
      return findUser(eq(usuarios.correo, email))
    },
    findById(id) {
      return findUser(eq(usuarios.id, id))
    },
  }
}

module.exports = { createAuthModel }
