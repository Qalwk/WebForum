import { useEffect, useRef, useState } from 'react'

type ExpandableTextProps = {
  text: string
  className?: string
}

export function ExpandableText({ text, className = '' }: ExpandableTextProps) {
  const contentRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)

  useEffect(() => {
    const content = contentRef.current
    if (!content || expanded) return

    const measure = () => setCanExpand(content.scrollHeight > content.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [expanded, text])

  return (
    <div className="expandable-text">
      <p
        ref={contentRef}
        className={`${className} expandable-text__body${expanded ? ' expandable-text__body--open' : ''}`}
      >
        {text}
      </p>
      {canExpand ? (
        <button
          className="expandable-text__toggle"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Свернуть' : 'Читать далее'}
        </button>
      ) : null}
    </div>
  )
}
