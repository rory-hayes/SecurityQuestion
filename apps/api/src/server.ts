import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import authPlugin from './plugins/auth'
import { authRoutes } from './routes/auth'
import { brandingRoutes } from './routes/branding'
import { documentRoutes } from './routes/documents'
import { publicRoutes } from './routes/public'
import { questionnaireRoutes } from './routes/questionnaires'
import { templateRoutes } from './routes/templates'
import { workspaceRoutes } from './routes/workspaces'

export async function buildServer() {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: true,
    credentials: true
  })
  await app.register(sensible)
  await app.register(authPlugin)

  app.get('/health', async () => ({ status: 'ok', service: 'api' }))

  await app.register(authRoutes)
  await app.register(publicRoutes)
  await app.register(brandingRoutes)
  await app.register(workspaceRoutes)
  await app.register(documentRoutes)
  await app.register(templateRoutes)
  await app.register(questionnaireRoutes)

  return app
}

async function start() {
  const app = await buildServer()
  const port = Number(process.env.PORT ?? '4000')

  await app.listen({ port, host: '0.0.0.0' })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
