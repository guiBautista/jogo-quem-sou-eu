import { useMemo } from 'react'
import { useGameNet } from './net/useGameNet.js'
import { PHASE } from './game/logic.js'
import { normalizeCode } from './net/protocol.js'
import HomeScreen from './components/HomeScreen.jsx'
import Lobby from './components/Lobby.jsx'
import WritingPhase from './components/WritingPhase.jsx'
import PlayingScreen from './components/PlayingScreen.jsx'
import ResultsScreen from './components/ResultsScreen.jsx'
import ErrorScreen from './components/ErrorScreen.jsx'
import ConnectingScreen from './components/ConnectingScreen.jsx'

export default function App() {
  const net = useGameNet()

  // Link compartilhado: ?sala=ABC12 já abre o formulário de entrada preenchido.
  const initialCode = useMemo(
    () => normalizeCode(new URLSearchParams(window.location.search).get('sala') || '').slice(0, 5),
    [],
  )

  if (net.error) return <ErrorScreen error={net.error} onRetry={net.clearError} />

  if (net.status === 'idle') {
    return (
      <HomeScreen
        initialCode={initialCode}
        onCreate={net.createRoom}
        onJoin={net.joinRoom}
        busy={false}
      />
    )
  }

  if (!net.state || !net.myId) {
    return (
      <ConnectingScreen
        label={net.status === 'creating' ? 'Criando a sala…' : 'Conectando na sala…'}
      />
    )
  }

  const shared = { state: net.state, myId: net.myId, isHost: net.isHost }

  switch (net.state.phase) {
    case PHASE.WRITING:
      return <WritingPhase {...shared} onSubmit={net.submitCharacter} />
    case PHASE.PLAYING:
      return <PlayingScreen {...shared} onGotIt={net.gotIt} />
    case PHASE.RESULTS:
      return (
        <ResultsScreen {...shared} onNewRound={net.newRound} onBackToLobby={net.backToLobby} />
      )
    case PHASE.LOBBY:
    default:
      return <Lobby {...shared} onStart={net.startGame} onLeave={net.leaveRoom} />
  }
}
