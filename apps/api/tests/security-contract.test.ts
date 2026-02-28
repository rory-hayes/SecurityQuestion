import assert from 'node:assert/strict'
import test from 'node:test'
import { buildServer } from '../src/server'

test('GET /v1/public/pricing returns pricing data', async () => {
  const app = await buildServer()
  const res = await app.inject({ method: 'GET', url: '/v1/public/pricing' })

  assert.equal(res.statusCode, 200)
  const body = res.json()
  assert.ok(Array.isArray(body.data))
  assert.ok(body.data.length > 0)

  await app.close()
})

test('workspace mismatch blocks scoped document upload', async () => {
  const app = await buildServer()
  const res = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/ws-123/documents',
    headers: {
      'x-workspace-id': 'ws-999',
      'x-roles': 'analyst'
    },
    payload: {
      docType: 'policy',
      frameworkTags: ['soc2'],
      owner: 'Security Lead'
    }
  })

  assert.equal(res.statusCode, 403)
  assert.match(res.body, /Workspace mismatch/)

  await app.close()
})

test('cross-workspace evidence attach requires explicit confirmation', async () => {
  const app = await buildServer()
  const res = await app.inject({
    method: 'POST',
    url: '/v1/questions/q-1/evidence/attach',
    headers: {
      'x-roles': 'analyst'
    },
    payload: {
      questionWorkspaceId: 'ws-a',
      snippetWorkspaceId: 'ws-b',
      snippetId: 'snip-1',
      explicitConfirmation: false
    }
  })

  assert.equal(res.statusCode, 409)
  assert.match(res.body, /requires explicit confirmation/)

  await app.close()
})
