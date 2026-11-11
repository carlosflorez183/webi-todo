import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

/** Valida el cuerpo de la petición con un esquema zod. Responde 400 con el detalle si no cumple. */
export const validateBody =
  <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Datos no válidos',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
      return
    }
    req.body = result.data
    next()
  }
