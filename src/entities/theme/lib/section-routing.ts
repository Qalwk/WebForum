/**
 * Какой экран открывать для section_code (логика MVP + OpenAPI: посты / задачи / описание / модули / ИКР).
 */
export type SectionRouteKind =
  | 'description'
  | 'project_modules'
  | 'ikr_group'
  | 'ikr_field'
  | 'post_messages'
  | 'task_messages'

const POST_MESSAGE_CODES = new Set<string>([
  'discussion',
  'experience_exchange',
  'chat_ideas',
  'chat_qa',
  'chat_publications',
  'chat_experiments',
])

const TASK_MESSAGE_CODES = new Set<string>(['chat_tasks'])

export function getSectionRouteKind(sectionCode: string): SectionRouteKind | null {
  if (sectionCode === 'description') {
    return 'description'
  }
  if (sectionCode === 'project_modules') {
    return 'project_modules'
  }
  if (sectionCode === 'ikr') {
    return 'ikr_group'
  }
  if (IKR_FIELD_NAMES.includes(sectionCode as IkrFieldName)) {
    return 'ikr_field'
  }
  if (POST_MESSAGE_CODES.has(sectionCode)) {
    return 'post_messages'
  }
  if (TASK_MESSAGE_CODES.has(sectionCode)) {
    return 'task_messages'
  }
  return null
}

export function pathToPostChat(themeId: string, sectionId: string) {
  return `/themes/${themeId}/chats/${sectionId}/posts`
}

/** Обсуждение к посту (отдельный экран, как тред в Telegram). */
export function pathToPostComments(
  themeId: string,
  sectionId: string,
  postId: string,
) {
  return `/themes/${themeId}/chats/${sectionId}/posts/${postId}/comments`
}

export function pathToTaskChat(themeId: string, sectionId: string) {
  return `/themes/${themeId}/chats/${sectionId}/tasks`
}

/** Редактируемые поля ИКР сущности Theme. */
export const IKR_FIELD_NAMES = [
  'ikr_desirable_effects',
  'ikr_technical_modeling',
  'ikr_undesirable_effects',
] as const

export type IkrFieldName = (typeof IKR_FIELD_NAMES)[number]
