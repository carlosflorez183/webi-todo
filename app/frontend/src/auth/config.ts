// Configuración pública de Cognito leída desde frontend/.env (VITE_*).
const env = import.meta.env

export const cognitoConfig = {
  domain: env.VITE_COGNITO_DOMAIN as string,
  clientId: env.VITE_COGNITO_CLIENT_ID as string,
  redirectUri: env.VITE_COGNITO_REDIRECT_URI as string,
  logoutUri: env.VITE_COGNITO_LOGOUT_URI as string,
  scopes: (env.VITE_COGNITO_SCOPES as string) || 'openid email profile',
  /** Segundos antes del vencimiento en que se renueva el token (por defecto 300). */
  refreshMarginSeconds: (() => {
    const value = Number(env.VITE_AUTH_REFRESH_MARGIN_SECONDS)
    return Number.isFinite(value) && value >= 0 ? value : 300
  })(),
}

const missing = Object.entries({
  VITE_COGNITO_DOMAIN: cognitoConfig.domain,
  VITE_COGNITO_CLIENT_ID: cognitoConfig.clientId,
  VITE_COGNITO_REDIRECT_URI: cognitoConfig.redirectUri,
  VITE_COGNITO_LOGOUT_URI: cognitoConfig.logoutUri,
})
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missing.length > 0) {
  throw new Error(`Faltan variables de Cognito en frontend/.env: ${missing.join(', ')}`)
}
