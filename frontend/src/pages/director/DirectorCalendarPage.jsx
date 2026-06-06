import { useMemo } from "react";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
import { ADMIN_ROOMS_MOCK } from "../../data/adminOperationsMock";
import BranchJournalView from "../../components/branchJournal/BranchJournalView";
export default function DirectorCalendarPage() {
  const { activeBranchContextId, branches, networkName } = useManagerNetwork();
  const ctx = useMemo(() => branches.find((b) => b.id === activeBranchContextId), [branches, activeBranchContextId]);
  const courts = useMemo(() => {
    if (ctx?.rooms?.length) {
      return ctx.rooms.map((r) => ({ id: r.id, label: r.name }));
    }
    if (!activeBranchContextId && branches.length > 0) {
      const first = branches.find((b) => b.rooms?.length);
      if (first?.rooms?.length) {
        return first.rooms.map((r) => ({ id: r.id, label: r.name }));
      }
    }
    return ADMIN_ROOMS_MOCK.map((r) => ({ id: r.id, label: r.label }));
  }, [ctx, activeBranchContextId, branches]);
  const branchName = ctx?.name ?? (activeBranchContextId ? "Филиал" : `${networkName} · все площадки`);
  return (
    <div className="clientPage clientPage--flush branchJournalPage branchJournalPage--stack">
      <section className="directorReadOnlyBanner branchJournalBanner" role="note">
        <strong>Только просмотр.</strong> Редактирование журнала и заявок — в кабинете администратора филиала. Карточку
        можно открыть для просмотра деталей.
      </section>
      <BranchJournalView branchName={branchName} courts={courts} readOnly demoRevenueLabel="—" />
    </div>
  );
}
