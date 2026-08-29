import { Screen, Spinner } from './ui.jsx'

export default function ConnectingScreen({ label }) {
  return (
    <Screen>
      <div className="flex h-full items-center justify-center px-8">
        <Spinner label={label} />
      </div>
    </Screen>
  )
}
