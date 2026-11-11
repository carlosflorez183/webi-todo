// Utilidades PKCE (RFC 7636) con método S256.

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const generateRandomString = (length = 64): string => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes).slice(0, length)
}

export const createCodeChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return toBase64Url(new Uint8Array(digest))
}
