import { AuthLayout, Button, Heading, Text } from '@sqc/ui-catalyst'

export default function LoginSentPage() {
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
        <Heading>Magic link sent</Heading>
        <Text className="mt-2 text-zinc-600">
          Check your inbox for a sign-in link. For demo evaluation, you can continue directly to the product workspace.
        </Text>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button color="blue" href="/app">
            Open app
          </Button>
          <Button outline href="/login">
            Back to sign in
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
