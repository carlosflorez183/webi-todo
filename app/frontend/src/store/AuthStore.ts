import { makeAutoObservable, runInAction } from 'mobx'
import { cognitoConfig } from '../auth/config'
import { createCodeChallenge, generateRandomString } from '../auth/pkce'

const STORAGE_KEY = 'webi-todo.auth'
const PKCE_VERIFIER_KEY = 'webi-todo.pkce_verifier'
const PKCE_STATE_KEY = 'webi-todo.pkce_state'

export interface AuthTokens {
  idToken: string
  accessToken: string
  refreshToken?: string
  /** Epoch en milisegundos en que vence el access token. */
  expiresAt: number
}

/** unauthenticated: sin sesión · validating: consultando Cognito · authenticated: válida · error: red, reintentable */
export type SessionStatus = 'unauthenticated' | 'validating' | 'authenticated' | 'error'

export interface AuthUser {
  email?: string
  name?: string
  /** URL del avatar (claim `picture`), si el pool lo provee. */
  picture?: string
  sub: string
}

/** Decodifica el payload de un JWT sin validar la firma (solo para mostrar info). */
const decodeJwtPayload = (jwt: string): Record<string, unknown> => {
  const payload = jwt.split('.')[1]
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  return JSON.parse(json)
}

export class AuthStore {
  tokens: AuthTokens | null = null
  user: AuthUser | null = null
  /** true mientras se intercambia el code por tokens. */
  isProcessingCallback = false
  error: string | null = null
  /** Estado de la sesión tras la validación inicial contra Cognito. */
  sessionStatus: SessionStatus = 'unauthenticated'
  validationError: string | null = null
  /** Canjes en curso/terminados indexados por `code` (guard de idempotencia). */
  private readonly callbackPromises = new Map<string, Promise<void>>()
  /** Timer de renovación programada del access token. */
  private refreshTimer: ReturnType<typeof setTimeout> | undefined = undefined

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
    this.restore()
  }

  get isAuthenticated(): boolean {
    return this.sessionStatus === 'authenticated' && this.tokens !== null && this.user !== null
  }

  /**
   * Restaura la sesión desde localStorage y la valida contra Cognito (userInfo).
   * - 200: sesión válida.
   * - 401 / token vencido: intenta refresh; si falla, cierra sesión local.
   * - Error de red: estado `error` reintentable (no se da la sesión por buena).
   */
  private restore(): void {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    let tokens: AuthTokens
    try {
      tokens = JSON.parse(raw) as AuthTokens
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    runInAction(() => {
      this.tokens = tokens
      this.sessionStatus = 'validating'
    })
    void this.validateSession()
  }

  /** Valida el access token contra Cognito y decide el estado de la sesión. */
  async validateSession(): Promise<void> {
    runInAction(() => {
      this.sessionStatus = 'validating'
      this.validationError = null
    })

    const expired = (this.tokens?.expiresAt ?? 0) <= Date.now()
    if (!expired) {
      try {
        const res = await fetch(`${cognitoConfig.domain}/oauth2/userInfo`, {
          headers: { Authorization: `Bearer ${this.tokens!.accessToken}` },
        })
        if (res.ok) {
          console.info('[auth] Validación de sesión contra Cognito: EXITOSA')
          this.activateSession()
          return
        }
        console.warn(`[auth] Validación contra Cognito: FALLIDA (HTTP ${res.status}). Intentando renovar.`)
      } catch (err) {
        console.error('[auth] Validación contra Cognito: ERROR DE RED. Reintentable.', err)
        runInAction(() => {
          this.sessionStatus = 'error'
          this.validationError = 'No se pudo validar la sesión. Revisa tu conexión.'
        })
        return
      }
    } else {
      console.warn('[auth] Token local vencido. Intentando renovar con refresh token.')
    }

    // Token vencido o rechazado por Cognito: intentar renovar.
    const ok = await this.refreshSession()
    if (ok) {
      console.info('[auth] Sesión renovada tras validación')
      this.activateSession()
    } else {
      console.warn('[auth] Sesión no válida en Cognito. Se cierra la sesión local.')
      this.clearSession()
      runInAction(() => {
        this.sessionStatus = 'unauthenticated'
      })
    }
  }

  /** Marca la sesión como válida, carga el usuario y programa la renovación. */
  private activateSession(): void {
    runInAction(() => {
      this.user = this.userFromIdToken(this.tokens!.idToken)
      this.sessionStatus = 'authenticated'
    })
    this.scheduleRefresh()
  }

  /** Reintenta la validación tras un error de red. */
  retryValidation(): Promise<void> {
    return this.validateSession()
  }

  /**
   * Programa la renovación `refreshMarginSeconds` antes de que venza el access token.
   * Si ya está dentro del margen, renueva de inmediato.
   */
  private scheduleRefresh(): void {
    this.cancelScheduledRefresh()
    if (!this.tokens?.refreshToken) return
    const delay = this.tokens.expiresAt - Date.now() - cognitoConfig.refreshMarginSeconds * 1000
    // [DEBUG temporal] observabilidad de la renovación
    console.info(
      `[auth] Renovación programada en ${Math.round(Math.max(delay, 0) / 1000)} s ` +
        `(margen ${cognitoConfig.refreshMarginSeconds} s)`,
    )
    this.refreshTimer = setTimeout(
      () => {
        console.info('[auth] Ejecutando renovación del token con refresh token...')
        void this.refreshSession()
      },
      Math.max(delay, 0),
    )
  }

  private cancelScheduledRefresh(): void {
    if (this.refreshTimer !== undefined) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  private userFromIdToken(idToken: string): AuthUser {
    const claims = decodeJwtPayload(idToken)
    return {
      sub: String(claims.sub ?? ''),
      email: claims.email as string | undefined,
      name: (claims.name ?? claims['cognito:username']) as string | undefined,
      picture: (claims.picture as string | undefined) || undefined,
    }
  }

  private persist(tokens: AuthTokens): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  }

  /** Redirige al Hosted UI de Cognito iniciando Authorization Code + PKCE. */
  async login(): Promise<void> {
    const verifier = generateRandomString(64)
    const challenge = await createCodeChallenge(verifier)
    const state = generateRandomString(32)

    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
    sessionStorage.setItem(PKCE_STATE_KEY, state)

    const params = new URLSearchParams({
      client_id: cognitoConfig.clientId,
      response_type: 'code',
      scope: cognitoConfig.scopes,
      redirect_uri: cognitoConfig.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    })
    window.location.assign(`${cognitoConfig.domain}/oauth2/authorize?${params}`)
  }

  /**
   * Procesa /callback?code=...&state=... e intercambia el code por tokens.
   * Idempotente por `code`: el code es de un solo uso, así que si el callback
   * se invoca varias veces (p. ej. StrictMode en desarrollo) se reutiliza la
   * misma promesa en lugar de volver a canjearlo.
   */
  handleCallback(search: string): Promise<void> {
    const code = new URLSearchParams(search).get('code') ?? ''
    if (!this.callbackPromises.has(code)) {
      this.callbackPromises.set(code, this.exchangeCode(search))
    }
    return this.callbackPromises.get(code)!
  }

  private async exchangeCode(search: string): Promise<void> {
    const params = new URLSearchParams(search)
    const code = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error_description') ?? params.get('error')

    runInAction(() => {
      this.isProcessingCallback = true
      this.error = null
    })

    try {
      if (oauthError) throw new Error(oauthError)
      if (!code) throw new Error('No se recibió el código de autorización.')

      const expectedState = sessionStorage.getItem(PKCE_STATE_KEY)
      const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
      if (!verifier || !state || state !== expectedState) {
        throw new Error('El parámetro state no coincide. Intenta iniciar sesión de nuevo.')
      }

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cognitoConfig.clientId,
        code,
        redirect_uri: cognitoConfig.redirectUri,
        code_verifier: verifier,
      })
      const tokens = await this.requestTokens(body)

      sessionStorage.removeItem(PKCE_VERIFIER_KEY)
      sessionStorage.removeItem(PKCE_STATE_KEY)

      this.setSession(tokens)
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error al iniciar sesión.'
      })
    } finally {
      runInAction(() => {
        this.isProcessingCallback = false
      })
    }
  }

  /** Renueva el access/ID token con el refresh token. */
  async refreshSession(): Promise<boolean> {
    const refreshToken = this.tokens?.refreshToken
    if (!refreshToken) return false
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: cognitoConfig.clientId,
        refresh_token: refreshToken,
      })
      const tokens = await this.requestTokens(body, refreshToken)
      this.setSession(tokens)
      // [DEBUG temporal]
      console.info('[auth] Renovación EXITOSA. Nuevo vencimiento:', new Date(tokens.expiresAt).toLocaleTimeString())
      return true
    } catch (err) {
      // [DEBUG temporal]
      console.error('[auth] Renovación FALLIDA. Se cierra la sesión local.', err)
      this.clearSession()
      return false
    }
  }

  /**
   * Cierra la sesión: limpia la local y redirige al endpoint de logout de Cognito,
   * que vuelve a `logoutUri` (la raíz de la app).
   */
  logout(): void {
    this.clearSession()
    const params = new URLSearchParams({
      client_id: cognitoConfig.clientId,
      logout_uri: cognitoConfig.logoutUri,
    })
    window.location.assign(`${cognitoConfig.domain}/logout?${params}`)
  }


  private async requestTokens(body: URLSearchParams, previousRefresh?: string): Promise<AuthTokens> {
    const res = await fetch(`${cognitoConfig.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Cognito rechazó la solicitud de tokens (${res.status}): ${detail}`)
    }
    const data = (await res.json()) as {
      id_token: string
      access_token: string
      refresh_token?: string
      expires_in: number
    }
    return {
      idToken: data.id_token,
      accessToken: data.access_token,
      // Cognito no devuelve refresh_token en la renovación: conservamos el anterior.
      refreshToken: data.refresh_token ?? previousRefresh,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  }

  /** Guarda tokens recién emitidos por Cognito (login o refresh) y activa la sesión. */
  private setSession(tokens: AuthTokens): void {
    this.persist(tokens)
    runInAction(() => {
      this.tokens = tokens
      this.user = this.userFromIdToken(tokens.idToken)
      this.sessionStatus = 'authenticated'
    })
    this.scheduleRefresh()
  }

  /** Borra la sesión local (storage + estado) y cancela cualquier renovación pendiente. */
  private clearSession(): void {
    this.cancelScheduledRefresh()
    localStorage.removeItem(STORAGE_KEY)
    runInAction(() => {
      this.tokens = null
      this.user = null
      this.sessionStatus = 'unauthenticated'
      this.validationError = null
    })
  }
}
