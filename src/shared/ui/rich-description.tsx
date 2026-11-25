import type { ReactNode } from 'react'

const colorOpenPattern = /^\{color:(#[\da-f]{3,8}|[a-z]+)\}/i

function findColorClose(text: string, start: number) {
  const tokenPattern = /\{color:(#[\da-f]{3,8}|[a-z]+)\}|\{\/color\}/gi
  tokenPattern.lastIndex = start
  let depth = 1

  for (const match of text.matchAll(tokenPattern)) {
    const index = match.index ?? 0
    if (index < start) continue
    if (match[0].toLowerCase() === '{/color}') {
      depth -= 1
      if (depth === 0) return index
    } else {
      depth += 1
    }
  }

  return -1
}

function findSingleAsteriskClose(text: string, start: number) {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] !== '*') continue
    if (text[index - 1] === '*' || text[index + 1] === '*') continue
    return index
  }
  return -1
}

function inlineParts(text: string, keyPrefix = 'inline'): ReactNode[] {
  const parts: ReactNode[] = []
  let cursor = 0
  let plainStart = 0

  const pushPlainText = (end: number) => {
    if (end > plainStart) parts.push(text.slice(plainStart, end))
  }
  const pushFormatted = (end: number, node: (key: string) => ReactNode) => {
    pushPlainText(cursor)
    parts.push(node(`${keyPrefix}-${parts.length}`))
    cursor = end
    plainStart = end
  }

  while (cursor < text.length) {
    const rest = text.slice(cursor)

    const colorOpen = rest.match(colorOpenPattern)
    if (colorOpen) {
      const contentStart = cursor + colorOpen[0].length
      const contentEnd = findColorClose(text, contentStart)
      if (contentEnd >= contentStart) {
        const color = colorOpen[1]
        const end = contentEnd + '{/color}'.length
        pushFormatted(end, (key) => (
          <span key={key} style={{ color }}>
            {inlineParts(text.slice(contentStart, contentEnd), key)}
          </span>
        ))
        continue
      }
    }

    if (rest.startsWith('**')) {
      const close = text.indexOf('**', cursor + 2)
      if (close > cursor + 2) {
        const end = close + 2
        pushFormatted(end, (key) => <strong key={key}>{inlineParts(text.slice(cursor + 2, close), key)}</strong>)
        continue
      }
    }

    if (rest.startsWith('__')) {
      const close = text.indexOf('__', cursor + 2)
      if (close > cursor + 2) {
        const end = close + 2
        pushFormatted(end, (key) => <u key={key}>{inlineParts(text.slice(cursor + 2, close), key)}</u>)
        continue
      }
    }

    if (text[cursor] === '*' && text[cursor + 1] !== '*') {
      const close = findSingleAsteriskClose(text, cursor + 1)
      if (close > cursor + 1) {
        const end = close + 1
        pushFormatted(end, (key) => <em key={key}>{inlineParts(text.slice(cursor + 1, close), key)}</em>)
        continue
      }
    }

    const internalLink = rest.match(/^\[\[([^|\]]+)\|(\/[^\]]*)\]\]/)
    if (internalLink) {
      const end = cursor + internalLink[0].length
      pushFormatted(end, (key) => (
        <a key={key} className="rich-description__internal-link" href={internalLink[2]}>
          {internalLink[1]}
        </a>
      ))
      continue
    }

    const externalLink = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (externalLink) {
      const end = cursor + externalLink[0].length
      const url = externalLink[2].trim()
      if (/^https?:\/\//i.test(url)) {
        pushFormatted(end, (key) => (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer">
            {externalLink[1]}
          </a>
        ))
        continue
      }
    }

    cursor += 1
  }

  pushPlainText(text.length)
  return parts
}

export function RichDescription({ value }: { value: string }) {
  const blocks: ReactNode[] = []
  const paragraph: string[] = []
  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(<p key={blocks.length}>{inlineParts(paragraph.join('\n'), `paragraph-${blocks.length}`)}</p>)
    paragraph.length = 0
  }

  for (const line of value.split('\n')) {
    const heading = line.match(/^(#{1,2})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      blocks.push(heading[1].length === 1
        ? <h2 key={blocks.length}>{inlineParts(heading[2], `heading-${blocks.length}`)}</h2>
        : <h3 key={blocks.length}>{inlineParts(heading[2], `heading-${blocks.length}`)}</h3>)
    } else if (line.trim()) {
      paragraph.push(line)
    } else {
      flushParagraph()
    }
  }
  flushParagraph()

  return (
    <div className="rich-description">
      {blocks}
    </div>
  )
}
