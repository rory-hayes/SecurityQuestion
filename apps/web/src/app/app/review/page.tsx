'use client'

import { Badge, Button, Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle, Heading, Subheading, Text } from '@sqc/ui-catalyst'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { ensureSeeded, getActiveWorkspace, listReviewItems, onStoreUpdate, updateReviewItem } from '@/lib/app-store'

type DraftState = 'drafted' | 'in_review' | 'needs_client_input' | 'approved' | 'exported'
type ConfidenceBand = 'High' | 'Medium' | 'Low'

type CitationDetail = {
  label: string
  snippetId?: string
  documentId?: string
  chunkId?: string
  excerpt?: string
  sentenceIndex?: number
  relevanceScore?: number
  charStart?: number
  charEnd?: number
}

type QueueDraft = {
  id: string
  question: string
  answer: string
  confidence: ConfidenceBand
  citations: string[]
  citationDetails: CitationDetail[]
  state: DraftState
  source: 'api' | 'seed'
}

type ApiQuestion = {
  id: string
  prompt: string
  state?: DraftState
  confidenceBand?: 'high' | 'medium' | 'low' | null
}

type ApiDraftDetail = {
  questionId: string
  text: string
  confidenceBand: 'high' | 'medium' | 'low'
  citations: Array<{
    snippetId?: string
    documentId?: string
    chunkId?: string
    excerpt?: string
    sentenceIndex?: number
    relevanceScore?: number
    charStart?: number
    charEnd?: number
  }>
}

const EMPTY_CITATION = 'No evidence found'

function toBand(input?: string | null): ConfidenceBand {
  if (input === 'high' || input === 'High') return 'High'
  if (input === 'medium' || input === 'Medium') return 'Medium'
  return 'Low'
}

