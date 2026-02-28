import type { PublicFaqItem, PublicPricingTier } from '@sqc/shared'

const fallbackPricingTiers: PublicPricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceEurRange: 'EUR 199-399',
    includedClientWorkspaces: '1-3 workspaces',
    notes: 'Solo vCISO baseline with analyst-in-the-loop drafting and export gates.'
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPriceEurRange: 'EUR 799-1499',
    includedClientWorkspaces: 'Up to 15 workspaces',
    notes: 'Multi-client governance, review workflows, and SLA visibility for growing firms.'
  },
  {
    id: 'scale',
    name: 'Scale',
    monthlyPriceEurRange: 'Custom',
    includedClientWorkspaces: 'High-volume + add-on workspaces',
    notes: 'High throughput operations, custom controls, and advanced reporting.'
  }
]

const fallbackFaqItems: PublicFaqItem[] = [
  {
    id: 'faq-citations',
    question: 'How do you reduce hallucination risk?',
    answer:
      'Drafts are evidence-first. Each answer includes citations or is marked needs input. Low-confidence outputs require reviewer acknowledgment and approval before final export.'
  },
  {
    id: 'faq-approvals',
    question: 'Can analysts export without client sign-off?',
    answer:
      'Final exports require explicit approval workflow. Every state transition is logged in the immutable activity trail for auditability.'
  },
  {
    id: 'faq-security',
    question: 'How is client data isolated?',
    answer:
      'Workspaces are hard-scoped with role-based access controls and separate retrieval filtering. Cross-workspace evidence access is blocked and logged.'
  },
  {
    id: 'faq-training',
    question: 'Do you train models on customer data?',
    answer:
      'No. Customer content is excluded from model training by default policy and deployment configuration.'
  }
]

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL

async function fetchManaged<T>(path: string, fallback: T): Promise<T> {
  if (!apiBase) return fallback

  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) return fallback
    const payload = (await response.json()) as { data?: T }
    return payload.data ?? fallback
  } catch {
    return fallback
  }
}

export async function getPublicPricing(): Promise<PublicPricingTier[]> {
  return fetchManaged('/v1/public/pricing', fallbackPricingTiers)
}

export async function getPublicFaq(): Promise<PublicFaqItem[]> {
  return fetchManaged('/v1/public/faq', fallbackFaqItems)
}
