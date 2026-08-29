import { Crown, Home, Medal, RotateCw, Trophy } from 'lucide-react'
import { Avatar, Button, Screen } from './ui.jsx'
import { ranking } from '../game/logic.js'

const PODIUM_STYLE = [
  { height: 'h-28', ring: 'ring-amber-400/60', bar: 'from-amber-400/30 to-amber-400/5', text: 'text-amber-300' },
  { height: 'h-20', ring: 'ring-slate-300/50', bar: 'from-slate-300/25 to-slate-300/5', text: 'text-slate-200' },
  { height: 'h-14', ring: 'ring-orange-500/50', bar: 'from-orange-500/25 to-orange-500/5', text: 'text-orange-300' },
]

export default function ResultsScreen({ state, myId, isHost, onNewRound, onBackToLobby }) {
  const board = ranking(state)
  const podium = board.slice(0, 3)
  const rest = board.slice(3)
  // Ordem do pódio na tela: 2º, 1º, 3º.
  const podiumLayout = [podium[1], podium[0], podium[2]].filter(Boolean)

  return (
    <Screen>
      <div className="pt-safe pb-safe flex h-full flex-col px-5">
        <header className="shrink-0 py-4 text-center">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-amber-400" />
          <h1 className="text-2xl font-black">Fim da rodada {state.round}</h1>
          <p className="mt-1 text-xs text-slate-500">Pontuação acumulada</p>
        </header>

        <section className="flex shrink-0 items-end justify-center gap-2">
          {podiumLayout.map((p) => {
            const place = board.indexOf(p)
            const style = PODIUM_STYLE[place] ?? PODIUM_STYLE[2]
            return (
              <div key={p.id} className="animate-pop flex w-1/3 flex-col items-center">
                <Avatar name={p.name} className={`mb-2 h-12 w-12 text-base ring-2 ${style.ring}`} />
                <span className="max-w-full truncate text-xs font-bold text-slate-200">
                  {p.name}
                </span>
                <span className={`text-lg font-black ${style.text}`}>{p.score}</span>
                <div
                  className={`mt-1 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b pt-1.5 ${style.bar} ${style.height}`}
                >
                  <span className={`text-xl font-black ${style.text}`}>{place + 1}º</span>
                </div>
              </div>
            )
          })}
        </section>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          <ul className="space-y-2 pb-4">
            {(rest.length ? rest : []).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5"
              >
                <span className="w-5 text-center text-sm font-black text-slate-500">
                  {board.indexOf(p) + 1}º
                </span>
                <Avatar name={p.name} className="h-8 w-8 text-xs" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
                <span className="text-sm font-black text-slate-300">{p.score}</span>
              </li>
            ))}

            <li className="pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <Medal className="h-3.5 w-3.5" />
                Quem era quem
              </p>
              <ul className="space-y-2">
                {state.finishOrder.map((id, i) => {
                  const p = state.players.find((pl) => pl.id === id)
                  if (!p) return null
                  return (
                    <li
                      key={id}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${
                        id === myId
                          ? 'border-indigo-500/40 bg-indigo-500/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <span className="w-5 text-center text-sm font-black text-slate-500">
                        {i + 1}º
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{p.name}</span>
                        <span className="block truncate text-xs text-slate-400">
                          {state.characters[id]}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-300">
                        +{state.roundPoints[id] ?? 0}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        </div>

        <footer className="shrink-0 space-y-3 pt-2 pb-5">
          {isHost ? (
            <>
              <Button onClick={onNewRound}>
                <RotateCw className="h-5 w-5" />
                Nova rodada
              </Button>
              <Button variant="ghost" onClick={onBackToLobby} className="py-3 text-sm">
                <Home className="h-4 w-4" />
                Voltar ao lobby
              </Button>
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-sm text-slate-400">
              <Crown className="h-4 w-4 text-amber-400" />
              Aguardando o host iniciar a próxima rodada…
            </p>
          )}
        </footer>
      </div>
    </Screen>
  )
}
