/**
 * Какой экран открывать для section_code (логика MVP + OpenAPI: посты / задачи / описание / модули / ИКР).
 */
export type SectionRouteKind =
  | 'description'
  | 'project_modules'
  | 'ikr_group'
  | 'post_messages'
  | 'task_messages'

const POST_MESSAGE_CODES = new Set<string>([
  'discussion',
  'experience_exchange',
  'chat_ideas',
  'chat_qa',
  'chat_publications',
  'chat_experiments',
  'desirable_effects',
  'technical_modeling',
  'undesirable_effects',
])

const TASK_MESSAGE_CODES = new Set<string>(['chat_tasks'])

export function getSectionRouteKind(sectionCode: string): SectionRouteKind | null {
  if (sectionCode === 'description') {
    return 'description'
  }
  if (sectionCode === 'project_modules') {
    return 'project_modules'
  }
  if (sectionCode === 'perfect_result') {
    return 'ikr_group'
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

/** Подпункты «Идеального результата» (раскрывающийся блок) */
export const IKR_SUBSECTION_CODES = [
  'desirable_effects',
  'technical_modeling',
  'undesirable_effects',
] as const

export type IkrSubsectionCode = (typeof IKR_SUBSECTION_CODES)[number]
