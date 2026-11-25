import type { ReactNode } from 'react'

function inlineParts(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /\*\*(.+?)\*\*|(?<!\*)\*([^*]+)\*|__([^_]+)__|\{color:(#[\da-f]{3,8}|[a-z]+)\}([\s\S]+?)\{\/color\}|\[\[([^|\]]+)\|(\/[^\]]*)\]\]|\[([^\]]+)\]\(([^)]+)\)/gi
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    if (match[1]) {
      parts.push(<strong key={index}>{match[1]}</strong>)
    } else if (match[2]) {
      parts.push(<em key={index}>{match[2]}</em>)
    } else if (match[3]) {
      parts.push(<u key={index}>{match[3]}</u>)
    } else if (match[4] && match[5]) {
      parts.push(<span key={index} style={{ color: match[4] }}>{match[5]}</span>)
    } else if (match[6] && match[7]) {
      parts.push(<a key={index} className="rich-description__internal-link" href={match[7]}>{match[6]}</a>)
    } else {
      const label = match[8]
      const url = match[9].trim()
      if (/^https?:\/\//i.test(url)) {
        parts.push(<a key={index} href={url} target="_blank" rel="noopener noreferrer">{label}</a>)
      } else {
        parts.push(match[0])
      }
    }
    last = index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function RichDescription({ value }: { value: string }) {
  const blocks: ReactNode[] = []
  const paragraph: string[] = []
  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(<p key={blocks.length}>{inlineParts(paragraph.join('\n'))}</p>)
    paragraph.length = 0
  }

  for (const line of value.split('\n')) {
    const heading = line.match(/^(#{1,2})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      blocks.push(heading[1].length === 1
        ? <h2 key={blocks.length}>{inlineParts(heading[2])}</h2>
        : <h3 key={blocks.length}>{inlineParts(heading[2])}</h3>)
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
