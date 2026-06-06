import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mergeMembershipProducts, mergePricingMatrix } from "../data/branchPricingDefaults";
import { clearManagerNetwork, loadManagerNetwork, saveManagerNetwork } from "../utils/managerNetworkStorage";
function normalizeBranch(b) {
  const merged = {
    phone: "",
    email: "",
    workHoursWeekday: "07:00–23:00",
    workHoursWeekend: "08:00–22:00",
    connectionCode: "",
    ...b,
  };
  merged.pricingMatrix = mergePricingMatrix(b.pricingMatrix);
  merged.membershipProducts = mergeMembershipProducts(
    Array.isArray(b.membershipProducts) ? b.membershipProducts : undefined,
  );
  if (typeof merged.pricingSummary !== "string") merged.pricingSummary = "";
  return merged;
}
const DEFAULT_STATE =  ({
  subscriptionActive: true,
  subscriptionPlan: "Courtly Manager",
  networkName: "Моя спортивная сеть",
  branches: [],
  activeBranchContextId: null,
  connectedCodes: [],
});
const ManagerNetworkContext = createContext(null);
function buildInitialState() {
  const loaded = loadManagerNetwork();
  if (!loaded) return { ...DEFAULT_STATE };
  const branches = Array.isArray(loaded.branches) ? loaded.branches.map((b) => normalizeBranch(b)) : [];
  return {
    ...DEFAULT_STATE,
    ...loaded,
    branches,
    activeBranchContextId:
      loaded.activeBranchContextId === null || typeof loaded.activeBranchContextId === "string"
        ? loaded.activeBranchContextId
        : null,
    connectedCodes: Array.isArray(loaded.connectedCodes) ? loaded.connectedCodes : [],
  };
}
export function ManagerNetworkProvider({ children }) {
  const [state, setState] = useState(buildInitialState);
  useEffect(() => {
    saveManagerNetwork(state);
  }, [state]);
  const setNetworkName = useCallback((networkName) => {
    setState((s) => ({ ...s, networkName }));
  }, []);
  const setSubscriptionActive = useCallback((subscriptionActive) => {
    setState((s) => ({ ...s, subscriptionActive }));
  }, []);
  const setActiveBranchContextId = useCallback((activeBranchContextId) => {
    setState((s) => ({ ...s, activeBranchContextId }));
  }, []);
  const addConnectedCode = useCallback((code) => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return;
    setState((s) => ({
      ...s,
      connectedCodes: s.connectedCodes.includes(trimmed) ? s.connectedCodes : [...s.connectedCodes, trimmed],
    }));
  }, []);
  const addBranch = useCallback((branch) => {
    setState((s) => ({ ...s, branches: [...s.branches, normalizeBranch(branch)] }));
  }, []);
  const updateBranch = useCallback((branchId, patch) => {
    setState((s) => ({
      ...s,
      branches: s.branches.map((b) => (b.id === branchId ? normalizeBranch({ ...b, ...patch }) : b)),
    }));
  }, []);
  const removeBranch = useCallback((branchId) => {
    setState((s) => ({
      ...s,
      branches: s.branches.filter((b) => b.id !== branchId),
      activeBranchContextId: s.activeBranchContextId === branchId ? null : s.activeBranchContextId,
    }));
  }, []);
  const resetNetworkDemo = useCallback(() => {
    clearManagerNetwork();
    setState({ ...DEFAULT_STATE });
  }, []);
  const value = useMemo(
    () => ({
      ...state,
      setNetworkName,
      setSubscriptionActive,
      setActiveBranchContextId,
      addConnectedCode,
      addBranch,
      updateBranch,
      removeBranch,
      resetNetworkDemo,
    }),
    [
      state,
      setNetworkName,
      setSubscriptionActive,
      setActiveBranchContextId,
      addConnectedCode,
      addBranch,
      updateBranch,
      removeBranch,
      resetNetworkDemo,
    ],
  );
  return <ManagerNetworkContext.Provider value={value}>{children}</ManagerNetworkContext.Provider>;
}
export function useManagerNetwork() {
  const ctx = useContext(ManagerNetworkContext);
  if (!ctx) {
    throw new Error("useManagerNetwork должен использоваться внутри ManagerNetworkProvider");
  }
  return ctx;
}
