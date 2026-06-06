export const CLIENT_PROFILE_MOCK = {
  fullName: "Алина Смирнова",
  email: "you@example.com",
  phone: "+7 900 000-00-00",
};
const PROFILE_STORAGE = "courtly_client_profile_v1";
export function getClientProfileLive() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE);
    if (!raw) return CLIENT_PROFILE_MOCK;
    return { ...CLIENT_PROFILE_MOCK, ...JSON.parse(raw) };
  } catch {
    return CLIENT_PROFILE_MOCK;
  }
}
