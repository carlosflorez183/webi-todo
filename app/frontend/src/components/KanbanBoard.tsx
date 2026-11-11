import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, type DragOverEvent, closestCorners } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { observer } from 'mobx-react-lite'
import { COLUMNS, type ColumnId } from '../store/BoardStore'
import { useStore } from '../store/StoreContext'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'

/** Tablero de tres columnas con arrastre entre columnas y dentro de ellas. */
export const KanbanBoard = observer(() => {
  const { authStore, boardStore } = useStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    // Activación con un pequeño desplazamiento para no confundir con un clic en el botón de editar.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeTask = activeId ? boardStore.tasks.find((t) => t.id === activeId) : undefined

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))

  // Centro vertical de la tarjeta arrastrada en el momento actual (para la regla de la mitad).
  const draggedCenterY = (event: DragOverEvent | DragEndEvent): number | undefined => {
    const rect = event.active.rect.current.translated ?? event.active.rect.current.initial
    return rect ? rect.top + rect.height / 2 : undefined
  }

  // Vista previa: mientras se arrastra, reubica la tarjeta en el hueco tentativo (sin backend).
  const onDragOver = (event: DragOverEvent) => {
    const overColumn = resolveColumn(event.over?.id) ?? columnOfCard(event.over?.id)
    if (!overColumn || !activeId) return
    const previewIndex = boardStore.previewIndexFor(activeId, overColumn, event.over as never, draggedCenterY(event))
    boardStore.previewMove(activeId, overColumn, previewIndex)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const id = activeId
    setActiveId(null)
    const token = authStore.tokens?.accessToken
    if (!id || !token) return

    const overColumn = resolveColumn(event.over?.id) ?? columnOfCard(event.over?.id)
    if (!overColumn) {
      void boardStore.loadBoard(token)
      return
    }
    const finalIndex = boardStore.previewIndexFor(id, overColumn, event.over as never, draggedCenterY(event))
    void boardStore.moveTaskOptimistic(token, id, overColumn, finalIndex)
  }

  /** Columna de una tarjeta sobre la que se suelta (si el destino es una tarjeta). */
  const columnOfCard = (overId: string | number | undefined): ColumnId | null => {
    if (!overId) return null
    const task = boardStore.tasks.find((t) => t.id === String(overId))
    return task ? task.status : null
  }

  const onDragCancel = () => {
    setActiveId(null)
    const token = authStore.tokens?.accessToken
    if (token) void boardStore.loadBoard(token)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => (
          <KanbanColumn key={column.id} column={column} tasks={boardStore.tasksByStatus(column.id)} />
        ))}
      </div>

      <DragOverlay>{activeTask ? <TaskCard task={activeTask} overlay /> : null}</DragOverlay>
    </DndContext>
  )
})

/** Convierte el id del elemento sobre el que se suelta en el id de columna. */
const resolveColumn = (overId: string | number | undefined): ColumnId | null => {
  if (!overId) return null
  const id = String(overId)
  if (id.startsWith('column:')) return id.slice(7) as ColumnId
  // Si sobre una tarjeta, su columna es la de esa tarjeta (lo resuelve el store).
  return null
}
