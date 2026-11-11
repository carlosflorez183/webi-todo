// Debe ejecutarse antes de crear cualquier observable (ver ./setup.ts).
import './setup'

import { makeAutoObservable } from 'mobx'
import { AuthStore } from './AuthStore'
import { BoardStore } from './BoardStore'

/**
 * Raíz de estado de la SPA (composition root).
 *
 * Slice 02: authStore (sesión de Cognito).
 * Slice 03: boardStore (tareas por columna).
 */
export class RootStore {
  readonly authStore: AuthStore
  readonly boardStore: BoardStore

  constructor() {
    this.authStore = new AuthStore()
    this.boardStore = new BoardStore()
    // autoBind: las acciones conservan `this` al pasarse como callback.
    makeAutoObservable(this, { authStore: false }, { autoBind: true })
  }
}

export const rootStore = new RootStore()
