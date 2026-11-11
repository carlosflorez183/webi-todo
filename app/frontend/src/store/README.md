# Store (MobX)

Base de estado de la SPA. En este punto **no hay stores de dominio**: solo la
raíz, la configuración y el acceso desde React.

## Archivos

| Archivo | Responsabilidad |
| :--- | :--- |
| `setup.ts` | Configuración global de MobX. Se importa antes de crear observables. |
| `RootStore.ts` | Composition root: instancia y expone los sub-stores. Singleton `rootStore`. |
| `StoreContext.ts` | Contexto de React + hook `useStore()`. |

`main.tsx` envuelve la app con `<StoreContext.Provider value={rootStore}>`.

## Convenciones

1. **Un archivo por store de dominio** (p. ej. `AuthStore.ts`, `BoardStore.ts`).
2. Cada store es una **clase plana**; no depende de React (fácil de testear).
3. El estado se declara como campo y se hace observable en el constructor con
   `makeAutoObservable(this, {}, { autoBind: true })`.
4. **Toda mutación va dentro de una acción** (`enforceActions: 'always'`).
   Para código asíncrono, mutar dentro de `runInAction(...)`.
5. Los valores derivados se exponen con `get` (computed), no se almacenan.
6. Los sub-stores se crean **dentro del constructor de `RootStore`** y se
   declaran `readonly`, recibiendo `this` si necesitan comunicarse entre sí.

## Cómo añadir un store en el próximo slice

```ts
// AuthStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import type { RootStore } from './RootStore'

export class AuthStore {
  user: User | null = null
  isLoading = false

  constructor(private readonly root: RootStore) {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  async login() {
    this.isLoading = true
    try {
      const user = await api.login()
      runInAction(() => {
        this.user = user
        this.isLoading = false
      })
    } catch (error) {
      runInAction(() => {
        this.isLoading = false
      })
      throw error
    }
  }
}
```

```ts
// RootStore.ts
readonly authStore: AuthStore

constructor() {
  this.authStore = new AuthStore(this)
  makeAutoObservable(this, {}, { autoBind: true })
}
```

## Consumo en componentes

Envolver en `observer` **solo** los componentes que leen observables:

```tsx
import { observer } from 'mobx-react-lite'
import { useStore } from '../store/StoreContext'

export const UserBadge = observer(function UserBadge() {
  const { authStore } = useStore()
  return <span>{authStore.user?.name ?? 'Invitado'}</span>
})
```

- `observer` solo re-renderiza cuando cambian los observables que el componente
  leyó durante el render.
- Estado efímero de un componente (formularios, modales) puede usar
  `useLocalObservable`; no necesita vivir en `RootStore`.
- No usar decoradores: el proyecto no los tiene habilitados.

## Fuera de alcance por ahora

- Persistencia en `localStorage` (se define con `authStore`, Slice 02).
- Stores de autenticación y tablero (Slices 02–03).
- Devtools: la extensión de MobX funciona sin cambios de código.
