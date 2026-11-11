import express, { type Request, type Response } from 'express'
import { config } from './config.js'
import { closeDatabase, connectDatabase, pingDatabase } from './db/connection.js'
import { tasksRouter } from './routes/tasks.routes.js'
import { authRouter } from './routes/auth.routes.js'

const app = express()

// Parsea JSON en el cuerpo de las peticiones
app.use(express.json())

// Tareas (Slice 03): CRUD protegido por access token de Cognito
app.use('/api/tasks', tasksRouter)

// TEMPORAL: prueba de autenticación (protegido)
app.use('/api/auth', authRouter)

// Health check (Slice 01) — expuesto bajo /api. Verifica también la base de datos.
app.get('/api/health', async (_req: Request, res: Response) => {
  const dbUp = await pingDatabase()
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' })
})

const start = async (): Promise<void> => {
  // Si la base no está disponible, el proceso no arranca (no se sirve sin datos).
  await connectDatabase()

  const server = app.listen(config.port, () => {
    console.info(`Backend escuchando en http://localhost:${config.port}`)
  })

  const shutdown = async (signal: string): Promise<void> => {
    console.info(`[server] ${signal} recibido, cerrando...`)
    server.close()
    await closeDatabase()
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

start().catch((err: unknown) => {
  console.error('[server] No se pudo iniciar:', err)
  process.exit(1)
})
