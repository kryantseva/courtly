export function parseApiBookingTime(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const hm = timeStr.match(/(\d{2}):(\d{2})\s*$/);
  if (!hm) return null;
  const h = Number(hm[1]);
  const m = Number(hm[2]);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (timeStr.startsWith("Сегодня")) {
    return new Date(startOfToday.getTime() + (h * 60 + m) * 60_000);
  }
  if (timeStr.startsWith("Завтра")) {
    const t = new Date(startOfToday);
    t.setDate(t.getDate() + 1);
    return new Date(t.getTime() + (h * 60 + m) * 60_000);
  }
  if (timeStr.startsWith("Вчера")) {
    const t = new Date(startOfToday);
    t.setDate(t.getDate() - 1);
    return new Date(t.getTime() + (h * 60 + m) * 60_000);
  }
  const dm = timeStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dm) {
    return new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]), h, m, 0, 0);
  }
  return null;
}
export function segmentFromApiTime(timeStr) {
  const dt = parseApiBookingTime(timeStr);
  if (!dt) return "upcoming";
  return dt.getTime() < Date.now() - 5 * 60_000 ? "past" : "upcoming";
}
export function parseApiBookingStartFromPayload(apiBooking) {
  if (!apiBooking || typeof apiBooking !== "object") return null;
  const dateStr = String(apiBooking.date ?? "").trim();
  const sm = Number(apiBooking.startMin);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && Number.isFinite(sm) && sm >= 0 && sm < 24 * 60) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const h = Math.floor(sm / 60);
    const mm = sm % 60;
    return new Date(y, m - 1, d, h, mm, 0, 0);
  }
  return parseApiBookingTime(String(apiBooking.time ?? ""));
}
export function segmentFromApiBooking(apiBooking) {
  const dt = parseApiBookingStartFromPayload(apiBooking);
  if (!dt) return "upcoming";
  return dt.getTime() < Date.now() - 5 * 60_000 ? "past" : "upcoming";
}
export function toneFromApiStatus(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("отмен")) return "cancel";
  if (s.includes("ожид") || s.includes("оплат")) return "warn";
  if (s.includes("подтверж")) return "ok";
  return "muted";
}
