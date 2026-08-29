import { useState } from 'react'
import { CheckCircle2, Lightbulb, PartyPopper, Zap, ZapOff } from 'lucide-react'
import { Avatar, Screen } from './ui.jsx'
import { useWakeLock } from '../hooks/useWakeLock.js'
import { getPlayer } from '../game/logic.js'
import { isAllowedImageUrl } from '../net/imageSearch.js'

export default function PlayingScreen({ state, myId, onGotIt }) {
  const { supported, held } = useWakeLock(true)
  // Se a imagem não carregar (offline, link quebrado), a rodada segue só com o nome.
  const [imageBroken, setImageBroken] = useState(false)

  const myCharacter = state.characters[myId]
  // O host valida a URL antes de repassar, mas o host é outro jogador: quem
  // renderiza confere de novo, senão um host adulterado faria o navegador de
  // todo mundo buscar o endereço que ele quisesse.
  const claimedImage = state.images?.[myId]
  const myImage = imageBroken || !isAllowedImageUrl(claimedImage) ? null : claimedImage
  const myPosition = state.finishOrder.indexOf(myId)
  const finished = myPosition !== -1
  const total = state.remaining.length + state.finishOrder.length

  // Não existe turno no app: quem descobre aperta "Acertei!" e a ordem de
  // chegada vale a pontuação. O revezamento das perguntas é na conversa.
  const status = (
    <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
      <span>Rodada {state.round}</span>
      <span>·</span>
      <span>
        {state.finishOrder.length} de {total} já acertaram
      </span>
      {supported && (
        <>
          <span>·</span>
          <span className="flex items-center gap-1">
            {held ? (
              <>
                <Zap className="h-3 w-3 text-emerald-400" />
                tela ativa
              </>
            ) : (
              <ZapOff className="h-3 w-3 text-slate-600" />
            )}
          </span>
        </>
      )}
    </div>
  )

  if (finished) {
    return (
      <Screen>
        <div className="pt-safe pb-safe flex h-full flex-col">
          <header className="shrink-0 px-5 py-3">{status}</header>

          <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="animate-pop flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/25">
              <PartyPopper className="h-12 w-12 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                {myPosition + 1}º a acertar
              </p>
              <h2 className="mt-2 text-3xl font-black">Você era</h2>
              <p className="mt-1 text-2xl font-black text-emerald-300">{myCharacter}</p>
            </div>
            {myImage && (
              <img
                src={myImage}
                alt={myCharacter}
                onError={() => setImageBroken(true)}
                className="max-h-40 w-auto rounded-2xl border border-white/10 object-contain"
              />
            )}
          </main>

          <footer className="shrink-0 px-5 pt-2 pb-6 text-center">
            <p className="mb-3 text-sm text-slate-400">
              {state.remaining.length === 1
                ? 'Falta 1 jogador para terminar a rodada.'
                : `Faltam ${state.remaining.length} jogadores para terminar a rodada.`}
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {state.remaining.map((id) => {
                const p = getPlayer(state, id)
                if (!p) return null
                return (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pr-3 pl-1.5 text-sm font-semibold text-slate-400"
                  >
                    <Avatar name={p.name} className="h-6 w-6 text-[10px]" />
                    {p.name}
                  </li>
                )
              })}
            </ul>
          </footer>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="pt-safe pb-safe flex h-full flex-col">
        <header className="shrink-0 px-5 py-3">{status}</header>

        {/* O personagem, gigante, virado para os outros lerem */}
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <Lightbulb className="h-3 w-3" />
            Encoste na testa · não olhe
          </p>

          {myImage && (
            <img
              src={myImage}
              alt=""
              onError={() => setImageBroken(true)}
              className="max-h-[44%] min-h-0 w-auto max-w-full rounded-2xl border border-white/10 object-contain"
            />
          )}

          {/* O nome é o que precisa ser lido de longe, então a imagem cede espaço a ele */}
          <h1
            className={`leading-[1.05] font-black tracking-tight break-words text-white [text-wrap:balance] ${
              myImage
                ? 'text-[clamp(1.75rem,9vw,3.25rem)]'
                : 'text-[clamp(2.25rem,12vw,4.5rem)]'
            }`}
          >
            {myCharacter || '…'}
          </h1>
        </main>

        <footer className="shrink-0 px-5 pt-2 pb-6">
          <button
            type="button"
            onClick={onGotIt}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-3xl bg-gradient-to-b from-emerald-500 to-emerald-600 py-7 text-xl font-black text-white shadow-lg shadow-emerald-950/50 transition active:from-emerald-600 active:to-emerald-700"
          >
            <CheckCircle2 className="h-8 w-8" />
            Acertei!
          </button>
          <p className="mt-3 text-center text-xs text-slate-600">
            Aperte só quando descobrir quem você é.
          </p>
        </footer>
      </div>
    </Screen>
  )
}
