const KEY_SESSION = "courtly.apiToken";
const KEY_LOCAL = "courtly.apiToken.persistent";
export function storeApiToken(token, remember) {
  clearApiTokens();
  try {
    if (remember) {
      localStorage.setItem(KEY_LOCAL, token);
    } else {
      sessionStorage.setItem(KEY_SESSION, token);
    }
  } catch {
  }
}
export function getApiToken() {
  try {
    const a = sessionStorage.getItem(KEY_SESSION);
    if (a) return a;
    return localStorage.getItem(KEY_LOCAL);
  } catch {
    return null;
  }
}
export function clearApiTokens() {
  try {
    sessionStorage.removeItem(KEY_SESSION);
    localStorage.removeItem(KEY_LOCAL);
  } catch {
  }
}
