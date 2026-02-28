import assert from 'node:assert/strict'
import test from 'node:test'
import { buildServer } from '../src/server'

process.env.DISABLE_QUEUES = 'true'

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

test('parse + mapping confirm normalises questions deterministically', async () => {
  const app = await buildServer()

  const importRes = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/ws-parse/questionnaires/import',
    headers: {
      'x-workspace-id': 'ws-parse',
      'x-roles': 'analyst'
    },
    payload: {
      sourceFilename: 'sample.csv',
      sourceType: 'csv',
      extractionMode: 'hybrid',
      rows: [
        ['Question', 'Answer', 'Evidence'],
        ['Do you encrypt data at rest?', '', 'SOC2-3.1'],
        ['Is MFA required for privileged access?', '', 'Access Policy']
      ]
    }
  })

  assert.equal(importRes.statusCode, 202)
  const questionnaireId = importRes.json().data.questionnaireId as string
  assert.ok(questionnaireId)

  const parseRes = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/ws-parse/questionnaires/parse',
    headers: {
      'x-workspace-id': 'ws-parse',
      'x-roles': 'analyst'
    },
    payload: {
      questionnaireId
    }
  })

  assert.equal(parseRes.statusCode, 200)
  const parseBody = parseRes.json().data
  assert.ok(parseBody.suggestion.questionColumn)
  assert.ok(parseBody.suggestion.answerColumn)

  const confirmRes = await app.inject({
    method: 'POST',
    url: `/v1/workspaces/ws-parse/questionnaires/${questionnaireId}/mapping/confirm`,
    headers: {
      'x-workspace-id': 'ws-parse',
      'x-roles': 'analyst'
    },
    payload: {
      headerRowIndex: parseBody.suggestion.headerRowIndex,
      questionColumn: parseBody.suggestion.questionColumn,
      answerColumn: parseBody.suggestion.answerColumn,
      evidenceColumn: parseBody.suggestion.evidenceColumn
    }
  })

  assert.equal(confirmRes.statusCode, 201)
  assert.ok(confirmRes.json().data.normalizedCount >= 2)

  const listRes = await app.inject({
    method: 'GET',
    url: `/v1/questionnaires/${questionnaireId}/questions`,
    headers: {
      'x-workspace-id': 'ws-parse',
      'x-roles': 'analyst'
    }
  })

  assert.equal(listRes.statusCode, 200)
  assert.ok(Array.isArray(listRes.json().data))
  assert.ok(listRes.json().data.length >= 2)

  await app.close()
})

test('low-confidence export requires explicit acknowledgement', async () => {
  const app = await buildServer()

  const createDocRes = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/ws-low/documents',
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst'
    },
    payload: {
      name: 'Stale Policy.txt',
      docType: 'Policy',
      owner: 'Security Lead',
      lastUpdated: '2020-01-01',
      expiryDate: '2021-01-01',
      text: 'Encryption controls are implemented with TLS and AES.'
    }
  })

  assert.equal(createDocRes.statusCode, 201)
  const documentId = createDocRes.json().data.documentId as string

  const processRes = await app.inject({
    method: 'POST',
    url: `/v1/workspaces/ws-low/documents/${documentId}/process`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst'
    },
    payload: {}
  })

  assert.equal(processRes.statusCode, 200)
  assert.equal(processRes.json().data.status, 'completed')

  const importRes = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/ws-low/questionnaires/import',
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst'
    },
    payload: {
      sourceFilename: 'low-confidence.csv',
      sourceType: 'csv',
      extractionMode: 'hybrid',
      rows: [['Question', 'Answer'], ['What is your anti-gravity security policy?', '']]
    }
  })

  assert.equal(importRes.statusCode, 202)
  const questionnaireId = importRes.json().data.questionnaireId as string

  const parseRes = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/ws-low/questionnaires/parse',
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst'
    },
    payload: {
      questionnaireId
    }
  })

  assert.equal(parseRes.statusCode, 200)
  const suggestion = parseRes.json().data.suggestion

  const confirmRes = await app.inject({
    method: 'POST',
    url: `/v1/workspaces/ws-low/questionnaires/${questionnaireId}/mapping/confirm`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst'
    },
    payload: {
      headerRowIndex: suggestion.headerRowIndex,
      questionColumn: suggestion.questionColumn,
      answerColumn: suggestion.answerColumn
    }
  })

  assert.equal(confirmRes.statusCode, 201)

  const draftRes = await app.inject({
    method: 'POST',
    url: `/v1/questionnaires/${questionnaireId}/draft`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst'
    },
    payload: {
      mode: 'batch',
      modelRouteMode: 'balanced'
    }
  })

  assert.equal(draftRes.statusCode, 202)

  const listQuestionsRes = await app.inject({
    method: 'GET',
    url: `/v1/questionnaires/${questionnaireId}/questions`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst,client_approver'
    }
  })

  assert.equal(listQuestionsRes.statusCode, 200)
  const questionId = listQuestionsRes.json().data[0].id as string
  assert.ok(questionId)

  const detailRes = await app.inject({
    method: 'GET',
    url: `/v1/questions/${questionId}/draft-detail`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst,client_approver'
    }
  })

  assert.equal(detailRes.statusCode, 200)
  assert.equal(detailRes.json().data.confidenceBand, 'low')

  const approveWithoutAckRes = await app.inject({
    method: 'POST',
    url: `/v1/questions/${questionId}/approve`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'client_approver'
    },
    payload: {
      approvedBy: 'approver@firm.example',
      acknowledgeLowConfidence: false
    }
  })

  assert.equal(approveWithoutAckRes.statusCode, 200)

  const exportBlockedRes = await app.inject({
    method: 'POST',
    url: `/v1/questionnaires/${questionnaireId}/export`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst'
    }
  })

  assert.equal(exportBlockedRes.statusCode, 409)
  assert.match(exportBlockedRes.body, /Low-confidence answer missing explicit acknowledgment/)

  const approveWithAckRes = await app.inject({
    method: 'POST',
    url: `/v1/questions/${questionId}/approve`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'client_approver'
    },
    payload: {
      approvedBy: 'approver@firm.example',
      acknowledgeLowConfidence: true
    }
  })

  assert.equal(approveWithAckRes.statusCode, 200)

  const exportOkRes = await app.inject({
    method: 'POST',
    url: `/v1/questionnaires/${questionnaireId}/export`,
    headers: {
      'x-workspace-id': 'ws-low',
      'x-roles': 'analyst'
    }
  })

  assert.equal(exportOkRes.statusCode, 202)

  await app.close()
})
