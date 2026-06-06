import { apiGet } from "./http";
export function fetchMyBookings(opts = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.branch_id) params.set("branch_id", opts.branch_id);
  if (opts.status) params.set("status", opts.status);
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiGet(`/me/bookings/${qs ? `?${qs}` : ""}`, { withAuth: true });
}
export function fetchMyPayments(opts = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.branch_id) params.set("branch_id", opts.branch_id);
  if (opts.status) params.set("status", opts.status);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiGet(`/me/payments/${qs ? `?${qs}` : ""}`, { withAuth: true });
}
