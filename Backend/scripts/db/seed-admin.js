const { eq } = require('drizzle-orm')
const { runSeedCli } = require('./seed-utils')
const { hashPassword } = require('./password')
const { roles, usuarioRoles, usuarios } = require('../../src/db/schema')

const name = process.env.ADMIN_NAME?.trim()
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD

if (!name || !email || !password) {
  throw new Error(
    'Configura ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD en Backend/.env antes de ejecutar este seed',
  )
}

runSeedCli('admin', async (tx) => {
  const [adminRole] = await tx
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.nombre, 'ADMINISTRADOR'))
    .limit(1)

  if (!adminRole) {
    throw new Error('Primero ejecuta npm run seed:roles')
  }

  let [admin] = await tx
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.correo, email))
    .limit(1)

  if (!admin) {
    const passwordHash = await hashPassword(password)
    ;[admin] = await tx
      .insert(usuarios)
      .values({ nombre: name, correo: email, passwordHash })
      .onConflictDoNothing({ target: usuarios.correo })
      .returning({ id: usuarios.id })

    if (!admin) {
      ;[admin] = await tx
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.correo, email))
        .limit(1)
    }
  }

  if (!admin) {
    throw new Error('No se encontró ni se pudo crear el administrador')
  }

  await tx
    .insert(usuarioRoles)
    .values({ usuarioId: admin.id, rolId: adminRole.id })
    .onConflictDoNothing()
})
