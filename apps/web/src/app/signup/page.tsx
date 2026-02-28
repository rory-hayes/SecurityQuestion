import { AuthLayout, Button, Field, FieldGroup, Fieldset, Heading, Input, Label, Text } from '@sqc/ui-catalyst'

export default function SignupPage() {
  return (
    <AuthLayout>
      <form action="/signup/sent" className="mx-auto w-full max-w-md rounded-2xl border border-zinc-950/10 bg-white p-8 shadow-sm">
        <Heading>Create your workspace</Heading>
        <Text className="mt-2 text-zinc-600">
          Start with magic-link sign-in, then create your organization and first client workspace.
        </Text>
        <Fieldset className="mt-6">
          <FieldGroup>
            <Field>
              <Label>Work email</Label>
              <Input name="email" type="email" required />
            </Field>
            <Field>
              <Label>Organization name</Label>
              <Input name="organizationName" type="text" required />
            </Field>
          </FieldGroup>
        </Fieldset>
        <Button type="submit" color="blue" className="mt-6 w-full">
          Send magic link
        </Button>
        <div className="mt-3 flex items-center justify-between">
          <Button href="/login" plain>
            Already have an account? Sign in
          </Button>
          <Button href="/app" plain>
            Open demo workspace
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
