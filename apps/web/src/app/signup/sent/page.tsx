import { Button, Heading, Text } from '@sqc/ui-catalyst'

export default function MagicLinkSentPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
        <Heading>Check your email</Heading>
        <Text className="mt-3 text-zinc-600">
          A secure magic link has been sent. After sign-in, continue to create your first client workspace.
        </Text>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/app/onboarding/workspace" color="blue">
            Continue to workspace setup
          </Button>
          <Button href="/" outline>
            Return to home
          </Button>
        </div>
      </section>
    </main>
  )
}
