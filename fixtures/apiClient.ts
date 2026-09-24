export function getBasicAuthHeader(username: string, password: string) {
  return {
    Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
  };
}

export function getBearerAuthHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}
