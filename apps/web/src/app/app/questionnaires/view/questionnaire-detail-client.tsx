'use client'

import { Badge, Button, Heading, Subheading, Text } from '@sqc/ui-catalyst'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { getQuestionnaireById, updateQuestionnaire } from '@/lib/app-store'

function statusBadge(status: string) {
  if (/approved|exported/i.test(status)) return <Badge color="green">{status}</Badge>
  if (/needs/i.test(status)) return <Badge color="amber">{status}</Badge>
  if (/queued|draft/i.test(status)) return <Badge color="blue">{status}</Badge>
  return <Badge color="zinc">{status}</Badge>
}

export default function QuestionnaireDetailClient() {
  const params = useSearchParams()
  const questionnaireId = params.get('questionnaireId') ?? ''
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [record, setRecord] = useState<ReturnType<typeof getQuestionnaireById>>(null)
  const [pendingAction, setPendingAction] = useState<'draft' | 'progress' | 'export' | null>(null)

  useEffect(() => {
    if (!questionnaireId) return
    setRecord(getQuestionnaireById(questionnaireId))
  }, [questionnaireId])

  const ready = useMemo(() => Boolean(questionnaireId && record), [questionnaireId, record])

  async function refreshProgress() {
    if (!questionnaireId || !record) return
    setPendingAction('progress')
    const response = await apiRequest<{ percent: number; status: string }>(`/v1/questionnaires/${questionnaireId}/progress`, {
      workspaceId: record.workspaceId
    })
    setPendingAction(null)
    if (!response.ok || !response.data) {
      setStatusMessage('No live progress available yet. This batch may still be in seeded/demo state.')
      return
    }

    updateQuestionnaire(questionnaireId, { progress: response.data.percent, status: response.data.status })
    setRecord(getQuestionnaireById(questionnaireId))
    setStatusMessage(`Progress refreshed: ${response.data.percent}% (${response.data.status}).`)
  }

  async function startDrafting() {
    if (!questionnaireId || !record) return
    setPendingAction('draft')
    const response = await apiRequest<{ status: string }>(`/v1/questionnaires/${questionnaireId}/draft`, {
      method: 'POST',
      workspaceId: record.workspaceId,
      body: {
        mode: 'batch',
        modelRouteMode: 'balanced'
      }
    })
    setPendingAction(null)
    if (!response.ok) {
      setStatusMessage(response.error ?? 'Drafting request failed. Check mapping/normalisation and retry.')
      return
    }

    updateQuestionnaire(questionnaireId, { status: 'Drafting Started', progress: Math.max(record.progress, 25) })
    setRecord(getQuestionnaireById(questionnaireId))
    setStatusMessage('Drafting started. Refresh progress to fetch latest queue state.')
  }

  async function queueExport() {
    if (!questionnaireId || !record) return
    if (!window.confirm('Queue export now? This will enforce confidence, citation, and approval gates.')) return
    setPendingAction('export')
    const response = await apiRequest<{ status: string }>(`/v1/questionnaires/${questionnaireId}/export`, {
      method: 'POST',
      workspaceId: record.workspaceId
    })
    setPendingAction(null)
    if (!response.ok) {
      const blockers = Array.isArray(response.payload?.blockers)
        ? response.payload.blockers
            .map((item) => {
              if (!item || typeof item !== 'object') return null
              const questionId = typeof item.questionId === 'string' ? item.questionId : 'Unknown question'
              const reason = typeof item.reason === 'string' ? item.reason : 'Unspecified blocker'
              return `${questionId}: ${reason}`
            })
            .filter(Boolean)
            .join(' | ')
        : null
      setStatusMessage(
        blockers
          ? `Export blocked: ${blockers}`
          : response.error ?? 'Export request failed. Resolve approvals/citations and retry.'
      )
      return
    }

    updateQuestionnaire(questionnaireId, { status: 'Export Queued', progress: Math.max(record.progress, 80) })
    setRecord(getQuestionnaireById(questionnaireId))
    setStatusMessage('Export queued. Evidence pack will be generated after approvals.')
  }

  if (!questionnaireId || !ready || !record) {
    return (
      <div className="space-y-4">
        <Heading>Questionnaire detail</Heading>
        <Text>Choose a questionnaire batch from Dashboard or Questionnaire Ingestion to view individual progress.</Text>
        <Button href="/app/questionnaires" color="blue">
          Back to questionnaires
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading>Questionnaire {record.id}</Heading>
          <Text className="mt-2">{record.fileName}</Text>
        </div>
        {statusBadge(record.status)}
      </header>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Batch overview</Subheading>
        <dl className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
          <div>
            <dt className="font-medium text-zinc-900">Question column</dt>
            <dd>{record.questionColumn}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Answer column</dt>
            <dd>{record.answerColumn}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Progress</dt>
            <dd>{record.progress}%</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Rows needing review</dt>
            <dd>{record.needsReviewRows}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Total normalized questions</dt>
            <dd>{record.totalQuestions}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Created</dt>
            <dd>{new Date(record.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Actions</Subheading>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button color="blue" onClick={startDrafting} disabled={pendingAction !== null}>
            {pendingAction === 'draft' ? 'Starting draft...' : 'Start drafting'}
          </Button>
          <Button outline onClick={refreshProgress} disabled={pendingAction !== null}>
            {pendingAction === 'progress' ? 'Refreshing...' : 'Refresh progress'}
          </Button>
          <Button outline onClick={queueExport} disabled={pendingAction !== null}>
            {pendingAction === 'export' ? 'Queueing export...' : 'Queue export'}
          </Button>
          <Button href={`/app/review?questionnaireId=${encodeURIComponent(questionnaireId)}`} plain>
            Open review queue
          </Button>
        </div>
        {statusMessage ? <Text className="mt-3 text-zinc-700">{statusMessage}</Text> : null}
      </section>
    </div>
  )
}
