import { auth } from '../../auth.js'
import { nodeHeaders } from './http.js'

export async function requireStaffSession(req) {
  const session = await auth.api.getSession({
    headers: nodeHeaders(req),
  })

  if (!session?.user) {
    const error = new Error('Necesitas iniciar sesion.')
    error.statusCode = 401
    throw error
  }

  return session
}
