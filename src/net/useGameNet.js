import { useCallback, useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import {
  C2H,
  H2C,
  ERR,
  codeToPeerId,
  generateRoomCode,
  messageFor,
  MIN_PLAYERS,
  HEARTBEAT_MS,
  PEER_TIMEOUT_MS,
  HOST_TIMEOUT_MS,
} from './protocol.js'
import * as game from '../game/logic.js'

const PEER_OPTIONS = {
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  },
}

const HOST_PLAYER_ID = 'host'
const MAX_CODE_RETRIES = 4

const send = (conn, payload) => {
  try {
    if (conn?.open) conn.send(payload)
  } catch {
    /* conexão fechando */
  }
}

/**
 * Camada de rede P2P em topologia estrela.
 *
 * HOST: cria um Peer com id derivado do código da sala, guarda o estado
 * autoritativo, processa as mensagens dos clientes e faz broadcast do estado.
 * CLIENT: conecta no Peer do host, envia ações e só renderiza o estado recebido.
 */
export function useGameNet() {
  const [status, setStatus] = useState('idle') // idle | creating | connecting | connected | error
  const [role, setRole] = useState(null) // host | client
  const [gameState, setGameState] = useState(null)
  const [myId, setMyId] = useState(null)
  const [error, setError] = useState(null)

  const peerRef = useRef(null)
  const stateRef = useRef(null) // estado autoritativo (só no host)
  const connsRef = useRef(new Map()) // host: peerId -> { conn, playerId, lastSeen }
  const hostConnRef = useRef(null) // client: DataConnection com o host
  const lastHostMsgRef = useRef(0) // client: quando o host falou pela última vez
  const heartbeatRef = useRef(null)
  const roleRef = useRef(null)
  const myIdRef = useRef(null)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const teardown = useCallback(() => {
    clearInterval(heartbeatRef.current)
    heartbeatRef.current = null
    connsRef.current.forEach(({ conn }) => {
      try {
        conn.close()
      } catch {
        /* já encerrada */
      }
    })
    connsRef.current = new Map()
    hostConnRef.current = null
    try {
      peerRef.current?.destroy()
    } catch {
      /* já destruído */
    }
    peerRef.current = null
    stateRef.current = null
    roleRef.current = null
    myIdRef.current = null
  }, [])

  useEffect(() => teardown, [teardown])

  const fail = useCallback(
    (code, detail) => {
      if (!aliveRef.current) return
      teardown()
      setError({ code, message: messageFor(code, detail) })
      setStatus('error')
      setRole(null)
      setGameState(null)
      setMyId(null)
    },
    [teardown],
  )

  // ------------------------------------------------------------------ HOST

  const commit = useCallback((next) => {
    stateRef.current = next
    if (aliveRef.current) setGameState(next)
    connsRef.current.forEach(({ conn }) => send(conn, { t: H2C.STATE, state: next }))
  }, [])

  // Processa uma ação vinda de um cliente (ou do próprio host, localmente).
  const applyAction = useCallback(
    (playerId, msg) => {
      const current = stateRef.current
      if (!current || !playerId) return

      switch (msg.t) {
        case C2H.START_GAME:
          if (playerId !== current.hostId) return
          if (current.phase !== game.PHASE.LOBBY) return
          if (game.activePlayers(current).length < MIN_PLAYERS) return
          commit(game.startGame(current))
          return
        case C2H.SUBMIT_CHARACTER:
          commit(game.submitCharacter(current, playerId, msg.character))
          return
        case C2H.GOT_IT:
          commit(game.gotIt(current, playerId))
          return
        case C2H.NEW_ROUND:
          if (playerId !== current.hostId) return
          commit(game.newRound(current))
          return
        case C2H.BACK_TO_LOBBY:
          if (playerId !== current.hostId) return
          commit(game.backToLobby(current))
          return
        default:
      }
    },
    [commit],
  )

  const dropConnection = useCallback(
    (peerId) => {
      const entry = connsRef.current.get(peerId)
      if (!entry) return
      connsRef.current.delete(peerId)
      try {
        entry.conn.close()
      } catch {
        /* já fechada */
      }
      commit(game.handleDisconnect(stateRef.current, entry.playerId))
    },
    [commit],
  )

  const attachIncoming = useCallback(
    (conn) => {
      conn.on('data', (raw) => {
        const msg = typeof raw === 'string' ? safeParse(raw) : raw
        if (!msg || typeof msg.t !== 'string') return

        const entry = connsRef.current.get(conn.peer)
        if (entry) entry.lastSeen = Date.now()

        if (msg.t === C2H.PING) {
          send(conn, { t: H2C.PONG })
          return
        }

        if (msg.t === C2H.JOIN) {
          const {
            state: next,
            playerId,
            error: joinError,
          } = game.addPlayer(stateRef.current, { name: msg.name })

          if (joinError) {
            send(conn, { t: H2C.ERROR, code: joinError })
            setTimeout(() => conn.close(), 250)
            return
          }
          connsRef.current.set(conn.peer, { conn, playerId, lastSeen: Date.now() })
          send(conn, { t: H2C.WELCOME, playerId, roomCode: next.roomCode })
          commit(next)
          return
        }

        if (entry) applyAction(entry.playerId, msg)
      })

      conn.on('close', () => dropConnection(conn.peer))
      conn.on('error', () => dropConnection(conn.peer))
    },
    [applyAction, commit, dropConnection],
  )

  const createRoom = useCallback(
    (rawName, attempt = 0) => {
      const name = game.sanitizeName(rawName)
      if (!name) return

      teardown()
      setError(null)
      setStatus('creating')
      setRole('host')
      roleRef.current = 'host'

      const code = generateRoomCode()
      const peer = new Peer(codeToPeerId(code), PEER_OPTIONS)
      peerRef.current = peer

      peer.on('open', () => {
        if (!aliveRef.current) return
        myIdRef.current = HOST_PLAYER_ID
        setMyId(HOST_PLAYER_ID)
        commit(game.createInitialState({ roomCode: code, hostId: HOST_PLAYER_ID, hostName: name }))
        setStatus('connected')

        // Varredura: quem ficou mudo tempo demais é considerado desconectado.
        heartbeatRef.current = setInterval(() => {
          const now = Date.now()
          connsRef.current.forEach((entry, peerId) => {
            if (now - entry.lastSeen > PEER_TIMEOUT_MS) dropConnection(peerId)
          })
        }, HEARTBEAT_MS)
      })

      peer.on('connection', attachIncoming)

      peer.on('error', (err) => {
        // Código sorteado já em uso no servidor de sinalização: sorteia outro.
        if (err.type === 'unavailable-id' && attempt < MAX_CODE_RETRIES) {
          try {
            peer.destroy()
          } catch {
            /* noop */
          }
          createRoom(rawName, attempt + 1)
          return
        }
        if (err.type === 'peer-unavailable') return // cliente sumiu; não derruba a sala
        fail(peerErrorCode(err), err.message)
      })

      peer.on('disconnected', () => {
        try {
          peer.reconnect()
        } catch {
          /* noop */
        }
      })
    },
    [attachIncoming, commit, dropConnection, fail, teardown],
  )

  // ---------------------------------------------------------------- CLIENT

  const joinRoom = useCallback(
    (code, rawName) => {
      const name = game.sanitizeName(rawName)
      if (!name || !code) return

      teardown()
      setError(null)
      setStatus('connecting')
      setRole('client')
      roleRef.current = 'client'

      const peer = new Peer(PEER_OPTIONS)
      peerRef.current = peer

      peer.on('open', () => {
        const conn = peer.connect(codeToPeerId(code), { reliable: true })
        hostConnRef.current = conn

        conn.on('open', () => {
          lastHostMsgRef.current = Date.now()
          conn.send({ t: C2H.JOIN, name })

          heartbeatRef.current = setInterval(() => {
            send(conn, { t: C2H.PING })
            if (Date.now() - lastHostMsgRef.current > HOST_TIMEOUT_MS) fail(ERR.HOST_LEFT)
          }, HEARTBEAT_MS)
        })

        conn.on('data', (raw) => {
          const msg = typeof raw === 'string' ? safeParse(raw) : raw
          if (!msg || !aliveRef.current) return
          lastHostMsgRef.current = Date.now()

          if (msg.t === H2C.WELCOME) {
            myIdRef.current = msg.playerId
            setMyId(msg.playerId)
            setStatus('connected')
          } else if (msg.t === H2C.STATE) {
            setGameState(msg.state)
            setStatus('connected')
          } else if (msg.t === H2C.ERROR) {
            fail(msg.code, msg.message)
          }
        })

        conn.on('close', () => {
          if (hostConnRef.current === conn) fail(ERR.HOST_LEFT)
        })
        conn.on('error', () => {
          if (hostConnRef.current === conn) fail(ERR.HOST_LEFT)
        })
      })

      peer.on('error', (err) => {
        fail(err.type === 'peer-unavailable' ? ERR.ROOM_NOT_FOUND : peerErrorCode(err), err.message)
      })
    },
    [fail, teardown],
  )

  // --------------------------------------------------------------- AÇÕES

  // Host aplica localmente; cliente manda pro host. A UI não vê diferença.
  const dispatch = useCallback(
    (msg) => {
      if (roleRef.current === 'host') applyAction(myIdRef.current, msg)
      else send(hostConnRef.current, msg)
    },
    [applyAction],
  )

  const leaveRoom = useCallback(() => {
    teardown()
    setStatus('idle')
    setRole(null)
    setGameState(null)
    setMyId(null)
    setError(null)
  }, [teardown])

  const clearError = useCallback(() => {
    setError(null)
    setStatus('idle')
  }, [])

  return {
    status,
    role,
    isHost: role === 'host',
    state: gameState,
    myId,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    clearError,
    startGame: () => dispatch({ t: C2H.START_GAME }),
    submitCharacter: (character) => dispatch({ t: C2H.SUBMIT_CHARACTER, character }),
    gotIt: () => dispatch({ t: C2H.GOT_IT }),
    newRound: () => dispatch({ t: C2H.NEW_ROUND }),
    backToLobby: () => dispatch({ t: C2H.BACK_TO_LOBBY }),
  }
}

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function peerErrorCode(err) {
  switch (err.type) {
    case 'unavailable-id':
      return ERR.ID_TAKEN
    case 'browser-incompatible':
    case 'webrtc':
      return ERR.BROWSER
    case 'peer-unavailable':
      return ERR.ROOM_NOT_FOUND
    default:
      return ERR.NETWORK
  }
}
