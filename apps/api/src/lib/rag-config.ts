export const MODEL_IDS = {
  mappingPrimary: 'gpt-5-mini',
  mappingEscalation: 'gpt-5.2',
  normalisePrimary: 'gpt-5-mini',
  draftPrimary: 'gpt-5-mini',
  draftEscalation: 'gpt-5.2',
  verifierPrimary: 'gpt-5.2',
  missingInfoPrimary: 'gpt-5-mini',
  embeddings: 'text-embedding-3-large'
} as const

export const CONFIDENCE_THRESHOLDS = {
  high: 0.82,
  medium: 0.65
} as const

export const STORE_POLICY = {
  customerContentStore: false
} as const

export const DRAFT_POLICY = {
  languageScope: 'english_only',
  tone: 'professional_factual_concise'
} as const
