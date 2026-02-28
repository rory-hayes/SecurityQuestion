import { Button, Heading, Text } from '@sqc/ui-catalyst'

export default function AppNotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <Heading>Page not found</Heading>
        <Text className="mt-2">The requested page does not exist in this workspace.</Text>
        <Button href="/app" className="mt-4" color="blue">
          Return to dashboard
        </Button>
      </section>
    </main>
  )
}
