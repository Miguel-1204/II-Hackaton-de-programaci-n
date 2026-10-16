const { validateLoginBody } = require('../validators/auth.validator')

function createAuthController(authService) {
  return {
    async login(request, response, next) {
      const validation = validateLoginBody(request.body)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const result = await authService.login(
          validation.value.email,
          validation.value.password,
        )
        if (!result) {
          return response.status(401).json({ error: 'Credenciales inválidas' })
        }

        return response.status(200).json(result)
      } catch (error) {
        return next(error)
      }
    },

    me(request, response) {
      return response.status(200).json({ user: request.user })
    },
  }
}

module.exports = { createAuthController }
