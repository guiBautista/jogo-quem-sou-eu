// Regras do jogo. Funções puras: recebem o estado e devolvem um NOVO estado.
// Só o HOST executa este módulo — ele é o Single Source of Truth.

import { MAX_PLAYERS, MIN_PLAYERS, ERR } from '../net/protocol.js'
import { isAllowedImageUrl } from '../net/imageSearch.js'

export const PHASE = {
  LOBBY: 'lobby',
  WRITING: 'writing',
  READY: 'ready', // todos escreveram; host espera a galera erguer o celular
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  RESULTS: 'results',
}

export const CHARACTER_MAX_LENGTH = 48
export const NAME_MAX_LENGTH = 14
const PLACEHOLDER_CHARACTER = 'Personagem misterioso'

let idCounter = 0
export function newPlayerId() {
  idCounter += 1
  return `p${idCounter}_${Math.random().toString(36).slice(2, 7)}`
}

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Nada do que chega pela rede passou por um formulário: `maxLength` e `type` do
// input valem para quem usa a tela, não para quem monta o JSON na mão.
const MAX_RAW_TEXT = 1000

// Invisíveis e marcas de direção. Dão para forjar dois nomes que a tela mostra
// idênticos (e a reconexão é por nome) e para embaralhar o texto gigante da
// fase de adivinhação. O ZWJ (200D) fica, senão emoji composto quebra.
const INVISIBLE_CHARS =
  /[\u0000-\u001F\u007F-\u009F\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g

function sanitizeText(raw, maxLength) {
  if (typeof raw !== 'string') return ''
  return raw
    .slice(0, MAX_RAW_TEXT) // corta antes da regex: carga gigante não vira trabalho
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(INVISIBLE_CHARS, '')
    .trim()
    .slice(0, maxLength)
}

export function sanitizeName(raw) {
  return sanitizeText(raw, NAME_MAX_LENGTH)
}

export function sanitizeCharacter(raw) {
  return sanitizeText(raw, CHARACTER_MAX_LENGTH)
}

export function createInitialState({ roomCode, hostId, hostName }) {
  return {
    roomCode,
    hostId,
    phase: PHASE.LOBBY,
    round: 0,
    players: [{ id: hostId, name: hostName, score: 0, connected: true }],
    targets: {}, // { autorId: alvoId }
    characters: {}, // { alvoId: 'personagem' | null }
    images: {}, // { alvoId: url | null } — opcional, escolhida por quem escreveu
    remaining: [], // quem ainda não acertou nesta rodada
    finishOrder: [],
    roundPoints: {},
  }
}

export const getPlayer = (state, id) => state.players.find((p) => p.id === id)
export const activePlayers = (state) => state.players.filter((p) => p.connected)
export const isEveryCharacterReady = (state) =>
  Object.keys(state.targets).length > 0 &&
  Object.values(state.targets).every((targetId) => Boolean(state.characters[targetId]))

// ---------------------------------------------------------------- jogadores

export function addPlayer(state, { name }) {
  const clean = sanitizeName(name)
  if (!clean) return { state, error: ERR.NAME_TAKEN }

  const sameName = state.players.find((p) => p.name.toLowerCase() === clean.toLowerCase())

  // Reconexão: mesmo nome de um jogador que caiu reassume o mesmo slot (e pontuação).
  if (sameName) {
    if (sameName.connected) return { state, error: ERR.NAME_TAKEN }
    return {
      state: {
        ...state,
        players: state.players.map((p) => (p.id === sameName.id ? { ...p, connected: true } : p)),
      },
      playerId: sameName.id,
    }
  }

  if (state.phase !== PHASE.LOBBY) return { state, error: ERR.GAME_RUNNING }
  if (state.players.length >= MAX_PLAYERS) return { state, error: ERR.ROOM_FULL }

  const id = newPlayerId()
  return {
    state: { ...state, players: [...state.players, { id, name: clean, score: 0, connected: true }] },
    playerId: id,
  }
}

// Um jogador caiu: no lobby some da lista; em partida sai da rodada mas mantém a pontuação.
export function handleDisconnect(state, playerId) {
  if (!getPlayer(state, playerId)) return state

  if (state.phase === PHASE.LOBBY) {
    return { ...state, players: state.players.filter((p) => p.id !== playerId) }
  }

  let next = {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, connected: false } : p)),
  }

  // Se ele ainda devia um personagem, preenche para a rodada não travar.
  const owedTarget = next.targets[playerId]
  if (owedTarget && !next.characters[owedTarget]) {
    next = { ...next, characters: { ...next.characters, [owedTarget]: PLACEHOLDER_CHARACTER } }
  }

  next = { ...next, remaining: next.remaining.filter((id) => id !== playerId) }

  const roundRunning =
    next.phase === PHASE.READY || next.phase === PHASE.COUNTDOWN || next.phase === PHASE.PLAYING

  if (next.phase === PHASE.WRITING && isEveryCharacterReady(next)) next = beginReady(next)
  else if (roundRunning && next.remaining.length === 0) next = finishRound(next)

  return next
}

