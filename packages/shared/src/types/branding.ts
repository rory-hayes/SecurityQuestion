export interface BrandingSettings {
  orgId: string
  productName: string
  logoUrl: string | null
  accentHex: string
  updatedAt: string
}

export interface PublicPricingTier {
  id: string
  name: string
  monthlyPriceEurRange: string
  includedClientWorkspaces: string
  notes: string
}

export interface PublicFaqItem {
  id: string
  question: string
  answer: string
}
