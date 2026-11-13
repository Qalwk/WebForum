export type SectionMediaFile = {
  media_file_id: string
  sort_order: number
  original_filename: string | null
  file_size: number
  mime_type: string
  extension: string
  url: string
}

export type SectionResponse = {
  id: string
  code: string
  description: string | null
  message_types: unknown[]
  media_files: SectionMediaFile[]
}

export type UpdateSectionPayload = {
  description?: string
  media_file_ids?: string[]
}
