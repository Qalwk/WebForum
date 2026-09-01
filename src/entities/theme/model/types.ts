export type TechVersion = 'full' | 'minimum'

export type Theme = {
  id: string
  parent_id: string | null
  author_id: string | null
  title: string
  is_group: boolean
  description: string | null
  ikr_desirable_effects: string | null
  ikr_undesirable_effects: string | null
  ikr_technical_modeling: string | null
  created_at: string
  updated_at: string
}

export type UpdateThemePayload = Partial<
  Pick<
    Theme,
    | 'title'
    | 'description'
    | 'ikr_desirable_effects'
    | 'ikr_undesirable_effects'
    | 'ikr_technical_modeling'
  >
>

/** Строки из ответа секции: типы сообщений и флаги (см. message_types API). */
export type SectionMessageTypeRule = {
  section_id: string
  message_type: string
  allow_comments: boolean
}

export type ThemeSection = {
  /** В API может приходить как `id`. */
  section_id: string
  /** В API может приходить как `code`. */
  section_code: string
  /** Опционально: правила постов/задач по типам для этой секции. */
  message_types?: SectionMessageTypeRule[]
}

export type ThemeWithSections = {
  theme: Theme
  sections: ThemeSection[]
}

export type CreateThemePayload = {
  parent_id: string | null
  title: string
  is_group: boolean
  tech_version: TechVersion
}
