const { runSeedCli } = require('./seed-utils')
const { roles } = require('../../src/db/schema')

runSeedCli('roles', async (tx) => {
  await tx
    .insert(roles)
    .values([
      {
        nombre: 'ADMINISTRADOR',
        descripcion: 'Administra usuarios y operaciones del sistema.',
      },
      {
        nombre: 'OPERADOR',
        descripcion: 'Registra y consulta operaciones del sistema.',
      },
    ])
    .onConflictDoNothing({ target: roles.nombre })
})
