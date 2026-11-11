import { Schema, model, type InferSchemaType } from 'mongoose'

/** Estados del tablero. Deben coincidir con los ids de columna del frontend. */
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/**
 * Esquema de la tarjeta de tarea.
 *
 * `order` es la posición dentro de su columna. El alta lo asigna al final
 * de la cola; el Slice 04 lo usará para reordenar. Por eso va indexado junto
 * con `status`: el tablero consulta por columna y ordena por posición.
 */
const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    dueDate: { type: Date },
    assignee: { type: String, default: "", trim: true, maxlength: 120 },
    status: { type: String, enum: TASK_STATUSES, default: 'todo', required: true },
    order: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { timestamps: true, collection: 'tasks' },
)

// Consulta del tablero: tareas de una columna en su orden.
taskSchema.index({ status: 1, order: 1 })

export type Task = InferSchemaType<typeof taskSchema>

export const TaskModel = model('Task', taskSchema)
