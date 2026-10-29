import type { ReactNode } from 'react'

function inlineParts(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    if (match[1]) {
      parts.push(<strong key={index}>{match[1]}</strong>)
    } else {
      const url = match[3].trim()
      if (/^https?:\/\//i.test(url)) {
        parts.push(<a key={index} href={url} target="_blank" rel="noopener noreferrer">{match[2]}</a>)
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
