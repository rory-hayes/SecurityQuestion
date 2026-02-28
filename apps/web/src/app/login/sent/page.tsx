import { Button, Heading, Text } from '@sqc/ui-catalyst'

export default function LoginSentPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
      <section className="w-full rounded-2xl border border-zinc-950/10 bg-white p-10 text-center shadow-sm">
        <Heading>Magic link sent</Heading>
        <Text className="mt-3 text-zinc-600">
          Check your inbox to complete sign-in. If you are evaluating quickly, open the demo workspace now.
        </Text>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/app" color="blue">
            Open demo workspace
          </Button>
          <Button href="/signup" outline>
            Start free trial
          </Button>
        </div>
      </section>
    </main>
  )
}
