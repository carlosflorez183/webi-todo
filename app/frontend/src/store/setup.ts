import { configure } from 'mobx'

/**
 * Configuración global de MobX.
 *
 * Se importa una sola vez desde `RootStore`, antes de instanciar el store raíz,
 * para que aplique a todos los observables de la aplicación.
 *
 * - enforceActions: 'always'      → el estado solo cambia dentro de acciones.
 * - computedRequiresReaction      → avisa si un computed se lee fuera de un contexto reactivo.
 * - reactionRequiresObservable    → avisa si una reacción no lee ningún observable.
 * - observableRequiresReaction    → desactivado: permite leer estado en handlers/efectos sin ruido.
 */
configure({
  enforceActions: 'always',
  computedRequiresReaction: true,
  reactionRequiresObservable: true,
  observableRequiresReaction: false,
})
