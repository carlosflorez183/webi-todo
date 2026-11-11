# Especificación de Slices de la Solución

---

## Slice 01: Scaffolding (Proyecto + Microservicio + Proxy + Tema base + Shell/Branding)

### Contenido

| Campo | Detalles |
| :--- | :--- |
| **Objetivo** | Levantar el andamiaje completo y ejecutable de la solución: SPA React + Vite + TS que arranca con su shell básico y branding "Webi Todo", el store base de estado (MobX) integrado en la app, un microservicio Express + TS estructurado, el proxy de Vite enrutando al backend sin CORS, y un tema base que da fundamento visual al resto de slices. |
| **Flujo** | `npm create vite` (React + TS) $\rightarrow$ app arranca con shell básico (header con branding "Webi Todo" + layout de una sola pantalla) $\rightarrow$ tema base aplicado $\rightarrow$ store de MobX inicializado y provisto a la app (raíz de estado para slices posteriores) $\rightarrow$ microservicio Express + TS con endpoint de salud $\rightarrow$ proxy de Vite apunta al microservicio $\rightarrow$ llamada de prueba desde la SPA llega al backend. |
| **Cobertura** | <ul><li>**2.6:** SPA con Vite (build + dev server) y proxy hacia el microservicio, sin CORS.</li><li>**2.5 (parcial):** Esqueleto del microservicio Express + TypeScript (sin lógica de tareas ni validación de token).</li><li>**2.2 (parcial):** Header con branding "Webi Todo" (icono + nombre) y shell de una sola pantalla que alojará el tablero. Base arquitectural: store de estado (MobX) inicializado, listo para alojar sesión (Slice 02) y tablero (Slice 03+). Scope añadido: tema base (no pedido por la narrativa).</li></ul> |
| **Contexto** | Vite como build + dev server; Express + TS; proxy de Vite evita CORS; store de MobX como base de gestión de estado de la SPA; tema base + shell/branding como fundamento visual para materializar la UI de slices posteriores (info de usuario, tablero, tarjetas). |
| **Estimación manual** | 1-2 días |
| **Estimación con IA** | 0.5-1 hora |
| **Dependencias** | N/A |
| **Fuera de alcance** | Autenticación e info de usuario/logout en el header (Slice 02); validación de token (Slice 03); modelo/CRUD de tareas (Slice 03); UI del tablero (Slice 03+). |
| **Notas** | El tema base y el shell/branding básico son extensión de alcance intencional (curso demo) para tener consistencia visual desde el inicio. El shell nace sin las piezas de auth; esas llegan en el Slice 02. |

### Criterios de aceptación
- `npm run dev` levanta la SPA React + TS y arranca con el shell básico visible.
- El header muestra el branding "Webi Todo" (icono + nombre).
- El tema base está definido y aplicado (tokens/estilos base disponibles para el resto de la app).
- El store de MobX está inicializado y provisto a la app (raíz de estado disponible para el resto de slices).
- El microservicio Express + TS arranca y expone un endpoint de salud (p. ej. `/health`).
- Una petición desde la SPA se enruta por el proxy de Vite al microservicio sin configurar CORS.

---

## Slice 02: Login System

### Contenido

