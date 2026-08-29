// Protocolo de mensagens JSON trocadas via PeerJS DataConnection.
// Cliente -> Host: pedidos de ação. Host -> Cliente: estado autoritativo / erros.

export const PEER_PREFIX = 'qsemu-'

export const C2H = {
  JOIN: 'join',
  SUBMIT_CHARACTER: 'submit_character',
  GOT_IT: 'got_it',
  START_GAME: 'start_game',
  NEW_ROUND: 'new_round',
  BACK_TO_LOBBY: 'back_to_lobby',
  PING: 'ping',
}

export const H2C = {
  WELCOME: 'welcome',
  STATE: 'state',
  ERROR: 'error',
  PONG: 'pong',
}

export const ERR = {
  ROOM_NOT_FOUND: 'room_not_found',
  ROOM_FULL: 'room_full',
  GAME_RUNNING: 'game_running',
  NAME_TAKEN: 'name_taken',
  HOST_LEFT: 'host_left',
  ID_TAKEN: 'id_taken',
  NETWORK: 'network',
  BROWSER: 'browser',
}

export const ERROR_MESSAGES = {
  [ERR.ROOM_NOT_FOUND]: 'Sala não encontrada. Confira o código e tente de novo.',
  [ERR.ROOM_FULL]: 'Essa sala já está cheia.',
  [ERR.GAME_RUNNING]: 'A partida já começou. Peça para o host voltar ao lobby.',
  [ERR.NAME_TAKEN]: 'Já existe alguém com esse nome na sala.',
  [ERR.HOST_LEFT]: 'A conexão com o host caiu. A sala foi encerrada.',
  [ERR.ID_TAKEN]: 'Não foi possível criar a sala. Tente novamente.',
  [ERR.NETWORK]: 'Falha de conexão. Verifique sua internet e tente de novo.',
  [ERR.BROWSER]: 'Seu navegador bloqueou a conexão P2P (WebRTC).',
}

export const MAX_PLAYERS = 10
export const MIN_PLAYERS = 2

// Heartbeat: o PeerJS não avisa de forma confiável quando a outra ponta some
// (aba fechada, celular bloqueado, rede caiu), então detectamos por silêncio.
export const HEARTBEAT_MS = 3000
export const PEER_TIMEOUT_MS = 10000
export const HOST_TIMEOUT_MS = 14000

// Alfabeto sem caracteres ambíguos (I, O, 0, 1) para facilitar ditar o código.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 5) {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

export function codeToPeerId(code) {
  return PEER_PREFIX + code.trim().toUpperCase()
}

export function normalizeCode(raw) {
  return (raw || '')
    .toUpperCase()
    .split('')
    .filter((c) => CODE_ALPHABET.includes(c))
    .join('')
}

export function messageFor(code, fallback = ERROR_MESSAGES[ERR.NETWORK]) {
  return ERROR_MESSAGES[code] || fallback
}
