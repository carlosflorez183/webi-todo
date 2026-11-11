import { z } from 'zod'
import { TASK_STATUSES } from '../models/task.model.js'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha no válida')

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(200),
  description: z.string().trim().max(2000).default(''),
  dueDate: isoDate.optional(),
  assignee: z.string().trim().max(120).default(""),
  status: z.enum(TASK_STATUSES).default('todo'),
})

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000),
    dueDate: isoDate.nullable(),
    assignee: z.string().trim().max(120),
    status: z.enum(TASK_STATUSES),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Envía al menos un campo a modificar')

/** Movimiento: columna destino y posición (0 = inicio) dentro de ella. */
export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES),
  position: z.number().int().min(0),
})

export type MoveTaskInput = z.infer<typeof moveTaskSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
