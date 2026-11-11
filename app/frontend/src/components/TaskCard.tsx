import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import type { Task } from '../store/BoardStore'
import { useStore } from '../store/StoreContext'
import { EditTaskModal } from './EditTaskModal'

const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Tarjeta de tarea. Al pasar el puntero aparece el botón de editar, que abre
 * el modal con todos los campos. Guardar reconsulta el tablero.
 */
export const TaskCard = observer(({ task, overlay = false }: { task: Task; overlay?: boolean }) => {
  const { authStore, boardStore } = useStore()
  const [isEditing, setIsEditing] = useState(false)

  return (
    <article
      className={`group relative rounded-lg border border-border bg-surface-2 p-4 shadow-card transition hover:border-primary/50 ${
        overlay ? 'rotate-1 scale-[1.02] border-primary/60 shadow-xl' : ''
      }`}
    >
      {!overlay && (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={`Editar ${task.title}`}
        title="Editar"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-muted opacity-0 transition hover:text-primary focus:opacity-100 group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      )}

      <h3 className="pr-8 text-sm font-semibold text-content">{task.title}</h3>
      {task.description && <p className="mt-1.5 text-sm leading-relaxed text-muted">{task.description}</p>}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
        {task.assignee ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
              {task.assignee.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{task.assignee}</span>
          </span>
        ) : (
          <span />
        )}
        {task.dueDate && (
          <span className="shrink-0 rounded bg-background px-1.5 py-0.5 font-medium text-content/80">
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {isEditing && (
        <EditTaskModal
          task={task}
          onClose={() => setIsEditing(false)}
          onSave={async (changes) => {
            const token = authStore.tokens?.accessToken
            if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
            await boardStore.updateTask(token, task.id, changes)
          }}
          onDelete={async () => {
            const token = authStore.tokens?.accessToken
            if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
            await boardStore.deleteTask(token, task.id)
          }}
        />
      )}
    </article>
  )
})
