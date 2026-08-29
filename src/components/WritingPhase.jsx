import { useEffect, useRef, useState } from 'react'
import { Check, Eye, Hourglass, ImageOff, ImagePlus, Loader2, PencilLine, Send, X } from 'lucide-react'
import { Avatar, Button, Screen, TextInput } from './ui.jsx'
import { CHARACTER_MAX_LENGTH, getPlayer } from '../game/logic.js'
import { searchImages } from '../net/imageSearch.js'

export default function WritingPhase({ state, myId, onSubmit }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [results, setResults] = useState(null) // null = ainda não buscou
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const targetId = state.targets[myId]
  const target = targetId ? getPlayer(state, targetId) : null
  const alreadySent = Boolean(targetId && state.characters[targetId])

  const authors = Object.keys(state.targets)
  const doneCount = authors.filter((a) => state.characters[state.targets[a]]).length
  const progress = authors.length ? Math.round((doneCount / authors.length) * 100) : 0

  // Trocar o nome invalida a imagem: ninguém quer mandar o Pelé com o rótulo Neymar.
  const changeText = (value) => {
    setText(value.slice(0, CHARACTER_MAX_LENGTH))
    if (results !== null || image) {
      abortRef.current?.abort()
      setResults(null)
      setImage(null)
      setSearchError(null)
      setSearching(false)
    }
  }

  const runSearch = async () => {
    const term = text.trim()
    if (term.length < 2) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setSearching(true)
    setSearchError(null)
    try {
      setResults(await searchImages(term, controller.signal))
    } catch (err) {
      if (err.name === 'AbortError') return
      setSearchError('Não deu para buscar agora. Você pode enviar sem imagem.')
      setResults([])
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }

  const submit = () => {
    if (text.trim().length < 2) return
    abortRef.current?.abort()
    onSubmit(text, image)
    setText('')
    setImage(null)
    setResults(null)
    setSearchError(null)
  }

  const header = (
    <header className="pt-safe shrink-0 pb-4">
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

  const canSearch = text.trim().length >= 2

  return (
    <Screen>
      <div className="pb-safe flex h-full flex-col overflow-y-auto px-5">
        {header}

        <div className="flex flex-1 flex-col justify-center py-2">
          <div className="animate-fade-up text-center">
            <PencilLine className="mx-auto mb-3 h-7 w-7 text-indigo-400" />
            <p className="text-sm text-slate-400">Escolha um personagem para</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <Avatar name={target.name} className="h-11 w-11 text-base" />
              <span className="text-3xl font-black text-white">{target.name}</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Pode ser pessoa real, personagem, animal ou objeto. Não conte para ninguém!
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <TextInput
              value={text}
              onChange={(e) => changeText(e.target.value)}
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

          {/* Imagem é opcional: nada aqui bloqueia o envio */}
          <div className="mt-4">
            {results === null ? (
              <button
                type="button"
                onClick={runSearch}
                disabled={!canSearch || searching}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3.5 text-sm font-bold text-slate-300 transition active:bg-white/5 disabled:opacity-30"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando imagens…
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    Adicionar imagem (opcional)
                  </>
                )}
              </button>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-center">
                <p className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <ImageOff className="h-4 w-4" />
                  {searchError ?? `Nenhuma imagem encontrada para "${text.trim()}".`}
                </p>
                <button
                  type="button"
                  onClick={runSearch}
                  className="mt-2 text-xs font-bold text-indigo-400 underline-offset-2 active:underline"
                >
                  Tentar de novo
                </button>
              </div>
            ) : (
              <div className="animate-fade-up">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Escolha uma
                  </p>
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-400 active:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  )}
                </div>
                <ul className="grid grid-cols-3 gap-2">
                  {results.map((item) => {
                    const selected = image === item.url
                    return (
                      <li key={item.url}>
                        <button
                          type="button"
                          onClick={() => setImage(selected ? null : item.url)}
                          className={`relative block w-full overflow-hidden rounded-xl border-2 transition ${
                            selected
                              ? 'border-indigo-400 ring-2 ring-indigo-500/40'
                              : 'border-white/10 active:border-white/25'
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            loading="lazy"
                            className="aspect-square w-full bg-slate-900 object-cover"
                            onError={() =>
                              setResults((prev) => prev.filter((r) => r.url !== item.url))
                            }
                          />
                          {selected && (
                            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
                              <Check className="h-3 w-3 text-white" />
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2 text-center text-xs text-slate-600">
                  Toque para escolher · pode enviar sem imagem
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="shrink-0 pt-4 pb-6">
          <Button onClick={submit} disabled={text.trim().length < 2}>
            <Send className="h-5 w-5" />
            Confirmar personagem
          </Button>
        </footer>
      </div>
    </Screen>
  )
}
