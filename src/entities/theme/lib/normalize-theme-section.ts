import type { SectionMessageTypeRule, ThemeSection } from '../model/types'

/**
 * GET /themes/{id}/sections может отдавать `id`/`code` и вложенные `message_types`
 * (как в вашем примере ответа бэкенда).
 */
export function normalizeThemeSection(raw: unknown): ThemeSection {
  if (!raw || typeof raw !== 'object') {
    return { section_id: '', section_code: '' }
  }

  const r = raw as Record<string, unknown>
  const sectionIdRaw = r.section_id ?? r.id
  const sectionCodeRaw = r.section_code ?? r.code
  const sectionId = typeof sectionIdRaw === 'string' ? sectionIdRaw : ''
  const sectionCode = typeof sectionCodeRaw === 'string' ? sectionCodeRaw : ''

  let message_types: SectionMessageTypeRule[] | undefined
  if (Array.isArray(r.message_types)) {
    message_types = r.message_types
      .map((item): SectionMessageTypeRule | null => {
        if (!item || typeof item !== 'object') {
          return null
        }
        const m = item as Record<string, unknown>
        const sidRaw = m.section_id
        const mtRaw = m.message_type
        const sid = typeof sidRaw === 'string' ? sidRaw : sectionId
        const message_type = typeof mtRaw === 'string' ? mtRaw : 'post'
        const allow_comments = m.allow_comments === true
        return { section_id: sid, message_type, allow_comments }
      })
      .filter((x): x is SectionMessageTypeRule => x !== null)
  }

  const base: ThemeSection = { section_id: sectionId, section_code: sectionCode }
  if (message_types?.length) {
    base.message_types = message_types
  }
  return base
}
