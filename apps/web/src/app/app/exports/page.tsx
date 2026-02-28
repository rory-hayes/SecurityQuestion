'use client'

import { Badge, Button, Heading, Subheading, Text } from '@sqc/ui-catalyst'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { ensureSeeded, listQuestionnaires, onStoreUpdate, updateQuestionnaire } from '@/lib/app-store'

export default function ExportsPage() {
  const [batches, setBatches] = useState<ReturnType<typeof listQuestionnaires>>([])
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded()
    const refresh = () => setBatches(listQuestionnaires())
    refresh()
    return onStoreUpdate(refresh)
  }, [])

  const exportCandidates = useMemo(() => batches.filter((item) => item.status !== 'Exported'), [batches])

  async function queueNextExport() {
    const next = exportCandidates[0]
    if (!next) {
      setStatus('No pending questionnaire batches to export.')
      return
    }

    const response = await apiRequest<{ status: string }>(`/v1/questionnaires/${next.id}/export`, { method: 'POST' })
    if (!response.ok) {
      setStatus(response.error ?? 'Failed to queue export.')
      return
    }

    updateQuestionnaire(next.id, { status: 'Export Queued', progress: Math.max(next.progress, 80) })
    setStatus(`Export queued for ${next.id}.`)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading>Exports and Evidence Packs</Heading>
          <Text className="mt-2">Preserve spreadsheet layout and include only approved evidence artifacts.</Text>
        </div>
        <Button color="blue" onClick={queueNextExport}>
          Create export
        </Button>
      </header>

      {status ? <div className="rounded-lg border border-zinc-950/10 bg-white px-4 py-3 text-sm text-zinc-700">{status}</div> : null}

      <section className="grid gap-4">
        {batches.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-950/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Subheading>{item.fileName}</Subheading>
                <Text className="mt-1">{item.id}</Text>
              </div>
              <Badge color={/blocked|needs/i.test(item.status) ? 'red' : /approved|export/i.test(item.status) ? 'green' : 'blue'}>
                {item.status}
              </Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
              <div>
                <dt className="font-medium text-zinc-900">Progress</dt>
                <dd>{item.progress}%</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-900">Evidence Pack</dt>
                <dd>{item.status === 'Exported' ? 'included' : 'pending'}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </div>
  )
}
