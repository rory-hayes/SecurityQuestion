import { Suspense } from 'react'
import { Heading, Text } from '@sqc/ui-catalyst'
import QuestionnaireDetailClient from './questionnaire-detail-client'

function LoadingState() {
  return (
    <div className="space-y-2">
      <Heading>Loading questionnaire detail</Heading>
      <Text>Preparing questionnaire metadata and progress state.</Text>
    </div>
  )
}

export default function QuestionnaireDetailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <QuestionnaireDetailClient />
    </Suspense>
  )
}
