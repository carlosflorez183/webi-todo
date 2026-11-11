import mongoose from 'mongoose'
import { config } from '../config.js'

/** Conecta una sola vez al arrancar. Lanza error si la base no responde. */
export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDatabase })
  console.info(`[db] Conectado a MongoDB (base "${config.mongoDatabase}")`)
}

/** Verifica conectividad real contra la base (ping), no solo el socket. */
export const pingDatabase = async (): Promise<boolean> => {
  try {
    const db = mongoose.connection.db
    if (!db) return false
    await db.admin().ping()
    return true
  } catch {
    return false
  }
}

/** Cierre ordenado de la conexión. */
export const closeDatabase = async (): Promise<void> => {
  await mongoose.disconnect()
}
