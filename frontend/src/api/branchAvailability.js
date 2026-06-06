import { apiGet } from "./http";
export function fetchBranchAvailability(branchId, opts) {
  const params = new URLSearchParams();
  if (opts.date) params.set("date", opts.date);
  if (opts.duration != null) params.set("duration", String(opts.duration));
  if (opts.room_id) params.set("room_id", opts.room_id);
  const qs = params.toString();
  return apiGet(`/branches/${encodeURIComponent(branchId)}/availability/${qs ? `?${qs}` : ""}`, { withAuth: true });
}
