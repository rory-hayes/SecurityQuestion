import { Badge, Heading, Subheading, Text } from '@sqc/ui-catalyst'

const entries = [
  {
    version: 'v0.3.0',
    date: 'February 28, 2026',
    items: [
      'Added questionnaire detail views with progress actions.',
      'Enabled onboarding knowledge-base uploads with review cadence scheduling.',
      'Connected review queue actions to state and approval APIs.'
    ]
  },
  {
    version: 'v0.2.0',
    date: 'February 28, 2026',
    items: [
      'Improved Catalyst shell/navigation parity and sign-in flow.',
      'Enabled production static deep-link routing and hydration stability.'
    ]
  }
]

export default function ChangelogPage() {
  return (
    <div className="space-y-6">
      <header>
        <Heading>Changelog</Heading>
        <Text className="mt-2">Product updates relevant to security questionnaire operations and governance controls.</Text>
      </header>
      {entries.map((entry) => (
        <section key={entry.version} className="rounded-xl border border-zinc-950/10 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <Subheading>{entry.version}</Subheading>
            <Badge color="zinc">{entry.date}</Badge>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            {entry.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
