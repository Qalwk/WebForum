export type TechVersion = 'full' | 'minimum'

export type Theme = {
  id: string
  parent_id: string | null
  author_id: string | null
  title: string
  is_group: boolean
  created_at: string
  updated_at: string
}

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
