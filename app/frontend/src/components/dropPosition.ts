/**
 * Cálculo puro de la posición de inserción al arrastrar una tarjeta.
 *
 * Regla: si el cursor está en la mitad superior de una tarjeta, la inserción va
 * ANTES de ella; en la mitad inferior, DESPUÉS. Así se distinguen sin ambigüedad:
 *  - primera: cursor en la mitad superior de la tarjeta que hoy es la primera;
 *  - última: cursor en la mitad inferior de la última, o en la zona vacía del final;
 *  - intermedia: entre dos tarjetas, según la mitad;
 *  - columna vacía: cualquier punto de la columna es posición 0.
 */

export interface CardRect {
  /** Id de la tarjeta (sin contar la que se arrastra). */
  id: string
  top: number
  height: number
}

/**
 * Devuelve el índice de inserción (0..n) dado el Y del cursor y los rectángulos
 * de las tarjetas de la columna destino (en orden visual, de arriba a abajo).
 */
export const insertionIndex = (cursorY: number, cards: CardRect[]): number => {
  for (let i = 0; i < cards.length; i++) {
    const midpoint = cards[i].top + cards[i].height / 2
    if (cursorY < midpoint) return i
  }
  return cards.length
}
