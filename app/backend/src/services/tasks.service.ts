import { TaskModel, type TaskStatus } from '../models/task.model.js'
import type { CreateTaskInput } from '../routes/tasks.schemas.js'

/** Siguiente posición al final de una columna (último + 1, o 0 si está vacía). */
const nextOrder = async (status: TaskStatus): Promise<number> => {
  const last = await TaskModel.findOne({ status }).sort({ order: -1 }).select('order').lean()
  return last ? last.order + 1 : 0
}

/** Reasigna order = 0..n-1 a las tareas de una columna, en el orden recibido. */
const writeColumnOrder = async (status: TaskStatus, ids: string[]): Promise<void> => {
  if (ids.length === 0) return
  await TaskModel.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id, status }, update: { $set: { order: index } } },
    })),
  )
}

/** Ids de una columna en su orden actual, excluyendo opcionalmente una tarea. */
const columnIds = async (status: TaskStatus, excludeId?: string): Promise<string[]> => {
  const tasks = await TaskModel.find({ status, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
    .sort({ order: 1, _id: 1 })
    .select('_id')
    .lean()
  return tasks.map((t) => String(t._id))
}

/**
 * Mueve una tarea a una posición concreta de una columna (cambia de columna si hace falta).
 *
 * Inserta la tarea en `position` de la columna destino: las que estaban desde esa
 * posición se desplazan una hacia abajo. Después reasigna order = 0..n-1 a la columna
 * destino y, si la tarea cambió de columna, compacta también la origen. Así nunca quedan
 * huecos ni duplicados.
 *
 * Nota: el contenedor de Mongo es standalone (sin transacciones). Por eso el orden
 * completo de ambas columnas se reescribe al final: si la operación se interrumpe, una
 * nueva llamada con la misma posición deja el tablero consistente.
 *
 * Devuelve null si la tarea no existe.
 */
export const moveTask = async (id: string, status: TaskStatus, position: number) => {
  const current = await TaskModel.findById(id).select('status').lean()
  if (!current) return null

  const sourceStatus = current.status as TaskStatus

  // Orden de la columna destino sin la tarea movida, con la tarea insertada en `position`.
  const destinationIds = await columnIds(status, id)
  const clamped = Math.min(Math.max(position, 0), destinationIds.length)
  destinationIds.splice(clamped, 0, id)

  // La tarea cambia de estado y de columna en una sola escritura.
  await TaskModel.updateOne({ _id: id }, { $set: { status } })
  await writeColumnOrder(status, destinationIds)

  // Si cambió de columna, la origen se queda sin esa tarea: se reacomoda.
  if (sourceStatus !== status) {
    await writeColumnOrder(sourceStatus, await columnIds(sourceStatus))
  }

  return TaskModel.findById(id).lean()
}

/**
 * Crea una tarea en la columna indicada, al final de su cola.
 * La lógica de negocio vive aquí, sin depender de Express.
 */
export const createTask = async (input: CreateTaskInput) => {
  const task = await TaskModel.create({
    ...input,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    order: await nextOrder(input.status),
  })
  return task.toObject()
}
