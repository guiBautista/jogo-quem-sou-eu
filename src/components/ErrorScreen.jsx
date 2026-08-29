import { PlugZap, RotateCcw } from 'lucide-react'
import { Button, Screen } from './ui.jsx'

export default function ErrorScreen({ error, onRetry }) {
  return (
    <Screen>
      <div className="pt-safe pb-safe flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="animate-pop flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/15 ring-4 ring-rose-500/20">
          <PlugZap className="h-10 w-10 text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Ops, algo deu errado</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{error.message}</p>
        </div>
        <div className="w-full max-w-xs">
          <Button onClick={onRetry}>
            <RotateCcw className="h-5 w-5" />
            Voltar ao início
          </Button>
        </div>
      </div>
    </Screen>
  )
}
