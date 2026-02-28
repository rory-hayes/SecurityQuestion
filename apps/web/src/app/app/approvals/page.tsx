import { Badge, Heading, Subheading, Text } from '@sqc/ui-catalyst'

const approvals = [
  {
    id: 'APR-3201',
    questionnaire: 'Healthcare Buyer RFP',
    approver: 'Client Security Owner',
    status: 'Approved',
    updatedAt: '2026-02-27 16:42'
  },
  {
    id: 'APR-3202',
    questionnaire: 'Payments Vendor Due Diligence',
    approver: 'Client Security Owner',
    status: 'Pending Input',
    updatedAt: '2026-02-27 12:14'
  }
]

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <header>
        <Heading>Approvals and Audit Trail</Heading>
        <Text className="mt-2">All state transitions are immutable and tied to actor identity and timestamp.</Text>
      </header>
      <section className="grid gap-4">
        {approvals.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Subheading>{item.questionnaire}</Subheading>
                <Text className="mt-1">{item.id}</Text>
              </div>
              <Badge color={item.status === 'Approved' ? 'green' : 'amber'}>{item.status}</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
              <div>
                <dt className="font-medium text-zinc-900">Approver</dt>
                <dd>{item.approver}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-900">Last Updated</dt>
                <dd>{item.updatedAt}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <Subheading>Immutable Activity Log (Latest Export)</Subheading>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          <li>2026-02-27 16:12 UTC - Draft batch completed - actor: analyst@firm.example</li>
          <li>2026-02-27 16:29 UTC - Low-confidence acknowledgment recorded - actor: analyst@firm.example</li>
          <li>2026-02-27 16:42 UTC - Final approval recorded - actor: client.owner@example.com</li>
          <li>2026-02-27 17:08 UTC - Export artifact generated - hash: d90f4e3a1b72</li>
        </ul>
      </section>
    </div>
  )
}
