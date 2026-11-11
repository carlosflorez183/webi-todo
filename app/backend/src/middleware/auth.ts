import type { NextFunction, Request, Response } from 'express'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { config } from '../config.js'

// Claves públicas del pool, cacheadas por jose (no se piden en cada petición).
const jwks = createRemoteJWKSet(new URL(`${config.cognito.issuer}/.well-known/jwks.json`))

declare module 'express-serve-static-core' {
  interface Request {
    auth?: JWTPayload & { sub: string }
  }
}

/**
 * Valida el access token de Cognito en cada endpoint protegido:
 * firma (JWKS), emisor, uso (`token_use=access`), cliente y expiración.
 * Sin token o con token inválido responde 401.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    res.status(401).json({ error: 'Falta el access token' })
    return
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.cognito.issuer,
    })
    if (payload.token_use !== 'access' || payload.client_id !== config.cognito.clientId || !payload.sub) {
      res.status(401).json({ error: 'Token no válido para esta aplicación' })
      return
    }
    req.auth = payload as JWTPayload & { sub: string }
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o vencido' })
  }
}
