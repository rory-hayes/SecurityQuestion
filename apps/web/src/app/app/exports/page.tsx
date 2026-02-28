import { Badge, Button, Heading, Subheading, Text } from '@sqc/ui-catalyst'

const exportsData = [
  {
    id: 'EXP-885',
    template: 'Healthcare Buyer RFP.xlsx',
    evidencePack: 'included',
    exportedAt: '2026-02-27 17:08',
    status: 'Exported'
  },
  {
    id: 'EXP-886',
    template: 'Banking Security Questionnaire.xlsx',
    evidencePack: 'pending',
    exportedAt: '-',
    status: 'Blocked: low confidence'
  }
]

export default function ExportsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading>Exports and Evidence Packs</Heading>
          <Text className="mt-2">Spreadsheet layout is preserved while approved answers are written to mapped cells.</Text>
        </div>
        <Button color="blue">Create export</Button>
      </header>
      <section className="grid gap-4">
        {exportsData.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Subheading>{item.template}</Subheading>
                <Text className="mt-1">{item.id}</Text>
              </div>
              <Badge color={item.status.startsWith('Blocked') ? 'red' : 'green'}>{item.status}</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
              <div>
                <dt className="font-medium text-zinc-900">Evidence Pack</dt>
                <dd>{item.evidencePack}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-900">Exported At</dt>
                <dd>{item.exportedAt}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </div>
  )
}
