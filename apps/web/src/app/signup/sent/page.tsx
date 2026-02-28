import { AuthLayout, Button, Heading, Text } from '@sqc/ui-catalyst'

export default function SignupSentPage() {
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
        <Heading>Check your email</Heading>
        <Text className="mt-2 text-zinc-600">
          Your trial setup link has been sent. Continue to the app to create your first client workspace and upload evidence.
        </Text>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button color="blue" href="/app/onboarding/workspace">
            Create workspace
          </Button>
          <Button outline href="/signup">
            Back to signup
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
