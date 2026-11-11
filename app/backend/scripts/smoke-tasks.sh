#!/usr/bin/env bash
# Prueba rápida del CRUD de tareas contra el backend en marcha.
# Uso: TOKEN="<access_token>" ./scripts/smoke-tasks.sh
# El access token se copia de localStorage (clave webi-todo.auth -> accessToken).
set -euo pipefail

API="${API:-http://localhost:3001/api/tasks}"
: "${TOKEN:?Define TOKEN con el access token de Cognito}"
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

echo "1) Alta en 'todo'"
ID=$(curl -s "${AUTH[@]}" -X POST "$API" \
  -d '{"title":"Tarea de prueba","description":"smoke","assignee":"Smoke","status":"todo","dueDate":"2026-12-01"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
echo "   id=$ID"

echo "2) Tablero"
curl -s "${AUTH[@]}" "$API" | node -pe 'const b=JSON.parse(require("fs").readFileSync(0)); Object.entries(b).map(([k,v])=>k+": "+v.length).join(", ")'

echo "3) Editar -> 'done' (debe ir al final de 'done')"
curl -s "${AUTH[@]}" -X PATCH "$API/$ID" -d '{"status":"done"}' | node -pe 'const t=JSON.parse(require("fs").readFileSync(0)); "status="+t.status+" order="+t.order'

echo "4) Eliminar"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" "${AUTH[@]}" -X DELETE "$API/$ID"

echo "5) Validación: título vacío (400)"
curl -s -w " HTTP %{http_code}\n" "${AUTH[@]}" -X POST "$API" -d '{"title":"","assignee":"x"}'
