import type { BrandingSettings, PublicFaqItem, PublicPricingTier } from '@sqc/shared'

export const publicPricing: PublicPricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceEurRange: 'EUR 199-399',
    includedClientWorkspaces: '1-3 workspaces',
    notes: 'Best for solo vCISO operators.'
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPriceEurRange: 'EUR 799-1499',
    includedClientWorkspaces: 'Up to 15 workspaces',
    notes: 'For firms managing multiple active clients.'
  },
  {
    id: 'scale',
    name: 'Scale',
    monthlyPriceEurRange: 'Custom',
    includedClientWorkspaces: 'High volume',
    notes: 'For advanced controls and throughput requirements.'
  }
]

export const publicFaq: PublicFaqItem[] = [
  {
    id: 'f1',
    question: 'How are AI answers controlled?',
    answer:
      'Drafts are retrieval grounded and require citations. If evidence is missing, the system marks the question for client input.'
  },
  {
    id: 'f2',
    question: 'Is approval mandatory before export?',
    answer: 'Yes. Low-confidence and final exports require explicit approval with audit records.'
  },
  {
    id: 'f3',
    question: 'How is client isolation enforced?',
    answer: 'Workspace scoping is enforced in API, storage keys, and retrieval filters, with auditable access logs.'
  }
]

export const brandingByOrg = new Map<string, BrandingSettings>([
  [
    'org-default',
    {
      orgId: 'org-default',
      productName: 'Security Questionnaire Copilot',
      logoUrl: null,
      accentHex: '#365EEA',
      updatedAt: new Date().toISOString()
    }
  ]
])

export const globalTemplates = [
  {
    id: 'gt-1',
    title: 'Encryption at Rest and In Transit',
    shortAnswer: 'Data is encrypted in transit and at rest.',
    nonClientSpecific: true
  },
  {
    id: 'gt-2',
    title: 'Access Control Principles',
    shortAnswer: 'Access is role-based and reviewed regularly.',
    nonClientSpecific: true
  }
]

export const questionnaireProgress = new Map<string, { percent: number; status: string; resumed: boolean }>()
