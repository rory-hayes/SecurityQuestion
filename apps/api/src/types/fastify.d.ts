import type { Role } from '../lib/auth-model'

declare module 'fastify' {
  interface FastifyRequest {
    auth: {
      userId: string
      orgId: string
      roles: Role[]
      workspaceId: string | null
    }
  }
}
