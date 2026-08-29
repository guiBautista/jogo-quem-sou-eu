import { useEffect, useRef, useState } from 'react'

/**
 * Screen Wake Lock API: impede a tela de apagar durante a partida.
 * Reativa sozinho quando a aba volta a ficar visível (o lock é solto pelo SO).
 */
export function useWakeLock(active) {
  const sentinelRef = useRef(null)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined

    let cancelled = false

    const request = async () => {
      if (document.visibilityState !== 'visible' || sentinelRef.current) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          sentinel.release().catch(() => {})
          return
        }
        sentinelRef.current = sentinel
        setHeld(true)
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null
          setHeld(false)
        })
      } catch {
        // Negado (bateria baixa, aba em background, permissão): o jogo segue normal.
        setHeld(false)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
      setHeld(false)
    }
  }, [active])

  return { supported: typeof navigator !== 'undefined' && 'wakeLock' in navigator, held }
}
