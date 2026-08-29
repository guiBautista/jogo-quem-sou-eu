import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-950/50 active:from-indigo-600 active:to-indigo-700',
  success:
    'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-950/50 active:from-emerald-600 active:to-emerald-700',
  ghost: 'bg-white/5 text-slate-200 border border-white/10 active:bg-white/10',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 active:bg-rose-500/25',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  loading = false,
  disabled,
  ...rest
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-bold transition
        disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none
        ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </button>
  )
}

export function Screen({ children, className = '' }) {
  return (
    <div className={`h-screen-safe overflow-hidden bg-slate-950 text-slate-100 ${className}`}>
      {children}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/5 p-5 ${className}`}>
      {children}
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="mt-2 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function TextInput({ className = '', ...rest }) {
  return (
    <input
      className={`w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 text-base text-white
        placeholder:text-slate-600 outline-none transition
        focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/30 ${className}`}
      {...rest}
    />
  )
}

export function Avatar({ name, className = '' }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  // Cor estável derivada do nome.
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  const hue = hash % 360

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${className}`}
      style={{ backgroundColor: `hsl(${hue} 60% 42%)` }}
    >
      {initials}
    </span>
  )
}

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
