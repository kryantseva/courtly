import { storeApiToken } from "../utils/apiAuth";
import { apiGet, apiPatch, apiPost } from "./http";
export function apiLogin(email, password, remember) {
  return apiPost("/auth/login/", { email, password }, { withAuth: false }).then((data) => {
    if (data.token) storeApiToken(data.token, remember);
    return data;
  });
}
export function apiRegister(payload) {
  return apiPost("/auth/register/", payload, { withAuth: false }).then((data) => {
    if (data.token) storeApiToken(data.token, false);
    return data;
  });
}
export function apiMe() {
  return apiGet("/auth/me/", { withAuth: true });
}
export function apiPatchMe(body) {
  return apiPatch("/auth/me/", body, { withAuth: true });
}
export function apiChangePassword(body) {
  return apiPost("/auth/change-password/", body, { withAuth: true });
}
export function apiPasswordResetRequest(body) {
  return apiPost("/auth/password-reset/request/", body, { withAuth: false });
}
export function apiPasswordResetConfirm(body) {
  return apiPost("/auth/password-reset/confirm/", body, { withAuth: false });
}
