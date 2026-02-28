import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import type { Role } from '../lib/auth-model'

function parseRoles(input: string | undefined): Role[] {
  if (!input) return ['analyst']
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((role): role is Role => ['org_admin', 'analyst', 'client_approver', 'viewer'].includes(role))
}

export default fp(async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('auth', null as any)

  app.addHook('preHandler', async (request) => {
    request.auth = {
      userId: String(request.headers['x-user-id'] ?? 'user-1'),
      orgId: String(request.headers['x-org-id'] ?? 'org-default'),
      roles: parseRoles(request.headers['x-roles'] as string | undefined),
      workspaceId: request.headers['x-workspace-id'] ? String(request.headers['x-workspace-id']) : null
    }
  })
})
