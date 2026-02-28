import type { FastifyReply, FastifyRequest } from 'fastify'

export async function requireWorkspaceScope(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.params && typeof request.params === 'object' ? (request.params as { id?: string }).id : null

  if (!workspaceId) {
    return reply.code(400).send({ message: 'Missing workspace id.' })
  }

  if (request.auth.workspaceId && request.auth.workspaceId !== workspaceId) {
    return reply.code(403).send({ message: 'Workspace mismatch.' })
  }
}
