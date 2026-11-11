# Webi Todo

Tablero Kanban de tareas con tres columnas (**To Do**, **En progreso** y **Completado**), con autenticación mediante **Amazon Cognito** y persistencia en **MongoDB**.

Proyecto de curso. Monorepo con un frontend en React y un backend en Express, conectados por el proxy de Vite.

## Funcionalidades

- **Inicio de sesión** con Cognito (Authorization Code + PKCE) y Hosted UI.
- **Sesión persistente** en `localStorage`, con renovación automática mediante *refresh token* y validación contra Cognito al cargar la aplicación.
- **Tablero Kanban** con conteo por columna y tarjetas con título, descripción, fecha de vencimiento y persona asignada.
- **CRUD de tareas**: crear (botón **+** en cada columna), editar (todos los campos, incluido el estado) y eliminar con confirmación.
- **Arrastrar y soltar** entre columnas y dentro de una columna, con inserción en una posición exacta y vista previa del hueco.
- **Backend protegido**: cada endpoint de tareas valida el *access token* de Cognito (firma JWKS, emisor, `token_use`, cliente y expiración).

## Arquitectura

```
app/
├── frontend/          SPA React + TypeScript + Vite
│   └── src/
│       ├── auth/      Configuración de Cognito y utilidades PKCE
│       ├── api/       Cliente HTTP del backend
│       ├── store/     Estado con MobX (AuthStore, BoardStore)
│       └── components/ Tablero, columnas, tarjetas y modales
└── backend/           API Express + TypeScript
    ├── src/
    │   ├── config.ts        Variables de entorno validadas
    │   ├── db/              Conexión a MongoDB (Mongoose)
    │   ├── middleware/      Validación del token y del cuerpo (zod)
    │   ├── models/          Esquema de tarea
    │   ├── routes/          Endpoints HTTP (capa fina)
    │   └── services/        Lógica de negocio (orden, movimientos)
    ├── mongo-init/          Creación del usuario de aplicación
    └── docker-compose.yml   MongoDB para desarrollo
```

El backend separa **rutas** (HTTP), **servicios** (lógica de negocio sin Express) y **modelos** (MongoDB). El frontend mantiene el estado en MobX y el origen de verdad es el backend: el tablero se reconsulta tras cada cambio.

### Modelo de tarea

| Campo | Tipo | Notas |
|---|---|---|
| `title` | texto | Obligatorio, máx. 200 |
| `description` | texto | Opcional, máx. 2000 |
| `dueDate` | fecha | Opcional |
| `assignee` | texto | Opcional, texto libre |
| `status` | enum | `todo`, `in_progress`, `done` |
| `order` | entero | Posición dentro de la columna (0..n-1), indexado con `status` |

## Requisitos

- Node.js 20.6 o superior (usa `--env-file`).
- Docker Desktop (para MongoDB).
- Un User Pool de Cognito con un App Client configurado.

## Puesta en marcha

### 1. Base de datos

```bash
cd app/backend
cp .env.example .env        # y completa las credenciales
npm run db:up               # levanta MongoDB en Docker
```

El contenedor crea un usuario de aplicación con permisos solo sobre la base `webi-todo`. El usuario administrador se usa únicamente para la configuración inicial.

### 2. Variables de entorno

**`app/backend/.env`**

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión con el usuario de aplicación |
| `MONGO_DATABASE` | Nombre de la base (`webi-todo`) |
| `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD` | Administrador, solo para Docker Compose |
| `MONGO_APP_PASSWORD` | Contraseña del usuario de aplicación |
| `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` | Pool y cliente para validar tokens |

**`app/frontend/.env`** (solo valores públicos del cliente)

| Variable | Descripción |
|---|---|
| `VITE_COGNITO_DOMAIN` | Dominio del Hosted UI |
| `VITE_COGNITO_CLIENT_ID` | App Client |
| `VITE_COGNITO_REDIRECT_URI` | `http://localhost:5173/callback` |
| `VITE_COGNITO_LOGOUT_URI` | `http://localhost:5173/` |
| `VITE_COGNITO_SCOPES` | `openid email profile` |
| `VITE_AUTH_REFRESH_MARGIN_SECONDS` | Segundos antes del vencimiento para renovar (300) |

### 3. Cognito

En el App Client, registra:

- **Allowed callback URLs:** `http://localhost:5173/callback`
- **Allowed sign-out URLs:** `http://localhost:5173/`

### 4. Ejecución

```bash
# Backend
cd app/backend && npm run dev        # API en http://localhost:3001

# Frontend (otra terminal)
cd app/frontend && npm run dev       # App en http://localhost:5173
```

Abre `http://localhost:5173`, inicia sesión y el tablero cargará desde la base.

## Scripts útiles

| Comando (en `app/backend`) | Qué hace |
|---|---|
| `npm run db:up` | Levanta MongoDB |
| `npm run db:down` | Detiene MongoDB (conserva datos) |
| `npm run db:reset` | Detiene MongoDB y **borra** los datos |
| `npm run db:logs` | Muestra los logs de MongoDB |
| `npm run build` | Compila el backend a `dist/` |

## API

Todos los endpoints de tareas exigen `Authorization: Bearer <access_token>`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio y de la base (público) |
| `GET` | `/api/tasks` | Tablero agrupado por columna |
| `POST` | `/api/tasks` | Crear tarea (al final de su columna) |
| `PATCH` | `/api/tasks/:id` | Editar campos (incluido el estado) |
| `POST` | `/api/tasks/:id/move` | Mover a una columna y posición exactas |
| `DELETE` | `/api/tasks/:id` | Eliminar tarea |

## Seguridad

- Las credenciales de la base y de AWS **nunca** se versionan: los `.env` están ignorados por git. Usa los `.env.example` como plantilla.
- El frontend solo usa valores públicos de Cognito. No hay secretos en el cliente.
- El backend valida los tokens con las claves públicas del pool (JWKS) y no consulta a Cognito en cada petición.
- MongoDB exige autenticación y la aplicación usa un usuario con permisos mínimos.

Las credenciales que aparecen en la configuración de desarrollo son **temporales** y deben cambiarse antes de cualquier uso fuera de la máquina local.

## Estado del proyecto

Avance por slices de la especificación (`SOLUCION.md`):

- [x] Slice 01: scaffolding, proxy y tema base
- [x] Slice 02: login con Cognito (PKCE), sesión y logout
- [x] Slice 03: CRUD del tablero Kanban
- [x] Slice 04: arrastrar y soltar con reordenamiento

## Licencia

Uso académico.
