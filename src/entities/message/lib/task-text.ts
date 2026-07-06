/** Заголовок и описание задачи хранятся в одном поле `text` (первая строка — название). */

export function formatTaskText(title: string, description: string) {
  const t = title.trim()
  const d = description.trim()
  if (!t) {
    return d || null
  }
  if (!d) {
    return t
  }
  return `${t}\n\n${d}`
}

export function parseTaskText(text: string | null) {
  const raw = (text ?? '').trim()
  if (!raw) {
    return { title: '', description: '' }
  }
  const nl = raw.indexOf('\n')
  if (nl === -1) {
    return { title: raw, description: '' }
  }
  const title = raw.slice(0, nl).trim()
  const description = raw.slice(nl + 1).trim()
  return { title, description }
}
