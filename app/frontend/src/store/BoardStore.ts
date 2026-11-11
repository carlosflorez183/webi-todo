import { makeAutoObservable, runInAction } from 'mobx'
import { tasksApi, type CreateTaskPayload, type UpdateTaskPayload } from '../api/tasksApi'

/**
 * Modelo de tarea del tablero (coincide con la respuesta del backend).
 * `assignee` es texto libre por ahora (la gestión de usuarios no está en el alcance).
 */
export interface Task {
  id: string
  title: string
  description: string
  /** Fecha de vencimiento en formato ISO (YYYY-MM-DD), opcional. */
  dueDate?: string | null
  assignee: string
  status: ColumnId
  /** Posición dentro de la columna (append al final). */
  order: number
}

export const COLUMN_IDS = ['todo', 'in_progress', 'done'] as const
export type ColumnId = (typeof COLUMN_IDS)[number]

export interface ColumnDef {
  id: ColumnId
  title: string
}

export const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'En progreso' },
  { id: 'done', title: 'Completado' },
]

/**
 * Estado del tablero. El origen de verdad es el backend: cada carga reemplaza
 * todas las columnas a la vez, así no hay sincronización entre columnas.
 */
export class BoardStore {
  tasks: Task[] = []
  isLoading = false
  error: string | null = null
  /** Tarjetas con un movimiento en curso (se muestran como "actualizando"). */
  pendingMoveIds = new Set<string>()

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  /** Tareas de una columna, ordenadas por posición. */
  tasksByStatus(status: ColumnId): Task[] {
    return this.tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order)
  }

  countByStatus(status: ColumnId): number {
    return this.tasks.filter((t) => t.status === status).length
  }

  /** Recarga el tablero completo desde GET /api/tasks. */
  async loadBoard(token: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const board = await tasksApi.getBoard(token)
      runInAction(() => {
        // Mientras haya movimientos en curso, no sobrescribir el tablero (evita saltos).
        if (this.pendingMoveIds.size === 0) {
          this.tasks = COLUMN_IDS.flatMap((status) => board[status] ?? [])
        }
      })
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'No se pudo cargar el tablero'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  /**
   * Crea una tarea en el backend y, si tiene éxito, recarga el tablero completo
   * para reflejar el estado real de la base (no se agrega en memoria).
   */
  async createTask(token: string, payload: CreateTaskPayload): Promise<void> {
    await tasksApi.createTask(token, payload)
    await this.loadBoard(token)
  }

  /**
   * Mueve una tarea de forma optimista: la posiciona de inmediato en el destino
   * (marcada como "actualizando") y confirma con el backend. Si falla, la devuelve
   * a su columna y posición originales.
   */
  async moveTaskOptimistic(token: string, id: string, status: ColumnId, position: number): Promise<void> {
    const snapshot = this.tasks.map((t) => ({ ...t }))
    runInAction(() => {
      this.applyLocalMove(id, status, position)
      this.pendingMoveIds.add(id)
    })
    try {
      await tasksApi.moveTask(token, id, status, position)
      runInAction(() => this.pendingMoveIds.delete(id))
    } catch (err) {
      runInAction(() => {
        this.tasks = snapshot
        this.pendingMoveIds.delete(id)
        this.error = err instanceof Error ? err.message : 'No se pudo mover la tarea'
      })
    }
  }

  /**
   * Índice de inserción en la columna destino según el elemento sobre el que está el
   * cursor. Si está sobre una tarjeta, aplica la regla de la mitad (antes si está en la
   * mitad superior, después si está en la inferior). Si está sobre la columna, va al final.
   */
  previewIndexFor(
    id: string,
    status: ColumnId,
    over: { id: string | number; rect: { top: number; height: number } } | null | undefined,
    draggedCenterY?: number,
  ): number {
    const destination = this.tasksByStatus(status).filter((t) => t.id !== id)
    if (!over) return destination.length
    const overId = String(over.id)
    if (overId.startsWith('column:')) return destination.length
    const index = destination.findIndex((t) => t.id === overId)
    if (index === -1) return destination.length
    // Centro vertical de la tarjeta arrastrada: si queda en la mitad superior de la
    // tarjeta destino, la inserción va antes; si queda en la inferior, después.
    const midpoint = over.rect.top + over.rect.height / 2
    const cursorY = draggedCenterY ?? midpoint
    return cursorY < midpoint ? index : index + 1
  }

  /** Vista previa: reubica la tarjeta localmente en el hueco tentativo, sin llamar al backend. */
  previewMove(id: string, status: ColumnId, position: number): void {
    runInAction(() => this.applyLocalMove(id, status, position))
  }

  /** Reubica una tarea en el arreglo local y reasigna order 0..n-1 en las columnas afectadas. */
  private applyLocalMove(id: string, status: ColumnId, position: number): void {
    const moving = this.tasks.find((t) => t.id === id)
    if (!moving) return
    const sourceStatus = moving.status

    const destination = this.tasksByStatus(status).filter((t) => t.id !== id)
    const clamped = Math.min(Math.max(position, 0), destination.length)
    destination.splice(clamped, 0, { ...moving, status })

    const source = sourceStatus === status ? [] : this.tasksByStatus(sourceStatus).filter((t) => t.id !== id)

    const reindexed = [...destination.map((t, i) => ({ ...t, order: i })), ...source.map((t, i) => ({ ...t, order: i }))]
    const untouched = this.tasks.filter((t) => t.id !== id && t.status !== status && t.status !== sourceStatus)
    this.tasks = [...untouched, ...reindexed]
  }

  /** Elimina una tarea y reconsulta el tablero (las demás se reacomodan). */
  async deleteTask(token: string, id: string): Promise<void> {
    await tasksApi.deleteTask(token, id)
    await this.loadBoard(token)
  }

  /**
   * Edita una tarea por su _id y reconsulta el tablero para reflejar la posición
   * real (un cambio de estado la mueve de columna y recalcula el orden).
   */
  async updateTask(token: string, id: string, payload: UpdateTaskPayload): Promise<void> {
    await tasksApi.updateTask(token, id, payload)
    await this.loadBoard(token)
  }
}
