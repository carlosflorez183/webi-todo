import type { ColumnId, Task } from '../store/BoardStore'

/** Forma de la tarea tal como la devuelve el backend. */
export type TaskDto = Task

/** Tablero agrupado por columna, como lo devuelve GET /api/tasks. */
export type BoardDto = Record<ColumnId, TaskDto[]>

/** Datos para crear una tarea (POST /api/tasks). */
export interface CreateTaskPayload {
  title: string
  description?: string
  dueDate?: string
  assignee: string
  status: ColumnId
}

/** Campos editables de una tarea (PATCH /api/tasks/:id). Todos opcionales. */
export interface UpdateTaskPayload {
  title?: string
  description?: string
  /** null para quitar la fecha. */
  dueDate?: string | null
  assignee?: string
  status?: ColumnId
}

/** Error de la API con el mensaje que devuelve el backend. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const BASE = '/api/tasks'

/** Envía una petición autenticada con el access token y devuelve el JSON. */
const request = async <T>(path: string, token: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(body?.error ?? `Error ${res.status} al comunicarse con el servidor`, res.status)
  }
  // 204 No Content no trae cuerpo.
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const tasksApi = {
  /** Tablero completo, agrupado por columna y ordenado. */
  getBoard: (token: string) => request<BoardDto>('', token),

  /** Crea una tarea en la columna indicada (queda al final). */
  createTask: (token: string, payload: CreateTaskPayload) =>
    request<TaskDto>('', token, { method: 'POST', body: JSON.stringify(payload) }),

  /** Mueve una tarea a una columna y posición exactas (drag & drop). */
  moveTask: (token: string, id: string, status: ColumnId, position: number) =>
    request<TaskDto>(`/${encodeURIComponent(id)}/move`, token, {
      method: 'POST',
      body: JSON.stringify({ status, position }),
    }),

  /** Elimina una tarea por su _id y la compacta en su columna. */
  deleteTask: (token: string, id: string) =>
    request<void>(`/${encodeURIComponent(id)}`, token, { method: 'DELETE' }),

  /** Edita una tarea identificada por su _id de Mongo. */
  updateTask: (token: string, id: string, payload: UpdateTaskPayload) =>
    request<TaskDto>(`/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify(payload) }),
}
