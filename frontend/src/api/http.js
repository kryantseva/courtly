import { getApiToken } from "../utils/apiAuth";
function apiBase() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
}
function authHeaders(withAuth) {
  if (!withAuth) return {};
  const t = getApiToken();
  return t ? { Authorization: `Token ${t}` } : {};
}
function formatDrfError(data) {
  if (data == null) return "Ошибка запроса";
  if (typeof data === "string") return data;
  if (typeof data === "object" && "detail" in data) {
    const d =  (data).detail;
    if (Array.isArray(d)) return d.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ");
    if (typeof d === "string") return d;
  }
  if (typeof data === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(" ")}`);
      else if (v != null) parts.push(`${k}: ${String(v)}`);
    }
    if (parts.length) return parts.join(" ");
  }
  return "Ошибка запроса";
}
async function parseBody(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
export async function apiGet(path, { withAuth = true } = {}) {
  const url = `${apiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...authHeaders(withAuth),
    },
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, formatDrfError(data));
  return data;
}
export async function apiPost(path, body, { withAuth = false, headers = {} } = {}) {
  const url = `${apiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(withAuth),
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, formatDrfError(data));
  return data;
}
export async function apiPatch(path, body, { withAuth = true } = {}) {
  const url = `${apiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(withAuth),
    },
    body: JSON.stringify(body),
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, formatDrfError(data));
  return data;
}
export async function apiDelete(path, { withAuth = true } = {}) {
  const url = `${apiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...authHeaders(withAuth),
    },
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, formatDrfError(data));
  return data;
}