| Campo | Detalles |
| :--- | :--- |
| **Objetivo** | Entregar el ciclo completo de autenticación: el usuario entra con usuario y contraseña vía Hosted UI de Cognito (Authorization Code + PKCE), la SPA administra la sesión en un store de MobX (tokens persistidos en `localStorage`, renovación con refresh token), muestra la info del usuario autenticado en el header y puede cerrar sesión forzando re-autenticación. |
| **Flujo** | (Precondición: Cognito configurado, usuarios precreados) Usuario no autenticado $\rightarrow$ SPA genera `code_verifier` / `code_challenge` $\rightarrow$ redirige al Hosted UI de Cognito $\rightarrow$ login con usuario y contraseña $\rightarrow$ Cognito devuelve authorization code $\rightarrow$ SPA intercambia code + verifier por tokens (ID + access + refresh) $\rightarrow$ guarda los tokens en el store de MobX (persistido en `localStorage`) $\rightarrow$ reconoce sesión (persiste al recargar) $\rightarrow$ al vencer el access token, renueva con el refresh token $\rightarrow$ muestra info del usuario en el header $\rightarrow$ logout limpia el store/`localStorage` + cierra la sesión en Cognito (endpoint de logout) $\rightarrow$ siguiente acceso re-autentica. |
| **Cobertura** | <ul><li>**2.1:** Login PKCE, intercambio de code, sesión en store de MobX (tokens en `localStorage`), renovación con refresh token.</li><li>**2.1:** Logout + cierre de sesión en Cognito.</li><li>**2.2 (parcial):** Mostrar la info del usuario logueado en el header + acción de logout en el header.</li></ul> |
| **Contexto** | OAuth2 Authorization Code + PKCE (cliente público/SPA); Hosted UI de Cognito con autenticación de usuario y contraseña (usuarios creados directamente en Cognito); tokens (ID + access + refresh) administrados en un store de MobX y persistidos en `localStorage`, con renovación vía refresh token al vencerse el access token; logout contra el endpoint de logout de Cognito para invalidar la sesión del proveedor; Cognito asumido preexistente y configurado (Supuestos). |
| **Estimación manual** | 2-3 días |
| **Estimación con IA** | 1-2 horas |
| **Dependencias** | Slice 01 |
| **Fuera de alcance** | Validación del token en el backend (Slice 03); branding "Webi Todo" y layout del shell (Slice 01); tablero y CRUD (Slice 03+). |
| **Notas** | Verificar el ciclo completo login - logout - re-login. La configuración de Cognito queda como precondición fuera del slice. |

### Criterios de aceptación
- Un usuario no autenticado que abre la SPA es redirigido al Hosted UI de Cognito.
- El login se realiza con usuario y contraseña contra el User Pool de Cognito (usuarios precreados).
- El flujo usa Authorization Code + PKCE (se genera `code_verifier` / `code_challenge` y se intercambia el code por tokens).
- La SPA administra la sesión en un store de MobX, almacena el ID token, el access token y el refresh token en `localStorage` y reconoce la sesión al recargar/navegar.
- Cuando el access token se vence, la sesión se renueva usando el refresh token sin requerir login manual.
- El header muestra la información del usuario autenticado y ofrece la acción de logout.
- El logout limpia los tokens de `localStorage` y cierra la sesión en Cognito a través de su endpoint de logout.
- Tras el logout, el siguiente acceso obliga a re-autenticarse.

---

## Slice 03: CRUD de tareas en el tablero Kanban

### Contenido

