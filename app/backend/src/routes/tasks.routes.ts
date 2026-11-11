import { Router, type Request, type Response } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { TASK_STATUSES, TaskModel, type TaskStatus } from '../models/task.model.js'
import { createTaskSchema, moveTaskSchema, updateTaskSchema, type CreateTaskInput, type MoveTaskInput, type UpdateTaskInput } from './tasks.schemas.js'
import { createTask, moveTask } from '../services/tasks.service.js'

export const tasksRouter = Router()

// Todas las rutas de tareas exigen access token válido.
tasksRouter.use(requireAuth)

/** Respuesta pública de una tarea (sin campos internos de Mongo). */
const toDto = (task: { _id: unknown; title: string; description?: string; dueDate?: Date | null; assignee: string; status: string; order: number; createdAt?: Date; updatedAt?: Date }) => ({
  id: String(task._id),
  title: task.title,
  description: task.description ?? '',
  dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
  assignee: task.assignee,
  status: task.status,
  order: task.order,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
})

const isValidId = (id: string): boolean => mongoose.isValidObjectId(id)

/** Siguiente posición al final de una columna. */
const nextOrder = async (status: TaskStatus): Promise<number> => {
  const last = await TaskModel.findOne({ status }).sort({ order: -1 }).select('order').lean()
  return last ? last.order + 1 : 0
}

/** Compacta las posiciones de una columna (0..n-1) tras sacar una tarea. */
const compactColumn = async (status: TaskStatus): Promise<void> => {
  const tasks = await TaskModel.find({ status }).sort({ order: 1 }).select('_id').lean()
  await TaskModel.bulkWrite(
    tasks.map((t, index) => ({ updateOne: { filter: { _id: t._id }, update: { $set: { order: index } } } })),
  )
}

// GET /api/tasks  -> tablero agrupado por estado
tasksRouter.get('/', async (_req: Request, res: Response) => {
  const tasks = await TaskModel.find().sort({ status: 1, order: 1 }).lean()
  const board = Object.fromEntries(TASK_STATUSES.map((s) => [s, [] as ReturnType<typeof toDto>[]]))
  for (const task of tasks) board[task.status].push(toDto(task))
  res.json(board)
})

// POST /api/tasks  -> alta al final de la columna (la lógica está en el servicio)
tasksRouter.post('/', validateBody(createTaskSchema), async (req: Request, res: Response) => {
  const task = await createTask(req.body as CreateTaskInput)
  res.status(201).json(toDto(task))
})

// POST /api/tasks/:id/move  -> reordenar: columna destino + posición exacta (drag & drop)
tasksRouter.post('/:id/move', validateBody(moveTaskSchema), async (req: Request, res: Response) => {
  const id = String(req.params.id)
  if (!isValidId(id)) {
    res.status(400).json({ error: 'Identificador no válido' })
    return
  }
  const input = req.body as MoveTaskInput
  const moved = await moveTask(id, input.status, input.position)
  if (!moved) {
    res.status(404).json({ error: 'Tarea no encontrada' })
    return
  }
  res.json(toDto(moved))
})

// PATCH /api/tasks/:id  -> editar; si cambia de columna, va al final de la nueva
tasksRouter.patch('/:id', validateBody(updateTaskSchema), async (req: Request, res: Response) => {
  const id = String(req.params.id)
  if (!isValidId(id)) {
    res.status(400).json({ error: 'Identificador no válido' })
    return
  }
  const input = req.body as UpdateTaskInput
  const current = await TaskModel.findById(id).lean()
  if (!current) {
    res.status(404).json({ error: 'Tarea no encontrada' })
    return
  }

  const changes: Record<string, unknown> = { ...input }
  if (input.dueDate !== undefined) changes.dueDate = input.dueDate ? new Date(input.dueDate) : null

  const movesColumn = input.status !== undefined && input.status !== current.status
  if (movesColumn) {
    changes.order = await nextOrder(input.status as TaskStatus)
  }

  const updated = await TaskModel.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true }).lean()
  if (movesColumn) await compactColumn(current.status)
  res.json(toDto(updated!))
})

// DELETE /api/tasks/:id  -> eliminar y compactar la columna
tasksRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  if (!isValidId(id)) {
    res.status(400).json({ error: 'Identificador no válido' })
    return
  }
  const removed = await TaskModel.findByIdAndDelete(id).lean()
  if (!removed) {
    res.status(404).json({ error: 'Tarea no encontrada' })
    return
  }
  await compactColumn(removed.status)
  res.status(204).end()
})
