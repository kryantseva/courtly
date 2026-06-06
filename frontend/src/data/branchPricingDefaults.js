export function defaultPricingMatrix() {
  return {
    hallTypes: [
      { id: "court", label: "Корт" },
      { id: "hall_group", label: "Зал групповой" },
      { id: "hall_func", label: "Зал функционала" },
    ],
    timeBands: [
      { id: "morning", label: "Утро 06:00–12:00" },
      { id: "afternoon", label: "День 12:00–17:00" },
      { id: "evening", label: "Вечер 17:00–22:00" },
      { id: "prime", label: "Пик и выходные" },
    ],
    clientCategories: [
      { id: "std", label: "Стандарт" },
      { id: "child", label: "Детский" },
      { id: "student", label: "Студент" },
      { id: "corp", label: "Корпоратив" },
    ],
    cells: {},
  };
}
export function pricingCellKey(hallId, timeId, categoryId) {
  return `${hallId}|${timeId}|${categoryId}`;
}
export function defaultMembershipProducts() {
  return [
    {
      id: "mp-default-1",
      name: "Абонемент 10 посещений",
      visitsTotal: 10,
      unlimitedVisits: false,
      validityDays: 90,
      priceRub: 4500,
      categoryId: "std",
      notes: "",
    },
  ];
}
export function mergePricingMatrix(raw) {
  const d = defaultPricingMatrix();
  if (!raw || typeof raw !== "object") return d;
  return {
    hallTypes: Array.isArray(raw.hallTypes) && raw.hallTypes.length > 0 ? raw.hallTypes : d.hallTypes,
    timeBands: Array.isArray(raw.timeBands) && raw.timeBands.length > 0 ? raw.timeBands : d.timeBands,
    clientCategories:
      Array.isArray(raw.clientCategories) && raw.clientCategories.length > 0 ? raw.clientCategories : d.clientCategories,
    cells: raw.cells && typeof raw.cells === "object" ? raw.cells : {},
  };
}
export function mergeMembershipProducts(raw) {
  if (!Array.isArray(raw)) return defaultMembershipProducts();
  if (raw.length === 0) return [];
  return raw.map((m, i) => ({
    id: typeof m.id === "string" ? m.id : `mp-${i}-${Date.now()}`,
    name: typeof m.name === "string" ? m.name : "Без названия",
    visitsTotal: typeof m.visitsTotal === "number" ? m.visitsTotal : 10,
    unlimitedVisits: Boolean(m.unlimitedVisits),
    validityDays: typeof m.validityDays === "number" ? m.validityDays : 30,
    priceRub: typeof m.priceRub === "number" ? m.priceRub : 0,
    categoryId: typeof m.categoryId === "string" ? m.categoryId : "std",
    notes: typeof m.notes === "string" ? m.notes : "",
  }));
}
