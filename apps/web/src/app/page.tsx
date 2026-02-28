import {
  Badge,
  Button,
  Divider,
  Heading,
  Navbar,
  NavbarItem,
  NavbarLabel,
  NavbarSection,
  NavbarSpacer,
  Strong,
  Subheading,
  Text
} from '@sqc/ui-catalyst'
import { getPublicFaq, getPublicPricing } from '@/lib/public-content'

const workflowSteps = [
  {
    title: 'Import questionnaire and artifacts',
    detail: 'Upload `.xlsx`/`.xls`/`.csv` and client evidence files into an isolated workspace.'
  },
  {
    title: 'Draft with evidence citations',
    detail: 'Generate analyst-ready drafts with provenance and confidence scoring.'
  },
  {
    title: 'Review, assign, and approve',
    detail: 'Route low-confidence items, capture approvals, and maintain immutable activity logs.'
  },
  {
    title: 'Export with evidence pack',
    detail: 'Write approved responses back to mapped cells and include approved supporting documents.'
  }
]

const trustPoints = [
  'Per-workspace isolation across storage, retrieval, and metadata',
  'Encryption in transit and at rest, with auditable access trails',
  'Retention and deletion controls scoped per client workspace',
  'Default policy: no customer data used to train models'
]

export default async function LandingPage() {
  const [pricingTiers, faqItems] = await Promise.all([getPublicPricing(), getPublicFaq()])

  return (
    <main className="min-h-svh bg-linear-to-b from-zinc-100 via-zinc-100 to-blue-50/40 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-zinc-950/10 bg-white px-4 sm:px-6">
          <Navbar>
            <NavbarSection>
              <NavbarItem href="/">
                <span className="flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-zinc-950 text-white">
                    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 fill-current">
                      <path d="M3 6.6A3.6 3.6 0 0 1 6.6 3h6.8A3.6 3.6 0 0 1 17 6.6v6.8a3.6 3.6 0 0 1-3.6 3.6H6.6A3.6 3.6 0 0 1 3 13.4V6.6Zm3.6-1.1c-.6 0-1.1.5-1.1 1.1v6.8c0 .6.5 1.1 1.1 1.1h6.8c.6 0 1.1-.5 1.1-1.1V6.6c0-.6-.5-1.1-1.1-1.1H6.6Z" />
                    </svg>
                  </span>
                  <NavbarLabel className="text-sm font-semibold">Security Questionnaire Copilot</NavbarLabel>
                </span>
              </NavbarItem>
            </NavbarSection>
            <NavbarSpacer />
            <NavbarSection>
              <NavbarItem href="/login">
                <NavbarLabel>Sign in</NavbarLabel>
              </NavbarItem>
              <Button href="/signup" color="blue">
                Start Free Trial
              </Button>
              <Button href="/app" outline>
                Open App
              </Button>
            </NavbarSection>
          </Navbar>
        </header>

        <section className="overflow-hidden rounded-3xl border border-zinc-950/15 bg-linear-to-br from-zinc-950 via-zinc-900 to-blue-950 p-8 shadow-lg lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <Badge color="blue" className="bg-blue-400/20 text-blue-100">
                Analyst-in-the-loop security operations
              </Badge>
              <h1 className="mt-4 max-w-3xl text-4xl/tight font-semibold text-white sm:text-5xl/tight">
                Cut questionnaire turnaround from days to hours with evidence-backed drafts.
              </h1>
              <p className="mt-4 max-w-2xl text-base/8 text-zinc-200">
                Built for vCISO firms and security consultancies handling multi-client RFP, RFI, and vendor risk
                questionnaires. Analysts stay in control with citations, confidence scoring, and mandatory approvals.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button href="/signup" color="blue">
                  Start Free Trial
                </Button>
                <Button href="/login" color="white">
                  Sign in
                </Button>
                <a
                  href="mailto:sales@example.com?subject=Book%20a%20Demo"
                  className="text-sm font-medium text-zinc-200 underline decoration-zinc-400 underline-offset-4"
                >
                  Book Demo
                </a>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2">
                  <p className="text-xs font-medium tracking-wide text-zinc-300 uppercase">Time reduction target</p>
                  <p className="mt-1 text-sm font-semibold text-white">60-80%</p>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2">
                  <p className="text-xs font-medium tracking-wide text-zinc-300 uppercase">Citation coverage target</p>
                  <p className="mt-1 text-sm font-semibold text-white">70%+</p>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2">
                  <p className="text-xs font-medium tracking-wide text-zinc-300 uppercase">Major edit-rate target</p>
                  <p className="mt-1 text-sm font-semibold text-white">&lt;30%</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
                <img
                  src="/images/security-hero.png"
                  alt="Security questionnaire workflow visualization"
                  className="h-auto w-full rounded-xl"
                />
              </div>
              <div className="absolute -bottom-5 left-5 rounded-xl border border-zinc-200/30 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Live signal</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">132 low-confidence questions routed</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-950/10 bg-white p-5 shadow-sm">
            <Subheading>Target Time Reduction</Subheading>
            <Text className="mt-2">
              <Strong>60-80%</Strong> faster completion compared with baseline workflows.
            </Text>
          </div>
          <div className="rounded-xl border border-zinc-950/10 bg-white p-5 shadow-sm">
            <Subheading>Citation Coverage Target</Subheading>
            <Text className="mt-2">
              <Strong>70%+</Strong> of questions auto-drafted with usable citations.
            </Text>
          </div>
          <div className="rounded-xl border border-zinc-950/10 bg-white p-5 shadow-sm">
            <Subheading>Major Edit Rate Target</Subheading>
            <Text className="mt-2">
              Keep major reviewer rewrites under <Strong>30%</Strong>.
            </Text>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
          <Subheading>Workflow</Subheading>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step, idx) => (
              <div key={step.title} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Step {idx + 1}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-900">{step.title}</p>
                <Text className="mt-2 text-zinc-600">{step.detail}</Text>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
            <Subheading>Security and Governance</Subheading>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700">
              {trustPoints.map((point) => (
                <li key={point}>{point}.</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-950/10 bg-linear-to-br from-white to-blue-50 p-8 shadow-sm">
            <Subheading>Built for vCISO and MSP Teams</Subheading>
            <Text className="mt-4 text-zinc-700">
              Manage many client workspaces with strict separation, reusable generic templates, and governed answer
              quality.
            </Text>
            <Text className="mt-3 text-zinc-700">
              Designed for analyst throughput and principal-level confidence during customer due diligence cycles.
            </Text>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
          <Subheading>Pricing</Subheading>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div key={tier.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-sm font-semibold text-zinc-900">{tier.name}</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{tier.monthlyPriceEurRange}</p>
                <Text className="mt-2">{tier.includedClientWorkspaces}</Text>
                <Text className="mt-3">{tier.notes}</Text>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
          <Subheading>FAQ</Subheading>
          <div className="mt-4 space-y-4">
            {faqItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-900">{item.question}</p>
                <Text className="mt-2 text-zinc-700">{item.answer}</Text>
              </div>
            ))}
          </div>
        </section>

        <Divider className="my-10" />

        <section className="pb-10 text-center">
          <Heading level={2} className="text-2xl">
            Ready to run secure questionnaire operations at scale?
          </Heading>
          <div className="mt-4 flex justify-center gap-3">
            <Button href="/signup" color="blue">
              Start Free Trial
            </Button>
            <Button href="/app" outline>
              Open App
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
