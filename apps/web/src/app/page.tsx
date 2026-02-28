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

const proofLogos = ['Vercel', 'Loom', 'Cash App', 'Zapier', 'Ramp', 'Raycast']

const proofMetrics = [
  {
    title: 'Target Time Reduction',
    value: '60-80%',
    detail: 'Target reduction in questionnaire turnaround time after onboarding.'
  },
  {
    title: 'Citation Coverage Target',
    value: '70%+',
    detail: 'Target share of questions drafted with usable evidence citations.'
  },
  {
    title: 'Major Edit-Rate Target',
    value: '<30%',
    detail: 'Target cap for answers needing major reviewer rewrites.'
  }
]

const frictionPoints = [
  'Answers copied from old templates without fresh evidence checks.',
  'Questionnaire columns mapped manually, causing repeated rework.',
  'Late-stage reviewer escalations because confidence and ownership are unclear.'
]

const solutionPoints = [
  'Evidence-backed draft generation with direct snippet provenance.',
  'Guided mapping before extraction so analysts approve question/answer columns first.',
  'Mandatory approvals and immutable activity history before export.'
]

const workflowSteps = [
  {
    title: 'Import and Map',
    detail: 'Upload `.xlsx` / `.xls` / `.csv` files, detect headers, and confirm suggested question/answer columns.',
    outcome: 'Extraction starts only after explicit analyst approval.'
  },
  {
    title: 'Normalise and Draft',
    detail: 'Create stable question IDs, retrieve best-fit evidence, and draft responses with citations and confidence.',
    outcome: 'Low-confidence answers are marked as `Needs input` instead of guessed.'
  },
  {
    title: 'Review and Approve',
    detail: 'Assign owners, collect comments, enforce approval states, and gate risky items.',
    outcome: 'Export blocks until low-confidence acknowledgements and approvals are complete.'
  },
  {
    title: 'Export and Track',
    detail: 'Write approved answers back into mapped cells and generate an evidence pack with approved artifacts.',
    outcome: 'Every export has an append-only audit trail.'
  }
]

const governanceControls = [
  'Workspace-scoped retrieval boundaries across storage, metadata, and indexing',
  'Encryption in transit and at rest by default',
  'Prompt and source traceability for every generated draft',
  'Configurable document-review reminders every 3, 6, 9, or 12 months',
  'Default no-training policy for customer content'
]

const audienceCards = [
  {
    title: 'vCISO Lead',
    detail: 'Standardize quality across client portfolios with defensible responses and visible approval controls.',
    metric: 'Principal-level confidence'
  },
  {
    title: 'Security Analyst',
    detail: 'Spend less time rewriting and more time resolving true evidence gaps.',
    metric: 'Higher analyst throughput'
  },
  {
    title: 'Client Security Owner',
    detail: 'Review decisions in context with citations, confidence signals, and change history.',
    metric: 'Faster sign-off cycles'
  }
]

const comparisonRows = [
  {
    area: 'Question extraction',
    manual: 'Manual scanning and copy/paste',
    copilot: 'Header detection with analyst-approved mapping'
  },
  {
    area: 'Answer confidence',
    manual: 'Subjective confidence, hidden in comments',
    copilot: 'Explicit confidence tier with export gating'
  },
  {
    area: 'Evidence traceability',
    manual: 'Source docs tracked in side channels',
    copilot: 'Citations linked directly in each draft'
  },
  {
    area: 'Auditability',
    manual: 'Difficult to reconstruct decision flow',
    copilot: 'Immutable timeline on every export'
  }
]

const trustChecklist = [
  'Clear ownership shown on each questionnaire stage',
  'No hidden automation: analyst-in-the-loop by design',
  'Claims constrained by evidence and approval policy'
]

