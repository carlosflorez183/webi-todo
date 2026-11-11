import { useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from './store/StoreContext'
import { KanbanBoard } from './components/KanbanBoard'

/** Pantalla de estado simple para login / callback / errores. */
const Message = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-background p-6 font-sans text-content">
    <div className="max-w-md rounded-xl border border-border bg-surface p-8 text-center">{children}</div>
  </div>
)

function App() {
  const { authStore } = useStore()
  // Enrutamiento simple por pathname (sin librería de routing).
  const path = window.location.pathname
  // Guard de montaje: el efecto de /callback o /logout se ejecuta una sola vez,
  // aunque StrictMode lo invoque dos veces en desarrollo.
  const handled = useRef(false)

  // Al tener sesión válida, carga el tablero desde el backend.
  const accessToken = authStore.tokens?.accessToken
  const { boardStore } = useStore()
  useEffect(() => {
    if (authStore.isAuthenticated && accessToken) {
      void boardStore.loadBoard(accessToken)
    }
  }, [authStore.isAuthenticated, accessToken, boardStore])

  useEffect(() => {
    if (path !== '/callback') return
    if (handled.current) return
    handled.current = true

    // Quita code/state de la URL y entra al tablero.
    authStore.handleCallback(window.location.search).then(() => {
      window.location.replace('/')
    })
  }, [authStore, path])

  if (path === '/callback') {
    if (authStore.error) {
      return (
        <Message>
          <p className="mb-4 font-semibold text-danger">No se pudo iniciar sesión</p>
          <p className="mb-6 text-sm text-muted">{authStore.error}</p>
          <button
            type="button"
            onClick={() => authStore.login()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary-hover"
          >
            Reintentar
          </button>
        </Message>
      )
    }
    return <Message>Procesando inicio de sesión…</Message>
  }

  if (authStore.sessionStatus === 'validating') {
    return <Message>Validando sesión…</Message>
  }

  if (authStore.sessionStatus === 'error') {
    return (
      <Message>
        <p className="mb-4 font-semibold text-danger">No se pudo validar la sesión</p>
        <p className="mb-6 text-sm text-muted">{authStore.validationError}</p>
        <button
          type="button"
          onClick={() => authStore.retryValidation()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary-hover"
        >
          Reintentar
        </button>
      </Message>
    )
  }

  if (!authStore.isAuthenticated) {
    return (
      <Message>
        <p className="mb-6 text-content">No estás autenticado.</p>
        <button
          type="button"
          onClick={() => authStore.login()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary-hover"
        >
          Haz clic aquí para iniciar sesión
        </button>
      </Message>
    )
  }

  const user = authStore.user
  // Nombre con fallback al email (siempre presente en la sesión).
  const displayName = user?.name || user?.email || 'Usuario'
  const showEmail = !!user?.email && user.email !== displayName
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-content">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface px-6 py-3">
        {/* Marca */}
        <span className="text-primary" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M7 9l2 2 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 15l2 2 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="text-lg font-bold">Webi Todo</h1>

        {/* Usuario + logout */}
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar: solo si el claim `picture` existe; si no, el inicial del nombre. */}
            {user?.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                {initial}
              </span>
            )}
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-medium text-content">{displayName}</span>
              {showEmail && <span className="text-xs text-muted">{user?.email}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => authStore.logout()}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-content"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 12H4m11 0l-3.5-3.5M15 12l-3.5 3.5M20 5v14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Tablero: ocupa el alto restante del viewport; cada columna hace scroll propio */}
      <main className="flex min-h-0 flex-1 flex-col px-6 py-6 h-[calc(100vh-4.25rem)]">
        <KanbanBoard />
      </main>
    </div>
  )
}

export default observer(App)
