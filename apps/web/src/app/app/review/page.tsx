import { Badge, Button, Heading, Subheading, Text } from '@sqc/ui-catalyst'

const drafts = [
  {
    id: 'Q-102',
    question: 'Do you encrypt data at rest and in transit?',
    answer:
      'Data is encrypted in transit using TLS and encrypted at rest using managed key services. Configuration and key rotation are reviewed on a documented cadence.',
    confidence: 'High',
    citations: ['SOC2-3.1', 'POL-ENC-2.4', 'ARCH-SEC-9']
  },
  {
    id: 'Q-145',
    question: 'Describe your vulnerability management SLA windows by severity.',
    answer: 'Cannot confirm complete SLA coverage from current evidence. Needs input from client security owner.',
    confidence: 'Low',
    citations: []
  }
]

export default function ReviewQueuePage() {
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
          <Button color="blue">Run next batch</Button>
        </div>
      </header>

      {drafts.map((draft) => (
        <article key={draft.id} className="rounded-xl border border-zinc-950/10 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Subheading>{draft.id}</Subheading>
            <Badge color={draft.confidence === 'Low' ? 'red' : 'green'}>{draft.confidence} confidence</Badge>
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
          <div className="mt-4 flex gap-2">
            <Button color="blue">Approve draft</Button>
            <Button outline>Assign to client owner</Button>
          </div>
        </article>
      ))}
    </div>
  )
}
