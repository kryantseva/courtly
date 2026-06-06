import { useSyncExternalStore } from "react";
import { getAdminOnShift, subscribeAdminOnShift } from "../utils/adminOnShiftStorage";
export function useAdminOnShift() {
  return useSyncExternalStore(subscribeAdminOnShift, getAdminOnShift, getAdminOnShift);
}
