import {
  Badge,
  Heading,
  Select,
  Subheading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text
} from '@sqc/ui-catalyst'

const metrics = [
  { label: 'Median import to export', value: '2h 18m', delta: '+18%' },
  { label: 'Usable auto-drafts', value: '74%', delta: '+4%' },
  { label: 'Major edit rate', value: '24%', delta: '-6%' },
  { label: 'Library reuse rate', value: '52%', delta: '+7%' }
]

const recentBatches = [
  {
    id: 'Q-8831',
    created: 'Feb 28, 2026',
    workspace: 'Acme Health',
    stage: 'In Review',
    completion: '76%'
  },
  {
    id: 'Q-8826',
    created: 'Feb 27, 2026',
    workspace: 'Northwind SaaS',
    stage: 'Needs Client Input',
    completion: '63%'
  },
  {
    id: 'Q-8809',
    created: 'Feb 26, 2026',
    workspace: 'Delta Payments',
    stage: 'Approved',
    completion: '100%'
  }
]

function deltaBadge(delta: string) {
  if (delta.startsWith('+')) return <Badge color="green">{delta} from last week</Badge>
  if (delta.startsWith('-')) return <Badge color="red">{delta} from last week</Badge>
  return <Badge color="zinc">{delta} from last week</Badge>
}

function stageBadge(stage: string) {
  if (stage === 'Approved') return <Badge color="green">{stage}</Badge>
  if (stage === 'Needs Client Input') return <Badge color="amber">{stage}</Badge>
  return <Badge color="blue">{stage}</Badge>
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading>Good afternoon, Analyst Lead</Heading>
          <Text className="mt-2">Operational metrics and workflow health across active questionnaire cycles.</Text>
        </div>
        <div className="w-44">
          <Select name="window" defaultValue="7d">
            <option value="7d">Last week</option>
            <option value="30d">Last month</option>
            <option value="90d">Last quarter</option>
          </Select>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-zinc-950/10 bg-white p-5">
            <Subheading>{metric.label}</Subheading>
            <p className="mt-3 text-3xl font-semibold text-zinc-950">{metric.value}</p>
            <div className="mt-3">{deltaBadge(metric.delta)}</div>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Recent questionnaire batches</Subheading>
        <div className="mt-4">
          <Table dense>
            <TableHead>
              <TableRow>
                <TableHeader>Batch ID</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Workspace</TableHeader>
                <TableHeader>Stage</TableHeader>
                <TableHeader>Completion</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>{batch.id}</TableCell>
                  <TableCell>{batch.created}</TableCell>
                  <TableCell>{batch.workspace}</TableCell>
                  <TableCell>{stageBadge(batch.stage)}</TableCell>
                  <TableCell>{batch.completion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Recent activity</Subheading>
        <ul className="mt-4 space-y-3 text-sm text-zinc-700">
          <li>11:21 UTC - `Healthcare Buyer RFP` imported and normalized (1,184 questions).</li>
          <li>11:27 UTC - 132 low-confidence questions routed to client input queue.</li>
          <li>11:35 UTC - Approval batch completed by `client.owner@acmehealth.example`.</li>
        </ul>
      </section>
    </div>
  )
}
