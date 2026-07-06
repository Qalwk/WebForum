import { requestJson } from '../../../shared/api/http-client'
import {
  normalizeCommentMessagePayload,
  normalizePostMessagePayload,
  normalizeTaskMessagePayload,
} from '../lib/normalize-message-author-fields'
import type {
  CommentMessageResponse,
  CreateCommentRequest,
  CreatePostRequest,
  CreateTaskAssignmentRequest,
  CreateTaskRequest,
  IdResponse,
  MessageAIImproveTextRequest,
  MessageAIImproveTextResponse,
  MessageReactionResponse,
  MessageReactionStatsResponse,
  PostMessageResponse,
  TaskAssignmentResponse,
  TaskMessageResponse,
  UpsertMessageReactionRequest,
} from '../model/types'

export type {
  PostMessageResponse,
  TaskMessageResponse,
  CommentMessageResponse,
} from '../model/types'

/**
 * Правка/удаление поста, задачи, комментария в публичном OpenAPI 1.0.0 нет
 * (только реакция PATCH). Когда бэк добавит — расширить clients здесь.
 */

function buildQuery(
  params: Record<string, string | number | undefined | null>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }
    search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

type ListQuery = {
  limit?: number
  offset?: number
}

export async function getPosts(
  themeId: string,
  sectionId: string,
  token: string,
  list?: ListQuery,
) {
  const rows = await requestJson<PostMessageResponse[]>(
    `/messages/posts${buildQuery({
      theme_id: themeId,
      section_id: sectionId,
      limit: list?.limit,
      offset: list?.offset,
    })}`,
    { token },
  )
  return rows.map(normalizePostMessagePayload)
}

export function createPost(
  themeId: string,
  sectionId: string,
  body: CreatePostRequest,
  token: string,
) {
  return requestJson<IdResponse>(`/messages/posts${buildQuery({
    theme_id: themeId,
    section_id: sectionId,
  })}`, {
    method: 'POST',
    token,
    body,
  })
}

export async function getPostById(postId: string, token: string) {
  const row = await requestJson<PostMessageResponse>(
    `/messages/posts/${postId}${buildQuery({ post_id: postId })}`,
    { token },
  )
  return normalizePostMessagePayload(row)
}

export async function getTasks(
  themeId: string,
  sectionId: string,
  token: string,
  list?: ListQuery,
) {
  const rows = await requestJson<TaskMessageResponse[]>(
    `/messages/tasks${buildQuery({
      theme_id: themeId,
      section_id: sectionId,
      limit: list?.limit,
      offset: list?.offset,
    })}`,
    { token },
  )
  return rows.map(normalizeTaskMessagePayload)
}

export function createTask(
  themeId: string,
  sectionId: string,
  body: CreateTaskRequest,
  token: string,
) {
  return requestJson<IdResponse>(`/messages/tasks${buildQuery({
    theme_id: themeId,
    section_id: sectionId,
  })}`, {
    method: 'POST',
    token,
    body,
  })
}

export async function getTaskById(taskId: string, token: string) {
  const row = await requestJson<TaskMessageResponse>(
    `/messages/tasks/${taskId}${buildQuery({ task_id: taskId })}`,
    { token },
  )
  return normalizeTaskMessagePayload(row)
}

export function upsertMessageReaction(
  messageId: string,
  body: UpsertMessageReactionRequest,
  token: string,
) {
  return requestJson<MessageReactionResponse>(
    `/messages/${messageId}/reaction${buildQuery({ message_id: messageId })}`,
    {
      method: 'PATCH',
      token,
      body,
    },
  )
}

export function getMessageReactionStats(messageId: string, token: string) {
  return requestJson<MessageReactionStatsResponse>(
    `/messages/${messageId}/reactions${buildQuery({ message_id: messageId })}`,
    { token },
  )
}

export async function getComments(
  contentId: string,
  parentMessageId: string,
  token: string,
  list?: ListQuery,
) {
  const rows = await requestJson<CommentMessageResponse[]>(
    `/messages/${contentId}/comments${buildQuery({
      message_id: parentMessageId,
      limit: list?.limit,
      offset: list?.offset,
    })}`,
    { token },
  )
  return rows.map(normalizeCommentMessagePayload)
}

export function createComment(
  contentId: string,
  themeId: string,
  sectionId: string,
  parentMessageId: string,
  body: CreateCommentRequest,
  token: string,
) {
  return requestJson<IdResponse>(`/messages/${contentId}/comments${buildQuery({
    theme_id: themeId,
    section_id: sectionId,
    message_id: parentMessageId,
  })}`, {
    method: 'POST',
    token,
    body,
  })
}

export async function getCommentById(commentId: string, token: string) {
  const row = await requestJson<CommentMessageResponse>(
    `/messages/comments/${commentId}${buildQuery({ comment_id: commentId })}`,
    { token },
  )
  return normalizeCommentMessagePayload(row)
}

export function getTaskAssignments(
  taskId: string,
  token: string,
  list?: ListQuery,
) {
  return requestJson<TaskAssignmentResponse[]>(
    `/messages/tasks/${taskId}/assignments${buildQuery({
      limit: list?.limit,
      offset: list?.offset,
    })}`,
    { token },
  )
}

export function createTaskAssignment(
  taskId: string,
  themeId: string,
  sectionId: string,
  body: CreateTaskAssignmentRequest,
  token: string,
) {
  return requestJson<IdResponse>(
    `/messages/tasks/${taskId}/assignment${buildQuery({
      theme_id: themeId,
      section_id: sectionId,
    })}`,
    {
      method: 'POST',
      token,
      body,
    },
  )
}

export function getTaskAssignmentById(assignmentId: string, token: string) {
  return requestJson<TaskAssignmentResponse>(
    `/messages/tasks/assignments/${assignmentId}${buildQuery({
      task_assignment_id: assignmentId,
    })}`,
    { token },
  )
}

export function improveMessageText(
  themeId: string,
  sectionId: string,
  body: MessageAIImproveTextRequest,
  token: string,
) {
  return requestJson<MessageAIImproveTextResponse>(
    `/messages/ai/improve_text${buildQuery({
      theme_id: themeId,
      section_id: sectionId,
    })}`,
    {
      method: 'POST',
      token,
      body,
    },
  )
}
