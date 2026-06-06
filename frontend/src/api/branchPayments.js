import { apiGet, apiPatch } from "./http";
export function fetchBranchPayments(branchId, opts = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.q) params.set("q", opts.q);
  if (opts.status) params.set("status", opts.status);
  if (opts.room_id != null && opts.room_id !== "") params.set("room_id", String(opts.room_id));
  if (opts.mine === true || opts.mine === "true" || opts.mine === "1") params.set("mine", "true");
  const qs = params.toString();
  const path = `/branches/${encodeURIComponent(branchId)}/payments/${qs ? `?${qs}` : ""}`;
  return apiGet(path, { withAuth: true });
}
export function patchPayment(paymentId, body) {
  return apiPatch(`/payments/${encodeURIComponent(paymentId)}/`, body, { withAuth: true });
}
export function fetchPaymentDetail(paymentId) {
  return apiGet(`/payments/${encodeURIComponent(paymentId)}/`, { withAuth: true });
}
