import { getPosts } from '../../message/api/messages-api'
import {
  type IkrSubsectionCode,
  IKR_SUBSECTION_CODES,
} from './section-routing'
import type { ThemeSection } from '../model/types'

export type IkrSubsectionFilled = Record<IkrSubsectionCode, boolean>

/**
 * Считает строки по переносам (как экран предпросмотра «не более N строк»).
 */
export function countTextLines(text: string | null | undefined): number {
  if (!text?.trim()) {
    return 0
  }
  return text.split(/\r?\n/).length
}

export async function fetchIkrSubsectionsFilled(
  themeId: string,
  sections: ThemeSection[],
  token: string,
): Promise<IkrSubsectionFilled> {
  const byCode = new Map(sections.map((s) => [s.section_code, s.section_id]))

  const next = {
    desirable_effects: false,
    technical_modeling: false,
    undesirable_effects: false,
  } as IkrSubsectionFilled

  await Promise.all(
    IKR_SUBSECTION_CODES.map(async (code) => {
      const sectionId = byCode.get(code)
      if (!sectionId) {
        return
      }
      try {
        const posts = await getPosts(themeId, sectionId, token, {
          limit: 1,
          offset: 0,
        })
        next[code] = posts.length > 0
      } catch {
        next[code] = false
      }
    }),
  )

  return next
}

/** Все три подраздела ИКР содержат хотя бы один пост. */
export function isIkrBlockComplete(fill: IkrSubsectionFilled): boolean {
  return IKR_SUBSECTION_CODES.every((c) => fill[c])
}