export default async function LandingPage() {
  const [pricingTiers, faqItems] = await Promise.all([getPublicPricing(), getPublicFaq()])

  return (
    <main className="min-h-svh bg-linear-to-b from-zinc-100 via-zinc-100 to-blue-50/30 px-4 py-4 sm:px-6 lg:px-8">
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

        <section className="overflow-hidden rounded-3xl border border-zinc-950/20 bg-linear-to-br from-zinc-950 via-zinc-900 to-blue-950 p-8 shadow-xl lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <Badge color="blue" className="bg-blue-400/20 text-blue-100">
                Analyst-in-the-loop security operations
              </Badge>
              <h1 className="mt-4 max-w-3xl text-4xl/tight font-semibold text-white sm:text-5xl/tight">
                Cut questionnaire turnaround from days to hours with evidence-backed drafts.
              </h1>
              <p className="mt-4 max-w-2xl text-base/8 text-zinc-200">
                Built for vCISO firms and security consultancies managing multi-client RFP, RFI, and vendor risk
                questionnaires. Keep reviewers in control with citations, confidence scoring, and approval gates.
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
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {proofMetrics.map((metric) => (
                  <div key={metric.title} className="rounded-lg border border-white/15 bg-white/5 px-3 py-3">
                    <p className="text-[11px] font-semibold tracking-wide text-zinc-300 uppercase">{metric.title}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
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
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Live queue</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">132 low-confidence questions routed</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/10 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
            <div>
              <Subheading>Trusted by Operations Teams Who Need Defensible Outputs</Subheading>
              <Text className="mt-2 text-zinc-600">
                Page structure prioritizes fast scanning: clear scope, trust controls, and one primary next step.
              </Text>
              <div className="mt-4 flex flex-wrap gap-2">
                {proofLogos.map((logo) => (
                  <span
                    key={logo}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {logo}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-linear-to-br from-zinc-50 to-blue-50 p-5">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Primary next step</p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">Start with one real questionnaire in a sandbox workspace</p>
              <Text className="mt-2 text-zinc-600">Run the full import-to-export flow before procurement onboarding.</Text>
              <div className="mt-4 flex gap-2">
                <Button href="/signup" color="blue">
                  Start Free Trial
                </Button>
                <Button href="/app" outline>
                  Open App
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
            <Subheading>Where Teams Lose Time Today</Subheading>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700">
              {frictionPoints.map((point) => (
                <li key={point} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-950/10 bg-linear-to-br from-white to-blue-50 p-8 shadow-sm">
            <Subheading>What Changes in This Workflow</Subheading>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700">
              {solutionPoints.map((point) => (
                <li key={point} className="rounded-lg border border-blue-200 bg-white px-3 py-2">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
          <Subheading>Manual Process vs Copilot Workflow</Subheading>
          <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
            <div className="grid grid-cols-[0.9fr_1fr_1fr] bg-zinc-50 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              <div className="px-4 py-3">Area</div>
              <div className="px-4 py-3">Traditional process</div>
              <div className="px-4 py-3">Copilot workflow</div>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.area} className="grid grid-cols-[0.9fr_1fr_1fr] border-t border-zinc-200 text-sm">
                <div className="px-4 py-3 font-medium text-zinc-900">{row.area}</div>
                <div className="px-4 py-3 text-zinc-600">{row.manual}</div>
                <div className="px-4 py-3 text-zinc-800">{row.copilot}</div>
              </div>
            ))}
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
                <Text className="mt-2 text-zinc-700">
                  <Strong>Result:</Strong> {step.outcome}
                </Text>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/15 bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-8 text-white shadow-xl">
          <Subheading className="text-white">Security and Governance Controls</Subheading>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <ul className="space-y-3 text-sm text-zinc-200">
              {governanceControls.map((control) => (
                <li key={control} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  {control}
                </li>
              ))}
            </ul>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/15 bg-white/5 p-5">
                <p className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">Trust checklist</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-100">
                  {trustChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-5">
                <p className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">Security review package</p>
                <p className="mt-2 text-sm text-zinc-100">
                  Request architecture notes, isolation controls, and data-handling summary for procurement review.
                </p>
                <a
                  href="mailto:sales@example.com?subject=Security%20Review%20Request"
                  className="mt-4 inline-block text-sm font-medium text-blue-200 underline decoration-blue-300 underline-offset-4"
                >
                  Request security package
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
          <Subheading>Built for vCISO and MSP Teams</Subheading>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {audienceCards.map((card) => (
              <div key={card.title} className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-sm font-semibold text-zinc-900">{card.title}</p>
                <Text className="mt-2 text-zinc-600">{card.detail}</Text>
                <p className="mt-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{card.metric}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Subheading>Pricing</Subheading>
              <Text className="mt-1 text-zinc-600">Start with the agency tier for multi-client operations and pilot support.</Text>
            </div>
            <Badge color="blue">Pilot offer available</Badge>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-xl border p-5 ${
                  tier.id === 'agency' ? 'border-blue-300 bg-linear-to-br from-blue-50 to-white' : 'border-zinc-200 bg-zinc-50'
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900">{tier.name}</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{tier.monthlyPriceEurRange}</p>
                <Text className="mt-2 text-zinc-600">{tier.includedClientWorkspaces}</Text>
                <Text className="mt-3 text-zinc-700">{tier.notes}</Text>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
          <Subheading>FAQ</Subheading>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-900">{item.question}</p>
                <Text className="mt-2 text-zinc-700">{item.answer}</Text>
              </div>
            ))}
          </div>
        </section>

        <Divider className="my-10" />

        <section className="rounded-2xl border border-zinc-950/15 bg-white p-8 text-center shadow-sm">
          <Heading level={2} className="text-2xl">
            Ready to run secure questionnaire operations at scale?
          </Heading>
          <Text className="mt-2 text-zinc-600">Start with one workspace, one questionnaire, and an evidence-first approval flow.</Text>
          <div className="mt-5 flex justify-center gap-3">
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
