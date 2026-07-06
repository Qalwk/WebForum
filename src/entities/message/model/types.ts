/** Соответствует OpenAPI MessageTypeAPI */
export type MessageTypeApi = 'post' | 'task' | 'task_assignment' | 'comment'

export type MessageReactionTypeApi = 'like' | 'dislike'

export type MessageMediaFileData = {
  media_file_id: string
  sort_order: number
  original_filename: string
  file_size: number
  mime_type: string
  /** Расширение с точкой, например `.jpg`. */
  extension: string
  /** Публичный URL или путь вида `/static/messages/...`. */
  url: string
}

export type PostMessageResponse = {
  id: string
  type: MessageTypeApi
  text: string | null
  author_id: string
  /** Имя автора, если бэкенд отдаёт (в т.ч. во вложенном `author`). */
  first_name?: string | null
  /** Файл на статике `/static/avatars/{author_id}/{filename}`. */
  avatar_filename?: string | null
  /** Готовый URL картинки (если бэкенд отдаёт абсолютный адрес). */
  author_avatar_url?: string | null
  theme_id: string
  section_id: string
  is_openai_generated: boolean
  created_at: string
  updated_at: string
  media_files: MessageMediaFileData[]
  /** Если появится в OpenAPI — скрывать комментарии, когда false. */
  allow_comments?: boolean
}

export type CreatePostRequest = {
  text?: string | null
  is_openai_generated?: boolean
  media_file_ids?: string[]
}

export type TaskMessageResponse = {
  id: string
  type: MessageTypeApi
  text: string | null
  author_id: string
  first_name?: string | null
  avatar_filename?: string | null
  author_avatar_url?: string | null
  theme_id: string
  section_id: string
  is_openai_generated: boolean
  created_at: string
  updated_at: string
  media_files: MessageMediaFileData[]
  ratio: number
}

export type CreateTaskRequest = {
  text?: string | null
  is_openai_generated?: boolean
  media_file_ids?: string[]
  /** 1–100, обязателен в API */
  ratio: number
}

export type IdResponse = {
  id: string
}

export type MessageReactionResponse = {
  user_id: string
  message_id: string
  reaction: MessageReactionTypeApi
  updated_at: string
}

export type UpsertMessageReactionRequest = {
  reaction: MessageReactionTypeApi | null
}

export type MessageReactionStatsResponse = {
  reactions: Partial<Record<MessageReactionTypeApi, number>>
  total: number
  /** Реакция текущего пользователя, если бэкенд отдаёт в GET /reactions. */
  user_reaction?: MessageReactionTypeApi | null
}

export type CommentMessageResponse = {
  id: string
  type: MessageTypeApi
  text: string | null
  author_id: string
  /** Если бэкенд присылает — показываем вместо обрезанного UUID. */
  first_name?: string | null
  avatar_filename?: string | null
  author_avatar_url?: string | null
  theme_id: string
  section_id: string
  is_openai_generated: boolean
  created_at: string
  updated_at: string
  media_files: MessageMediaFileData[]
  content_id: string
  reply_to_message_id: string | null
}

export type CreateCommentRequest = {
  text?: string | null
  is_openai_generated?: boolean
  media_file_ids?: string[]
  reply_to_message_id?: string | null
}

export type CreateTaskAssignmentRequest = {
  text?: string | null
  is_openai_generated?: boolean
  media_file_ids?: string[]
  expires_at: string
  is_partially?: boolean
}

export type TaskAssignmentResponse = {
  id: string
  type: MessageTypeApi
  text: string | null
  author_id: string
  theme_id: string
  section_id: string
  is_openai_generated: boolean
  created_at: string
  updated_at: string
  media_files: MessageMediaFileData[]
  content_id: string
  is_partially: boolean
  status: string
  expires_at: string
}

export type MessageAIImproveTextRequest = {
  text: string
}

export type MessageAIImproveTextResponse = {
  input_text: string
  output_text: string | null
}
