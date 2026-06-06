import { apiGet, apiPost } from "./http";
export function fetchBranchBookings(branchId, range = {}) {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  if (range.q) params.set("q", range.q);
  if (range.room_id != null && range.room_id !== "") params.set("room_id", String(range.room_id));
  if (range.paid != null && range.paid !== "") params.set("paid", String(range.paid));
  if (range.confirmed != null && range.confirmed !== "") params.set("confirmed", String(range.confirmed));
  if (range.status) params.set("status", range.status);
  if (range.kind) params.set("kind", range.kind);
  if (range.mine === true || range.mine === "true" || range.mine === "1") params.set("mine", "true");
  const qs = params.toString();
  const path = `/branches/${encodeURIComponent(branchId)}/bookings/${qs ? `?${qs}` : ""}`;
  return apiGet(path, { withAuth: true });
}
export function createBranchBookingSelf(branchId, body, opts = {}) {
  const headers = {};
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  return apiPost(
    `/branches/${encodeURIComponent(branchId)}/bookings/self/`,
    body,
    { withAuth: true, headers }
  );
}
