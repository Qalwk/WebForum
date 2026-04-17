const KNOWN_THEME_IDS_STORAGE_KEY = 'webforum_known_theme_ids'

function parseThemeIds(value: string | null) {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

export function getKnownThemeIds() {
  if (typeof window === 'undefined') {
    return []
  }

  return parseThemeIds(window.localStorage.getItem(KNOWN_THEME_IDS_STORAGE_KEY))
}

export function saveKnownThemeIds(themeIds: string[]) {
  if (typeof window === 'undefined') {
    return
  }

  const uniqueThemeIds = Array.from(new Set(themeIds))
  window.localStorage.setItem(
    KNOWN_THEME_IDS_STORAGE_KEY,
    JSON.stringify(uniqueThemeIds),
  )
}

export function addKnownThemeId(themeId: string) {
  const themeIds = getKnownThemeIds()
  saveKnownThemeIds([...themeIds, themeId])
}
