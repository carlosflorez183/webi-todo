// Las variables se cargan con `node --env-file=.env` (ver scripts en package.json).
// Aquí solo se leen y se valida que existan; si falta alguna, el proceso no arranca.

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa backend/.env`)
  }
  return value
}

const region = required('COGNITO_REGION')
const userPoolId = required('COGNITO_USER_POOL_ID')

export const config = {
  port: Number(process.env.PORT ?? 3001),
  mongoUri: required('MONGODB_URI'),
  mongoDatabase: required('MONGO_DATABASE'),
  cognito: {
    region,
    userPoolId,
    clientId: required('COGNITO_CLIENT_ID'),
    /** Emisor esperado de los tokens del pool (claim `iss`). */
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  },
} as const
