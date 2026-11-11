// Se ejecuta UNA vez, al crear el volumen vacío (docker-entrypoint-initdb.d).
// Crea el usuario de APLICACIÓN con permisos solo sobre la base webi-todo.
// Las credenciales llegan por variables de entorno del contenedor (no van en el código).
const appDb = db.getSiblingDB(process.env.MONGO_DATABASE || 'webi-todo');

appDb.createUser({
  user: process.env.MONGO_APP_USERNAME,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: process.env.MONGO_DATABASE || 'webi-todo' }],
});
