import { useEffect, useState } from 'react'
import { Check, Crown, Play, Smartphone } from 'lucide-react'
import { Button, Screen } from './ui.jsx'
import { useWakeLock } from '../hooks/useWakeLock.js'
import { PHASE } from '../game/logic.js'
import { COUNTDOWN_SECONDS } from '../net/protocol.js'

/**
 * Fica entre a escolha secreta e o jogo. Sem ela o nome aparece no instante em
 * que o último jogador confirma — antes de todo mundo erguer o celular.
 */
export default function RoundStartScreen({ state, isHost, onStartRound }) {
  // Segura a tela acesa já aqui: o celular sobe para a testa na largada.
  useWakeLock(true)

  const counting = state.phase === PHASE.COUNTDOWN
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS)

  // A contagem é local em cada aparelho; a revelação vem do host.
  //
  // O número vem do tempo decorrido, não de um contador que decrementa a cada
  // tick: navegador atrasa e agrupa timers (aba em segundo plano, economia de
  // bateria), e aí um decremento por tick acumula erro e mostra "2" quando já
  // deviam ser "0". Recalculando do relógio, um tick atrasado corrige sozinho.
  useEffect(() => {
    if (!counting) {
      setRemaining(COUNTDOWN_SECONDS)
      return undefined
    }

    const startedAt = Date.now()
    const compute = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      setRemaining(Math.max(0, COUNTDOWN_SECONDS - Math.floor(elapsed)))
    }

    compute()
    const tick = setInterval(compute, 100)
    return () => clearInterval(tick)
  }, [counting])

  // Vibra a cada número: quem já está com o celular na testa não vê a tela.
  useEffect(() => {
    if (!counting) return
    navigator.vibrate?.(remaining === 0 ? [90, 60, 90] : 45)
  }, [counting, remaining])

  if (counting) {
    return (
      <Screen>
        <div className="pt-safe pb-safe flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Celular na testa
          </p>
          <p
            key={remaining}
            className={`animate-pop font-black tracking-tight ${
              remaining === 0
                ? 'text-[clamp(3.5rem,20vw,7rem)] text-emerald-400'
                : 'text-[clamp(6rem,40vw,14rem)] leading-none text-white'
            }`}
          >
            {remaining === 0 ? 'JÁ!' : remaining}
          </p>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="pt-safe pb-safe flex h-full flex-col px-6">
        <header className="pt-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Rodada {state.round}
          </p>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="animate-pop flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20">
            <Check className="h-10 w-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Todo mundo já escolheu</h1>
            <p className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-400">
              <Smartphone className="h-4 w-4" />
              Encoste o celular na testa antes da largada
            </p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500">
            Vai ter uma contagem de {COUNTDOWN_SECONDS} segundos. Os nomes só aparecem depois
            dela — ninguém precisa correr.
          </p>
        </main>

        <footer className="pb-6">
          {isHost ? (
            <Button onClick={onStartRound}>
              <Play className="h-5 w-5" />
              Iniciar partida
            </Button>
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-sm text-slate-400">
              <Crown className="h-4 w-4 text-amber-400" />
              Aguardando o host dar a largada…
            </p>
          )}
        </footer>
      </div>
    </Screen>
  )
}
