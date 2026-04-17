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

export type ThemeSection = {
  section_id: string
  section_code: string
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
