import { useState } from 'react'
import { ArrowLeft, ArrowRight, BrainCircuit, DoorOpen, PlusCircle } from 'lucide-react'
import { Button, Field, Screen, TextInput } from './ui.jsx'
import { normalizeCode } from '../net/protocol.js'
import { NAME_MAX_LENGTH } from '../game/logic.js'

export default function HomeScreen({ onCreate, onJoin, busy, initialCode = '' }) {
  const [mode, setMode] = useState(initialCode ? 'join' : null) // null | 'create' | 'join'
  const [name, setName] = useState(() => localStorage.getItem('qsemu:name') || '')
  const [code, setCode] = useState(initialCode)

  const remember = () => localStorage.setItem('qsemu:name', name.trim())
  const nameOk = name.trim().length >= 2
  const codeOk = code.length >= 4

  const submit = () => {
    if (!nameOk) return
    remember()
    if (mode === 'create') onCreate(name)
    else if (codeOk) onJoin(code, name)
  }

  return (
    <Screen>
      <div className="pt-safe pb-safe flex h-full flex-col justify-between overflow-y-auto px-6">
        <header className="flex flex-col items-center pt-10 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-2xl shadow-indigo-900/50">
            <BrainCircuit className="h-11 w-11 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Quem sou eu?</h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
            Cada um escolhe um personagem para o próximo jogador. Segure o celular na testa e
            descubra quem você é.
          </p>
        </header>

        <main className="animate-fade-up my-8 space-y-4">
          <Field label="Seu nome">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX_LENGTH))}
              placeholder="Como te chamam?"
              autoComplete="nickname"
              enterKeyHint={mode === 'join' ? 'next' : 'go'}
              maxLength={NAME_MAX_LENGTH}
            />
          </Field>

          {mode === 'join' && (
            <div className="animate-fade-up">
              <Field label="Código da sala" hint="5 letras e números, sem diferenciar maiúsculas.">
                <TextInput
                  value={code}
                  onChange={(e) => setCode(normalizeCode(e.target.value).slice(0, 5))}
                  placeholder="ABC12"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  enterKeyHint="go"
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  className="text-center text-2xl font-black tracking-[0.4em] uppercase"
                />
              </Field>
            </div>
          )}
        </main>

        <footer className="space-y-3 pb-6">
          {mode === null && (
            <>
              <Button onClick={() => setMode('create')} disabled={!nameOk}>
                <PlusCircle className="h-5 w-5" />
                Criar sala
              </Button>
              <Button variant="ghost" onClick={() => setMode('join')} disabled={!nameOk}>
                <DoorOpen className="h-5 w-5" />
                Entrar em uma sala
              </Button>
              {!nameOk && (
                <p className="pt-1 text-center text-xs text-slate-500">
                  Digite seu nome para continuar.
                </p>
              )}
            </>
          )}

          {mode !== null && (
            <>
              <Button
                onClick={submit}
                loading={busy}
                disabled={!nameOk || (mode === 'join' && !codeOk)}
                variant={mode === 'create' ? 'primary' : 'success'}
              >
                {mode === 'create' ? 'Criar minha sala' : 'Entrar na sala'}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>
                <ArrowLeft className="h-5 w-5" />
                Voltar
              </Button>
            </>
          )}
        </footer>
      </div>
    </Screen>
  )
}