export default function ReviewQueuePage() {
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null)
  const [queryResolved, setQueryResolved] = useState(false)
  const [drafts, setDrafts] = useState<QueueDraft[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [apiBacked, setApiBacked] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<{
    questionId: string
    question: string
    citation: CitationDetail
  } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setQuestionnaireId(params.get('questionnaireId'))
    setQueryResolved(true)
  }, [])

  useEffect(() => {
    if (!queryResolved) return
    ensureSeeded()
    let active = true

    async function load() {
      if (!questionnaireId) {
        setApiBacked(false)
        const refresh = () =>
          setDrafts(
            listReviewItems().map((item) => ({
              ...item,
              citationDetails: item.citations.map((citation) => ({ label: citation })),
              source: 'seed' as const
            }))
          )
        refresh()
        return onStoreUpdate(refresh)
      }

      const workspaceId = getActiveWorkspace()?.id
      const questionsResponse = await apiRequest<ApiQuestion[]>(`/v1/questionnaires/${questionnaireId}/questions`, {
        workspaceId: workspaceId ?? undefined
      })

      if (!active) return () => undefined

      if (!questionsResponse.ok || !questionsResponse.data) {
        setApiBacked(false)
        setStatus(
          questionsResponse.error ??
            'Unable to load live review queue for this batch. Showing seeded queue while API data is unavailable.'
        )
        setDrafts(
          listReviewItems().map((item) => ({
            ...item,
            citationDetails: item.citations.map((citation) => ({ label: citation })),
            source: 'seed' as const
          }))
        )
        return () => undefined
      }

      const detailResponses = await Promise.all(
        questionsResponse.data.map(async (question) => {
          const detail = await apiRequest<ApiDraftDetail>(`/v1/questions/${question.id}/draft-detail`, {
            workspaceId: workspaceId ?? undefined
          })
          return { question, detail }
        })
      )

      if (!active) return () => undefined

      const nextDrafts: QueueDraft[] = detailResponses.map(({ question, detail }) => {
        const citations = detail.data?.citations ?? []
        const citationDetails = citations.map((citation, index) => ({
          label: citation.snippetId ?? citation.documentId ?? `Citation ${index + 1}`,
          snippetId: citation.snippetId,
          documentId: citation.documentId,
          chunkId: citation.chunkId,
          excerpt: citation.excerpt,
          sentenceIndex: citation.sentenceIndex,
          relevanceScore: citation.relevanceScore,
          charStart: citation.charStart,
          charEnd: citation.charEnd
        }))

        return {
          id: question.id,
          question: question.prompt,
          answer: detail.data?.text ?? 'Draft not generated yet. Start drafting from the questionnaire batch view.',
          confidence: toBand(detail.data?.confidenceBand ?? question.confidenceBand),
          state: question.state ?? 'drafted',
          citations: citationDetails.length ? citationDetails.map((citation) => citation.label) : [],
          citationDetails,
          source: 'api'
        }
      })

      setApiBacked(true)
      setDrafts(nextDrafts)
      setStatus(nextDrafts.length ? null : 'No questions are available in this batch yet.')
      return () => undefined
    }

    const unsubscribePromise = load()
    return () => {
      active = false
      void Promise.resolve(unsubscribePromise).then((unsubscribe) => unsubscribe?.())
    }
  }, [questionnaireId, queryResolved])

  function patchDraft(questionId: string, patch: Partial<QueueDraft>) {
    setDrafts((current) => current.map((draft) => (draft.id === questionId ? { ...draft, ...patch } : draft)))
  }

  async function setQuestionState(questionId: string, nextState: 'in_review' | 'needs_client_input' | 'approved') {
    if (!apiBacked) return true

    const workspaceId = getActiveWorkspace()?.id
    const response = await apiRequest<{ changedAt: string }>(`/v1/questions/${questionId}/state`, {
      method: 'PATCH',
      workspaceId: workspaceId ?? undefined,
      body: { state: nextState }
    })
    if (!response.ok) {
      setStatus(response.error ?? 'Failed to update question state.')
      return false
    }
    return true
  }

  async function approveQuestion(questionId: string) {
    if (!window.confirm('Approve this draft for export workflow?')) return

    const stateOk = await setQuestionState(questionId, 'approved')
    if (!stateOk) return

    let approvalAt = new Date().toISOString()
    if (apiBacked) {
      const workspaceId = getActiveWorkspace()?.id
      const approval = await apiRequest<{ approvedAt: string }>(`/v1/questions/${questionId}/approve`, {
        method: 'POST',
        workspaceId: workspaceId ?? undefined,
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
      approvalAt = approval.data?.approvedAt ?? approvalAt
    }

    patchDraft(questionId, { state: 'approved' })
    if (!apiBacked) {
      updateReviewItem(questionId, { state: 'approved' })
    }
    setStatus(`Question ${questionId} approved at ${new Date(approvalAt).toLocaleString()}.`)
  }

  async function assignClientInput(questionId: string) {
    if (!window.confirm('Move this draft to client input queue?')) return
    const stateOk = await setQuestionState(questionId, 'needs_client_input')
    if (!stateOk) return
    patchDraft(questionId, { state: 'needs_client_input' })
    if (!apiBacked) {
      updateReviewItem(questionId, { state: 'needs_client_input' })
    }
    setStatus(`Question ${questionId} moved to needs client input.`)
  }

  async function acknowledgeLowConfidence(questionId: string) {
    if (!window.confirm('Acknowledge low confidence and keep this draft in review?')) return
    const workspaceId = getActiveWorkspace()?.id
    let stateOk = false
    if (apiBacked) {
      const response = await apiRequest<{ changedAt: string }>(`/v1/questions/${questionId}/state`, {
        method: 'PATCH',
        workspaceId: workspaceId ?? undefined,
        body: { state: 'in_review', note: 'acknowledge_low_confidence' }
      })
      stateOk = response.ok
      if (!response.ok) {
        setStatus(response.error ?? 'Failed to acknowledge low confidence.')
      }
    } else {
      stateOk = await setQuestionState(questionId, 'in_review')
    }
    if (!stateOk) return
    patchDraft(questionId, { state: 'in_review' })
    if (!apiBacked) {
      updateReviewItem(questionId, { state: 'in_review' })
    }
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
      <Text className="text-sm text-zinc-600">
        {questionnaireId
          ? `Showing live queue for batch ${questionnaireId}.`
          : 'Showing seeded queue. Open a questionnaire batch and click "Open review queue" for live API-backed drafts.'}
      </Text>

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
                {draft.citationDetails.map((citation) => (
                  <li key={`${draft.id}-${citation.label}-${citation.snippetId ?? 'seed'}`}>
                    <Button
                      outline
                      onClick={() => setSelectedCitation({ questionId: draft.id, question: draft.question, citation })}
                      className="px-2 py-1 text-xs"
                    >
                      {citation.label}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {EMPTY_CITATION}. Export is blocked until reviewer acknowledgment and client input.
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

      <Dialog open={selectedCitation !== null} onClose={() => setSelectedCitation(null)} size="lg">
        <DialogTitle>Citation provenance</DialogTitle>
        <DialogDescription>
          {selectedCitation
            ? `Question ${selectedCitation.questionId}: review evidence context before approval.`
            : 'Review source evidence details.'}
        </DialogDescription>
        {selectedCitation ? (
          <DialogBody className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{selectedCitation.question}</div>
            <dl className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-zinc-900">Citation</dt>
                <dd>{selectedCitation.citation.label}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-900">Snippet ID</dt>
                <dd>{selectedCitation.citation.snippetId ?? 'Not available in seeded view'}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-900">Document</dt>
                <dd>{selectedCitation.citation.documentId ?? 'Not available in seeded view'}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-900">Sentence index</dt>
                <dd>{selectedCitation.citation.sentenceIndex ?? 0}</dd>
              </div>
            </dl>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
              {selectedCitation.citation.excerpt ?? 'No excerpt is available for this citation in seeded mode.'}
            </div>
          </DialogBody>
        ) : null}
        <DialogActions>
          <Button outline onClick={() => setSelectedCitation(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
