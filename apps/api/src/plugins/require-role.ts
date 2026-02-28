import type { FastifyReply, FastifyRequest } from 'fastify'
import { hasRole, type Role } from '../lib/auth-model'

export function requireRole(allowed: Role[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
    if (!hasRole(request.auth.roles, allowed)) {
      return reply.code(403).send({ message: 'Insufficient role.' })
    }
  }
}
