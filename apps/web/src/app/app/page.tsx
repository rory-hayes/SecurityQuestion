import { Badge, Heading, Subheading, Text } from '@sqc/ui-catalyst'

const metrics = [
  { label: 'Median import to export', value: '2h 18m', trend: 'Target < 4h' },
  { label: 'Usable auto-drafts', value: '74%', trend: 'Target 70%+' },
  { label: 'Major edit rate', value: '24%', trend: 'Target < 30%' },
  { label: 'Library reuse rate', value: '52%', trend: 'Target 50%+' }
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <Heading>Operations Dashboard</Heading>
        <Text className="mt-2">Pilot metrics and workflow health for active questionnaire cycles.</Text>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <Subheading>{metric.label}</Subheading>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{metric.value}</p>
            <Badge color="zinc" className="mt-3">
              {metric.trend}
            </Badge>
          </article>
        ))}
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <Subheading>Recent activity</Subheading>
        <ul className="mt-4 space-y-3 text-sm text-zinc-700">
          <li>Questionnaire "RFP-Q1-Healthcare" imported and normalized (1,184 questions).</li>
          <li>132 low-confidence questions flagged for client input.</li>
          <li>Approval batch completed by client approver in workspace Acme Health.</li>
        </ul>
      </section>
    </div>
  )
}