| Campo | Detalles |
| :--- | :--- |
| **Objetivo** | Entregar la gestión completa de tareas desde el tablero: el usuario ve las tres columnas con sus tarjetas, crea tareas por columna, edita sus detalles y las elimina, con todo persistido en MongoDB a través de endpoints del microservicio protegidos por validación de token. |
| **Flujo** | Tablero renderiza 3 columnas (Pendiente / En progreso / Done) con tareas recuperadas del backend $\rightarrow$ botón "+" por columna abre formulario de creación $\rightarrow$ al crear, la tarea nace con el estado de esa columna y se coloca al final de la cola $\rightarrow$ editar tarjeta permite modificar título, descripción, estado y fecha de vencimiento $\rightarrow$ eliminar tarjeta la quita $\rightarrow$ cada operación llama a un endpoint del microservicio (validado con access token) que persiste/recupera en MongoDB. |
| **Cobertura** | <ul><li>**2.3:** Tres columnas, botón "+" por columna, alta con el estado de la columna, campos título/descripción/fecha de vencimiento (+ estado en edición), tablero agrupado por estado desde el backend.</li><li>**2.5:** Endpoints Express + TS para crear/consultar/editar/eliminar, persistencia en MongoDB con modelo de estado y orden (append al final), validación de access token en cada endpoint.</li></ul> |
| **Contexto** | Express + TS; MongoDB; modelo de tarea con estado y campo de orden (creación = final de la columna); estado del tablero (tareas por columna) administrado en el store de MobX; cada endpoint valida el access token de Cognito antes de responder; peticiones enrutadas por el proxy de Vite. |
| **Estimación manual** | 3-4 días |
| **Estimación con IA** | 2-3 horas |
| **Dependencias** | Slice 01, Slice 02 |
| **Fuera de alcance** | Drag & drop, reordenamiento arbitrario dentro/entre columnas y feedback visual (Slice 04). |
| **Notas** | El modelo ya incluye el campo de orden (semántica "append al final") para que el Slice 04 solo agregue posicionamiento arbitrario. Cambiar el estado vía formulario de edición es válido; el cambio por arrastre es del Slice 04. Slice grande (límite superior de 3 días); podría partirse backend/UI si se requiere. |

### Criterios de aceptación
- El tablero muestra tres columnas: Pendiente, En progreso y Done.
- Cada columna tiene un botón "+" que abre un formulario de creación.
- Una tarea creada desde una columna nace con el estado de esa columna y aparece al final de la cola de esa columna.
- El formulario permite capturar título, descripción y fecha de vencimiento (opcional).
- Se puede editar una tarjeta existente (título, descripción, estado, fecha de vencimiento).
- Se puede eliminar una tarjeta existente.
- El tablero muestra las tareas agrupadas por estado, recuperadas desde el backend.
- El microservicio expone endpoints para crear, consultar, editar y eliminar, y los cambios persisten en MongoDB.
- Cada endpoint valida el access token de Cognito; una petición sin token o con token inválido es rechazada.

---

## Slice 04: Drag & drop, reordenamiento y feedback

### Contenido

| Campo | Detalles |
| :--- | :--- |
| **Objetivo** | Perfeccionar la experiencia del tablero: el usuario arrastra tarjetas entre columnas (cambiando su estado) y dentro de una columna a cualquier posición, con el orden persistido y feedback visual que confirma cada movimiento. |
| **Flujo** | Usuario toma una tarjeta $\rightarrow$ la arrastra a otra columna (cambia estado) o a otra posición dentro de la misma columna (inicio/final/intermedia) $\rightarrow$ al soltar, se aplica el cambio de estado/posición $\rightarrow$ se persiste el nuevo orden vía endpoint $\rightarrow$ animación/feedback confirma que la tarjeta "cayó" en su lugar. |
| **Cobertura** | **2.4:** Arrastre entre columnas (cambio de estado), soltar en cualquier posición de la columna destino, orden significativo que se conserva y persiste, feedback visual de cada movimiento. |
| **Contexto** | Reutiliza el modelo de orden del Slice 03, extendiéndolo a posiciones arbitrarias (inserciones intermedias) con estrategia de ordenamiento estable; persistencia del estado + posición vía endpoints validados. |
| **Estimación manual** | 2-3 días |
| **Estimación con IA** | 1-2 horas |
| **Dependencias** | Slice 03 |
| **Fuera de alcance** | N/A |
| **Notas** | Persistir posiciones arbitrarias requiere ordenamiento estable en el modelo. El feedback visual es parte central de la UX esperada, no opcional. |

### Criterios de aceptación
- El usuario puede arrastrar una tarjeta de una columna a otra, cambiando su estado.
- El usuario puede soltar una tarjeta en cualquier posición de la columna destino (inicio, final o intermedio).
- El orden de las tarjetas dentro de cada columna se conserva y persiste en el backend.
- Cada movimiento efectivo muestra feedback visual (animación de confirmación).