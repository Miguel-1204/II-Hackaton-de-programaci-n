const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PASSWORD_LENGTH = 1024

function validateLoginBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Se requiere correo y contraseña' }
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = body.password

  if (
    email.length === 0 ||
    email.length > 320 ||
    !EMAIL_PATTERN.test(email) ||
    typeof password !== 'string' ||
    password.length === 0 ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return { error: 'Correo o contraseña con formato inválido' }
  }

  return { value: { email, password } }
}

module.exports = { validateLoginBody }
