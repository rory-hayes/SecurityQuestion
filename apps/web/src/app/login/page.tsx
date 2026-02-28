import { AuthLayout, Button, Field, Fieldset, Heading, Input, Label, Text } from '@sqc/ui-catalyst'

export default function LoginPage() {
  return (
    <AuthLayout>
      <form action="/login/sent" className="mx-auto w-full max-w-md rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
        <Heading>Sign in with magic link</Heading>
        <Text className="mt-2 text-zinc-600">
          Enter your work email. You can open the live demo workspace after sign-in.
        </Text>
        <Fieldset className="mt-6">
          <Field>
            <Label>Work email</Label>
            <Input name="email" type="email" required />
          </Field>
        </Fieldset>
        <Button type="submit" color="blue" className="mt-6 w-full">
          Send magic link
        </Button>
        <div className="mt-3 flex justify-center">
          <Button href="/app" plain>
            Open demo workspace
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
