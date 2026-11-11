import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { observer } from 'mobx-react-lite'
import type { Task } from '../store/BoardStore'
import { useStore } from '../store/StoreContext'
import { TaskCard } from './TaskCard'

/**
 * Tarjeta arrastrable. El desplazamiento de las demás tarjetas (para abrir el hueco)
 * lo anima dnd-kit con transiciones; aquí solo se añade la transición de transform
 * y el estado visual de "actualizando" mientras el backend confirma el movimiento.
 */
export const SortableTaskCard = observer(({ task }: { task: Task }) => {
  const { boardStore } = useStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const pending = boardStore.pendingMoveIds.has(task.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none transition-[opacity,box-shadow] duration-200 ${isDragging ? 'opacity-40' : ''} ${
        pending ? 'animate-pulse ring-1 ring-primary/60 rounded-lg' : ''
      }`}
    >
      <TaskCard task={task} />
    </div>
  )
})
