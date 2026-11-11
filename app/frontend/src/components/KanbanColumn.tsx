import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ColumnDef, Task } from '../store/BoardStore'
import { useStore } from '../store/StoreContext'
import { CreateTaskModal } from './CreateTaskModal'
import { SortableTaskCard } from './SortableTaskCard'

/** Color diferencial por estado, tomado de los tokens del tema. */
const ACCENT: Record<ColumnDef['id'], string> = {
  todo: 'bg-todo',
  in_progress: 'bg-progress',
  done: 'bg-done',
}

interface Props {
  column: ColumnDef
  tasks: Task[]
}

/**
 * Columna: zona de destino (también cuando está vacía) y lista ordenada de tarjetas.
 * Scroll propio para ocupar el alto disponible.
 */
export const KanbanColumn = ({ column, tasks }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.id}` })
  const { authStore, boardStore } = useStore()
  const [isCreating, setIsCreating] = useState(false)

  return (
    <section
      className={`flex min-h-0 flex-col rounded-xl border bg-surface transition-colors ${
        isOver ? 'border-primary/60' : 'border-border'
      }`}
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className={`h-2.5 w-2.5 rounded-full ${ACCENT[column.id]}`} aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-content">{column.title}</h2>
        <span
          className="ml-auto rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted"
          aria-label={`${tasks.length} tareas`}
        >
          {tasks.length}
        </span>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          aria-label={`Crear tarea en ${column.title}`}
          title="Nueva tarea"
          className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted transition hover:border-primary hover:text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Scroll propio: ocupa el alto restante de la columna */}
      <div ref={setNodeRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Sin tareas</p>
          ) : (
            tasks.map((task) => <SortableTaskCard key={task.id} task={task} />)
          )}
        </SortableContext>
      </div>

      {isCreating && (
        <CreateTaskModal
          column={column}
          onClose={() => setIsCreating(false)}
          onCreate={async (input) => {
            const token = authStore.tokens?.accessToken
            if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
            await boardStore.createTask(token, {
              title: input.title,
              description: input.description,
              dueDate: input.dueDate || undefined,
              assignee: input.assignee,
              status: column.id,
            })
          }}
        />
      )}
    </section>
  )
}
