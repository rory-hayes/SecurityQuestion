import { Badge, Heading, Subheading, Text } from '@sqc/ui-catalyst'

const evidence = [
  {
    id: 'doc-001',
    name: 'SOC 2 Type II Report',
    type: 'Audit Report',
    updated: '2026-02-15',
    owner: 'Compliance Lead',
    snippets: 214
  },
  {
    id: 'doc-002',
    name: 'Incident Response Policy',
    type: 'Policy',
    updated: '2026-01-29',
    owner: 'Security Manager',
    snippets: 87
  },
  {
    id: 'doc-003',
    name: 'Cloud Architecture Diagram',
    type: 'Diagram',
    updated: '2026-02-02',
    owner: 'Platform Team',
    snippets: 43
  }
]

export default function EvidencePage() {
  return (
    <div className="space-y-6">
      <header>
        <Heading>Evidence Library</Heading>
        <Text className="mt-2">Traceable evidence snippets with owners, recency metadata, and citation readiness.</Text>
      </header>
      <section className="grid gap-4">
        {evidence.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Subheading>{item.name}</Subheading>
                <Text className="mt-1">{item.type}</Text>
              </div>
              <Badge color="zinc">{item.snippets} citable snippets</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
              <div>
                <dt className="font-medium text-zinc-900">Last Updated</dt>
                <dd>{item.updated}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-900">Owner</dt>
                <dd>{item.owner}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </div>
  )
}
