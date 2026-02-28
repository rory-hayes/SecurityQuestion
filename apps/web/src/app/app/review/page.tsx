'use client'

import { Badge, Button, Heading, Subheading, Text } from '@sqc/ui-catalyst'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { ensureSeeded, listReviewItems, onStoreUpdate, updateReviewItem } from '@/lib/app-store'

export default function ReviewQueuePage() {
  const [drafts, setDrafts] = useState<ReturnType<typeof listReviewItems>>([])
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded()
    const refresh = () => setDrafts(listReviewItems())
    refresh()
    return onStoreUpdate(refresh)
  }, [])

  async function setQuestionState(questionId: string, nextState: 'in_review' | 'needs_client_input' | 'approved') {
    const response = await apiRequest<{ changedAt: string }>(`/v1/questions/${questionId}/state`, {
      method: 'PATCH',
      body: { state: nextState }
    })
    if (!response.ok) {
      setStatus(response.error ?? 'Failed to update question state.')
      return false
    }
    return true
  }

  async function approveQuestion(questionId: string) {
    const stateOk = await setQuestionState(questionId, 'approved')
    if (!stateOk) return

    const approval = await apiRequest<{ approvedAt: string }>(`/v1/questions/${questionId}/approve`, {
      method: 'POST',
      roles: 'org_admin,client_approver',
      body: {
        approvedBy: 'client.owner@acmehealth.example',
        comment: 'Approved after citation review.'
      }
    })

    if (!approval.ok) {
      setStatus(approval.error ?? 'Approval failed.')
      return
    }

    updateReviewItem(questionId, { state: 'approved' })
    setStatus(`Question ${questionId} approved at ${new Date(approval.data?.approvedAt ?? new Date().toISOString()).toLocaleString()}.`)
  }

  async function assignClientInput(questionId: string) {
    const stateOk = await setQuestionState(questionId, 'needs_client_input')
    if (!stateOk) return
    updateReviewItem(questionId, { state: 'needs_client_input' })
    setStatus(`Question ${questionId} moved to needs client input.`)
  }

  async function acknowledgeLowConfidence(questionId: string) {
    const stateOk = await setQuestionState(questionId, 'in_review')
    if (!stateOk) return
    updateReviewItem(questionId, { state: 'in_review' })
    setStatus(`Low-confidence acknowledgment recorded for ${questionId}.`)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading>Draft Review Queue</Heading>
          <Text className="mt-2">Citation-first drafting with confidence gates before export.</Text>
        </div>
        <div className="flex gap-2">
          <Button outline href="/app/questionnaires">
            Back to ingestion
          </Button>
          <Button color="blue" href="/app/questionnaires">
            Run next batch
          </Button>
        </div>
      </header>

      {status ? (
        <div className="rounded-lg border border-zinc-950/10 bg-white px-4 py-3 text-sm text-zinc-700">{status}</div>
      ) : null}

      {drafts.map((draft) => (
        <article key={draft.id} className="rounded-xl border border-zinc-950/10 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Subheading>{draft.id}</Subheading>
            <div className="flex items-center gap-2">
              <Badge color={draft.confidence === 'Low' ? 'red' : draft.confidence === 'Medium' ? 'amber' : 'green'}>
                {draft.confidence} confidence
              </Badge>
              <Badge color="zinc">{draft.state.replaceAll('_', ' ')}</Badge>
            </div>
          </div>
          <Text className="mt-3 text-zinc-900">{draft.question}</Text>
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">{draft.answer}</div>
          <div className="mt-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Source citations</p>
            {draft.citations.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {draft.citations.map((citation) => (
                  <li key={citation} className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700">
                    {citation}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                No evidence found. Export is blocked until reviewer acknowledgment and client input.
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button color="blue" onClick={() => approveQuestion(draft.id)}>
              Approve draft
            </Button>
            <Button outline onClick={() => assignClientInput(draft.id)}>
              Assign to client owner
            </Button>
            {draft.confidence === 'Low' ? (
              <Button outline onClick={() => acknowledgeLowConfidence(draft.id)}>
                Acknowledge low confidence
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
