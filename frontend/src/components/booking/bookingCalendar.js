const WEEKDAY_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
function mondayBasedOffset(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}
export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const pad = mondayBasedOffset(first.getDay());
  const totalDays = last.getDate();
  const prevLast = new Date(year, monthIndex, 0).getDate();
  const cells = [];
  let day = 1;
  let nextMonthDay = 1;
  for (let row = 0; row < 6; row++) {
    const rowCells = [];
    for (let col = 0; col < 7; col++) {
      const idx = row * 7 + col;
      if (idx < pad) {
        const d = prevLast - (pad - idx - 1);
        rowCells.push({ date: new Date(year, monthIndex - 1, d), inMonth: false });
      } else if (day <= totalDays) {
        rowCells.push({ date: new Date(year, monthIndex, day), inMonth: true });
        day++;
      } else {
        rowCells.push({ date: new Date(year, monthIndex + 1, nextMonthDay), inMonth: false });
        nextMonthDay++;
      }
    }
    cells.push(rowCells);
  }
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  return { cells, monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) };
}
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function formatSelectedDateRu(key) {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
export function weekDatesAroundKey(dateKeyStr) {
  if (!dateKeyStr) return [];
  const [y, m, d] = dateKeyStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const off = mondayBasedOffset(dt.getDay());
  const start = new Date(dt);
  start.setDate(dt.getDate() - off);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x;
  });
}
export { WEEKDAY_SHORT };
