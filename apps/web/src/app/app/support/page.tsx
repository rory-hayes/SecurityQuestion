import { Heading, Subheading, Text } from '@sqc/ui-catalyst'

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <header>
        <Heading>Support</Heading>
        <Text className="mt-2">Contact channels and runbooks for analyst teams during live questionnaire cycles.</Text>
      </header>
      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Operations Support</Subheading>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          <li>Email: support@securitycopilot.example</li>
          <li>Priority incidents: SLA response within 4 business hours.</li>
          <li>Escalation: principal@securitycopilot.example</li>
        </ul>
      </section>
      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Recommended Runbook</Subheading>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          <li>1. Confirm active workspace and questionnaire scope.</li>
          <li>2. Review evidence freshness before batch drafting.</li>
          <li>3. Route low-confidence questions to client owner with due date.</li>
          <li>4. Export only after explicit approval checkpoints are complete.</li>
        </ul>
      </section>
    </div>
  )
}
