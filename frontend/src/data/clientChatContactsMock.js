import { adminFirstNameFromFull, getAdminOnShift } from "../utils/adminOnShiftStorage";
export const CLIENT_BRANCH_ADMIN_FALLBACK = {
  id: "adm-orlova",
  fullName: "Орлова Мария",
  role: "Администратор",
};
const BRANCH_TRAINERS = [
  { id: "st-ilin", name: "Ильин Алексей", role: "Тренер" },
  { id: "st-petrova", name: "Петрова Мария", role: "Тренер" },
];
export const CLIENT_DEMO_MY_TRAINER_IDS = ["st-ilin", "st-petrova"];
export const CLIENT_DEMO_TRAINER_ON_SHIFT_ID = "st-ilin";
export function getClientChatTrainerContacts() {
  const mySet = new Set(CLIENT_DEMO_MY_TRAINER_IDS);
  const onShiftId = CLIENT_DEMO_TRAINER_ON_SHIFT_ID;
  const out = new Map();
  function addTrainer( t, onShift) {
    const prev = out.get(t.id);
    const shift = Boolean(prev?.onShift || onShift);
    out.set(t.id, { id: t.id, name: t.name, role: t.role, onShift: shift });
  }
  for (const id of mySet) {
    const t = BRANCH_TRAINERS.find((x) => x.id === id);
    if (t) addTrainer(t, t.id === onShiftId);
  }
  const shiftTrainer = BRANCH_TRAINERS.find((x) => x.id === onShiftId);
  if (shiftTrainer && !out.has(shiftTrainer.id)) {
    addTrainer(shiftTrainer, true);
  }
  if (out.size === 0 && shiftTrainer) {
    addTrainer(shiftTrainer, true);
  }
  return [...out.values()].sort((a, b) => {
    if (a.onShift !== b.onShift) return a.onShift ? -1 : 1;
    return a.name.localeCompare(b.name, "ru");
  });
}
export function buildClientChatContacts(shiftFromStore) {
  const snap = shiftFromStore === undefined ? getAdminOnShift() : shiftFromStore;
  const fallback = CLIENT_BRANCH_ADMIN_FALLBACK;
  const fullName = snap?.fullName ?? fallback.fullName;
  const id = snap?.id ?? fallback.id;
  const admin = {
    id,
    name: adminFirstNameFromFull(fullName),
    role: fallback.role,
    onShift: Boolean(snap),
  };
  return [admin, ...getClientChatTrainerContacts()];
}
