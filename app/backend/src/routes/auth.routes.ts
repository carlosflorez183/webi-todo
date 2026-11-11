import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()

// TEMPORAL: solo para verificar la validación del access token (sin depender del CRUD).
// Devuelve los claims validados. Retirar cuando el resto de endpoints ya protejan la API.
authRouter.get('/whoami', requireAuth, (req: Request, res: Response) => {
  const { sub, token_use, client_id, iss, exp, scope, username } = req.auth!
  res.json({ sub, token_use, client_id, iss, exp, scope, username })
})
