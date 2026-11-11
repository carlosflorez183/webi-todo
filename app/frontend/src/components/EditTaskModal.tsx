import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/tasksApi'
import { COLUMNS, type ColumnId, type Task } from '../store/BoardStore'

interface Props {
  task: Task
  /** Guarda los cambios. Debe lanzar error si el backend falla. */
  onSave: (changes: {
    title: string
    description: string
    dueDate: string | null
    assignee: string
    status: ColumnId
  }) => Promise<void>
  /** Elimina la tarea. Debe lanzar error si el backend falla. */
  onDelete: () => Promise<void>
  onClose: () => void
}

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-content placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-60'

/**
 * Modal para editar una tarea. Permite cambiar todos los campos, incluido el estado
 * (puede pasar a cualquiera de las otras columnas). Mientras guarda, bloquea el
 * formulario y los botones para evitar dobles envíos.
 */
export const EditTaskModal = ({ task, onSave, onDelete, onClose }: Props) => {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [assignee, setAssignee] = useState(task.assignee)
  const [status, setStatus] = useState<ColumnId>(task.status)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  /** Ejecuta la eliminación confirmada; mismo manejo de error que el formulario. */
  const confirmDelete = async () => {
    if (isSaving) return
    setError(null)
    setIsSaving(true)
    try {
      await onDelete()
      // Éxito: el tablero ya se reconsultó; se cierra el modal de edición.
      onClose()
    } catch (err) {
      setConfirmingDelete(false)
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la tarea. Intenta de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return

    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }

    setError(null)
    setSuccess(false)
    setIsSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        assignee: assignee.trim(),
        status,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la tarea. Intenta de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-title"
    >
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-card">
        <h2 id="edit-task-title" className="mb-4 text-lg font-semibold text-content">
          Editar tarea
        </h2>

        {error && (
          <p role="alert" className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mb-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            Tarea actualizada correctamente.
          </p>
        )}

        <fieldset disabled={isSaving} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-content">Título *</span>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-content">Descripción</span>
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-content">Asignado a</span>
              <input className={inputClass} value={assignee} onChange={(e) => setAssignee(e.target.value)} maxLength={120} />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-content">Fecha de vencimiento</span>
              <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-content">Estado</span>
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ColumnId)}>
              {COLUMNS.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={isSaving}
            className="rounded-md border border-danger/50 px-4 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Eliminar
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-content disabled:cursor-not-allowed disabled:opacity-50"
            >
              {success ? 'Cerrar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={isSaving || success}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-card">
            <h3 id="confirm-delete-title" className="mb-2 text-base font-semibold text-content">
              ¿Eliminar esta tarea?
            </h3>
            <p className="mb-6 text-sm text-muted">
              Se eliminará «{task.title}». Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isSaving}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-content disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSaving}
                className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
