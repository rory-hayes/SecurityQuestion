import { Button, Divider, Heading, Strong, Subheading, Text } from '@sqc/ui-catalyst'
import { getPublicFaq, getPublicPricing } from '@/lib/public-content'

export default async function LandingPage() {
  const [pricingTiers, faqItems] = await Promise.all([getPublicPricing(), getPublicFaq()])

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm lg:p-12">
        <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">Security Operations Software</p>
        <Heading className="mt-4 max-w-3xl text-4xl/tight sm:text-5xl/tight">
          Cut questionnaire turnaround from days to hours with evidence-backed drafts.
        </Heading>
        <Text className="mt-4 max-w-3xl text-base text-zinc-600">
          Built for vCISO firms and security consultancies handling multi-client RFP, RFI, and vendor risk questionnaires.
          Analysts stay in control with citations, confidence scoring, and mandatory approvals.
        </Text>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/signup" color="blue">
            Start Free Trial
          </Button>
          <Button href="mailto:sales@example.com?subject=Book%20a%20Demo" outline>
            Book Demo
          </Button>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <Subheading>Target Time Reduction</Subheading>
          <Text className="mt-2">
            <Strong>60-80%</Strong> faster completion compared with baseline workflows.
          </Text>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <Subheading>Citation Coverage Target</Subheading>
          <Text className="mt-2">
            <Strong>70%+</Strong> of questions auto-drafted with usable citations.
          </Text>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <Subheading>Major Edit Rate Target</Subheading>
          <Text className="mt-2">
            Keep major reviewer rewrites under <Strong>30%</Strong>.
          </Text>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-8">
        <Subheading>Workflow</Subheading>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            'Import questionnaire and artifacts',
            'Draft with evidence citations',
            'Review, assign, and approve',
            'Export with an evidence pack'
          ].map((step, idx) => (
            <div key={step} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Step {idx + 1}</p>
              <Text className="mt-2 text-zinc-700">{step}</Text>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8">
          <Subheading>Security and Governance</Subheading>
          <ul className="mt-4 space-y-3 text-sm text-zinc-700">
            <li>Per-workspace isolation across storage, retrieval, and metadata.</li>
            <li>Encryption in transit and at rest, with auditable access trails.</li>
            <li>Retention and deletion controls scoped per client workspace.</li>
            <li>Default policy: no customer data used to train models.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8">
          <Subheading>Built for vCISO and MSP Teams</Subheading>
          <Text className="mt-4 text-zinc-700">
            Manage many client workspaces with strict separation, reusable generic templates, and governed answer quality.
          </Text>
          <Text className="mt-3 text-zinc-700">
            Designed for analyst throughput and principal-level confidence during customer due diligence cycles.
          </Text>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-8">
        <Subheading>Pricing</Subheading>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div key={tier.id} className="rounded-xl border border-zinc-200 p-5">
              <p className="text-sm font-semibold text-zinc-900">{tier.name}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">{tier.monthlyPriceEurRange}</p>
              <Text className="mt-2">{tier.includedClientWorkspaces}</Text>
              <Text className="mt-3">{tier.notes}</Text>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-8">
        <Subheading>FAQ</Subheading>
        <div className="mt-4 space-y-4">
          {faqItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-200 p-4">
              <p className="text-sm font-semibold text-zinc-900">{item.question}</p>
              <Text className="mt-2 text-zinc-700">{item.answer}</Text>
            </div>
          ))}
        </div>
      </section>

      <Divider className="my-12" />

      <section className="pb-12 text-center">
        <Heading level={2} className="text-2xl">
          Ready to run secure questionnaire operations at scale?
        </Heading>
        <div className="mt-4 flex justify-center gap-3">
          <Button href="/signup" color="blue">
            Start Free Trial
          </Button>
          <Button href="mailto:sales@example.com?subject=Pilot%20Discussion" outline>
            Discuss Pilot
          </Button>
        </div>
      </section>
    </main>
  )
}
