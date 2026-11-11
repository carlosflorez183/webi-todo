import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/tasksApi'
import type { ColumnDef } from '../store/BoardStore'

interface Props {
  column: ColumnDef
  /** Crea la tarea en la columna indicada. Debe lanzar error si el backend falla. */
  onCreate: (input: { title: string; description: string; dueDate: string; assignee: string }) => Promise<void>
  onClose: () => void
}

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-content placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-60'

/**
 * Modal de alta de tarea. Solo el título es obligatorio. El estado lo fija la columna
 * donde se pulsó "+". Mientras guarda, bloquea formulario y botones para evitar dobles envíos.
 */
export const CreateTaskModal = ({ column, onCreate, onClose }: Props) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignee, setAssignee] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving || success) return

    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        assignee: assignee.trim(),
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la tarea. Intenta de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-card">
        <h2 id="create-task-title" className="mb-1 text-lg font-semibold text-content">
          Nueva tarea
        </h2>
        <p className="mb-4 text-sm text-muted">
          Se creará en <span className="font-medium text-content">{column.title}</span>, al final de la columna.
        </p>

        {error && (
          <p role="alert" className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mb-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            Tarea creada correctamente.
          </p>
        )}

        <fieldset disabled={isSaving} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-content">Título *</span>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
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
        </fieldset>

        <div className="mt-6 flex justify-end gap-3">
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
            {isSaving ? 'Creando…' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </div>
  )
}