// ------------------------------------------------------------------- fases

// Fase 1: sorteio circular — A escreve para B, B para C, C para A.
export function startGame(state) {
  const players = activePlayers(state)
  if (players.length < MIN_PLAYERS) return state

  const circle = shuffle(players.map((p) => p.id))
  const targets = {}
  const characters = {}
  circle.forEach((authorId, i) => {
    const targetId = circle[(i + 1) % circle.length]
    targets[authorId] = targetId
    characters[targetId] = null
  })

  return {
    ...state,
    phase: PHASE.WRITING,
    round: state.round + 1,
    targets,
    characters,
    images: {},
    remaining: [],
    finishOrder: [],
    roundPoints: {},
  }
}

export function submitCharacter(state, playerId, rawText, rawImage) {
  if (state.phase !== PHASE.WRITING) return state
  const targetId = state.targets[playerId]
  if (!targetId || state.characters[targetId]) return state

  const character = sanitizeCharacter(rawText)
  if (!character) return state

  // A imagem vai parar no navegador de todo mundo, então o host só aceita URLs
  // da Wikimedia — senão um cliente adulterado poderia apontar os aparelhos dos
  // outros para qualquer endereço.
  const image = isAllowedImageUrl(rawImage) ? rawImage : null

  const next = {
    ...state,
    characters: { ...state.characters, [targetId]: character },
    images: { ...state.images, [targetId]: image },
  }
  return isEveryCharacterReady(next) ? beginReady(next) : next
}

// Todos escreveram: ninguém vê nome ainda. O host dá a largada quando a turma
// estiver com o celular na testa.
function beginReady(state) {
  const players = Object.keys(state.targets).filter((id) => getPlayer(state, id)?.connected)
  if (players.length === 0) return finishRound(state)
  return { ...state, phase: PHASE.READY, remaining: players, finishOrder: [] }
}

export function startCountdown(state) {
  if (state.phase !== PHASE.READY) return state
  return { ...state, phase: PHASE.COUNTDOWN }
}

export function revealCharacters(state) {
  if (state.phase !== PHASE.COUNTDOWN) return state
  return { ...state, phase: PHASE.PLAYING }
}

// ------------------------------------------------------------------ rodada

// Não há turno no app: os jogadores se revezam conversando. Cada um aperta
// "Acertei!" quando descobre, e a ordem de chegada define a pontuação.
export function gotIt(state, playerId) {
  if (state.phase !== PHASE.PLAYING) return state
  if (!state.remaining.includes(playerId)) return state

  const next = {
    ...state,
    finishOrder: [...state.finishOrder, playerId],
    remaining: state.remaining.filter((id) => id !== playerId),
  }
  return next.remaining.length === 0 ? finishRound(next) : next
}

// Fase 4: 1º +4, 2º +3, 3º +2, demais +1.
export function pointsForPosition(position) {
  if (position === 0) return 4
  if (position === 1) return 3
  if (position === 2) return 2
  return 1
}

function finishRound(state) {
  const roundPoints = {}
  state.finishOrder.forEach((id, position) => {
    roundPoints[id] = pointsForPosition(position)
  })

  return {
    ...state,
    phase: PHASE.RESULTS,
    roundPoints,
    remaining: [],
    players: state.players.map((p) => ({ ...p, score: p.score + (roundPoints[p.id] || 0) })),
  }
}

export function newRound(state) {
  if (state.phase !== PHASE.RESULTS) return state
  return startGame(state)
}

export function backToLobby(state) {
  return {
    ...state,
    phase: PHASE.LOBBY,
    targets: {},
    characters: {},
    images: {},
    remaining: [],
    finishOrder: [],
    roundPoints: {},
    players: state.players.filter((p) => p.connected),
  }
}

// Ranking acumulado, maior primeiro.
export function ranking(state) {
  return [...state.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}
