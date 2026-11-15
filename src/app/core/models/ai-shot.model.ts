/** Plan 600: one recipe AI example as the platform admin sees it (candidate or shared). */
export interface AiShotRow {
  _id: string
  nameHebrew: string
  /** The request text, cut to 200 characters. */
  prompt: string
  ingredientCount: number
  /** Share of the AI draft's ingredients the cook kept (0..1); null when unknown. */
  keptRatio: number | null
  source: 'text' | 'image' | 'url'
  createdAt: string
  /** Candidates only — never on a shared copy. */
  businessName?: string
}

export interface AiShotsReport {
  candidates: AiShotRow[]
  shared: AiShotRow[]
}
