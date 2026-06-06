export function generateBranchConnectionCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CT-${s}`;
}
