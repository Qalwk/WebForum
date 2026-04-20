import { useEffect, useRef } from 'react'
import { getTelegramWebApp } from '../lib/telegram-web-app'

export function useTelegramBackButton(visible: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    const back = getTelegramWebApp()?.BackButton

    if (!back) {
      return
    }

    if (!visible) {
      back.hide()
      return
    }

    const handler = () => {
      onBackRef.current()
    }

    back.show()
    back.onClick(handler)

    return () => {
      back.offClick(handler)
      back.hide()
    }
  }, [visible])
}
