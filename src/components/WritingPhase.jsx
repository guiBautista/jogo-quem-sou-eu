import { useState } from 'react'
import { Check, Eye, Hourglass, PencilLine, Send } from 'lucide-react'
import { Avatar, Button, Screen, TextInput } from './ui.jsx'
import { CHARACTER_MAX_LENGTH, getPlayer } from '../game/logic.js'

export default function WritingPhase({ state, myId, onSubmit }) {
  const [text, setText] = useState('')
  const targetId = state.targets[myId]
  const target = targetId ? getPlayer(state, targetId) : null
  const alreadySent = Boolean(targetId && state.characters[targetId])

  const authors = Object.keys(state.targets)
  const doneCount = authors.filter((a) => state.characters[state.targets[a]]).length
  const progress = authors.length ? Math.round((doneCount / authors.length) * 100) : 0

  const submit = () => {
    if (text.trim().length < 2) return
    onSubmit(text)
    setText('')
  }

  const header = (
    <header className="pt-safe pb-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
        Rodada {state.round} · Escolha secreta
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {doneCount} de {authors.length} já escolheram
      </p>
    </header>
  )

  if (!target) {
    return (
      <Screen>
        <div className="pb-safe flex h-full flex-col px-5">
          {header}
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Eye className="h-12 w-12 text-slate-600" />
            <p className="max-w-xs text-slate-400">
              Você está assistindo esta rodada. Entra na próxima!
            </p>
          </div>
        </div>
      </Screen>
    )
  }

  if (alreadySent) {
    return (
      <Screen>
        <div className="pb-safe flex h-full flex-col px-5">
          {header}
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div className="animate-pop flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20">
              <Check className="h-10 w-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black">Personagem enviado!</h2>
              <p className="mt-1 text-sm text-slate-400">
                Você definiu quem <span className="font-bold text-white">{target.name}</span> vai ser.
              </p>
            </div>
          </div>

          <div className="pb-6">
            <p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <Hourglass className="h-3.5 w-3.5" />
              Faltam
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {authors.map((authorId) => {
                const done = Boolean(state.characters[state.targets[authorId]])
                const author = getPlayer(state, authorId)
                if (!author) return null
                return (
                  <li
                    key={authorId}
                    className={`flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm font-semibold ${
                      done
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <Avatar name={author.name} className="h-6 w-6 text-[10px]" />
                    {author.name}
                    {done && <Check className="h-3.5 w-3.5" />}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="pb-safe flex h-full flex-col overflow-y-auto px-5">
        {header}

        <div className="flex flex-1 flex-col justify-center py-4">
          <div className="animate-fade-up text-center">
            <PencilLine className="mx-auto mb-4 h-8 w-8 text-indigo-400" />
            <p className="text-sm text-slate-400">Escolha um personagem para</p>
            <div className="mt-3 mb-1 flex items-center justify-center gap-3">
              <Avatar name={target.name} className="h-12 w-12 text-base" />
              <span className="text-3xl font-black text-white">{target.name}</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Pode ser pessoa real, personagem, animal ou objeto. Não conte para ninguém!
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <TextInput
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, CHARACTER_MAX_LENGTH))}
              placeholder="Ex.: Homem-Aranha"
              maxLength={CHARACTER_MAX_LENGTH}
              autoFocus
              enterKeyHint="send"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="text-center text-lg font-bold"
            />
            <p className="text-right text-xs text-slate-600">
              {text.length}/{CHARACTER_MAX_LENGTH}
            </p>
          </div>
        </div>

        <footer className="pb-6">
          <Button onClick={submit} disabled={text.trim().length < 2}>
            <Send className="h-5 w-5" />
            Confirmar personagem
          </Button>
        </footer>
      </div>
    </Screen>
  )
}
