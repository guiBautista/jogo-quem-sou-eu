import { useState } from 'react'
import { Check, Copy, Crown, LogOut, Play, Share2, Users, WifiOff } from 'lucide-react'
import { Avatar, Button, Screen } from './ui.jsx'
import { MIN_PLAYERS, MAX_PLAYERS } from '../net/protocol.js'

export default function Lobby({ state, myId, isHost, onStart, onLeave }) {
  const [copied, setCopied] = useState(false)
  const players = state.players
  const canStart = players.filter((p) => p.connected).length >= MIN_PLAYERS

  const shareUrl = `${window.location.origin}${window.location.pathname}?sala=${state.roomCode}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard bloqueado: o código continua visível na tela */
    }
  }

  const share = async () => {
    if (!navigator.share) return copy()
    try {
      await navigator.share({
        title: 'Quem sou eu?',
        text: `Entra na minha sala! Código: ${state.roomCode}`,
        url: shareUrl,
      })
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <Screen>
      <div className="pt-safe pb-safe flex h-full flex-col px-5">
        <header className="flex items-center justify-between py-3">
          <h1 className="text-lg font-black">Sala de espera</h1>
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 active:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </header>

        <section className="animate-pop rounded-3xl border border-indigo-500/25 bg-gradient-to-b from-indigo-500/15 to-fuchsia-500/5 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
            Código da sala
          </p>
          <p className="my-2 font-mono text-5xl font-black tracking-[0.15em] text-white">
            {state.roomCode}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={copy} className="py-3 text-sm">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar link'}
            </Button>
            <Button variant="ghost" onClick={share} className="py-3 text-sm">
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        </section>

        <div className="mt-6 mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <Users className="h-4 w-4" />
            Jogadores
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {players.length}/{MAX_PLAYERS}
          </span>
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
          {players.map((p) => (
            <li
              key={p.id}
              className={`animate-fade-up flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 ${
                p.connected ? '' : 'opacity-40'
              }`}
            >
              <Avatar name={p.name} className="h-10 w-10" />
              <span className="min-w-0 flex-1 truncate font-bold">
                {p.name}
                {p.id === myId && <span className="ml-1.5 text-xs text-indigo-400">(você)</span>}
              </span>
              {p.id === state.hostId && <Crown className="h-4 w-4 shrink-0 text-amber-400" />}
              {!p.connected && <WifiOff className="h-4 w-4 shrink-0 text-rose-400" />}
            </li>
          ))}
        </ul>

        <footer className="space-y-3 pt-2 pb-4">
          {isHost ? (
            <>
              <Button onClick={onStart} disabled={!canStart}>
                <Play className="h-5 w-5" />
                Começar jogo
              </Button>
              {!canStart && (
                <p className="text-center text-xs text-slate-500">
                  Precisa de pelo menos {MIN_PLAYERS} jogadores conectados.
                </p>
              )}
            </>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-sm text-slate-400">
              Aguardando o host começar a partida…
            </p>
          )}
        </footer>
      </div>
    </Screen>
  )
}
