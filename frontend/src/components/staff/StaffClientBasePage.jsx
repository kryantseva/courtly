import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBranchCrmClient, fetchBranchCrmClients } from "../../api/branchCrm";
import {
  CLIENT_BASE_MOCK,
  filterClientsByBranchId,
  filterClientsForAdminBranch,
} from "../../data/clientBaseMock";
import { getActiveBranch } from "../../utils/activeBranch";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
const USE_API = import.meta.env.VITE_USE_API === "true";
function mapCrmApiToClientRecord(d, branchLabel) {
  const ref = String(d.clientRef ?? "");
  const debt = d.debt && typeof d.debt === "object" ? d.debt : null;
  const pending = debt && typeof debt.pendingPaymentCount === "number" ? debt.pendingPaymentCount : 0;
  const unpaid = debt && typeof debt.unpaidBookingCount === "number" ? debt.unpaidBookingCount : 0;
  return {
    id: ref,
    branchId: String(d.branchId ?? ""),
    branchName: String(d.branchName ?? branchLabel),
    name: String(d.name ?? ref),
    email: String(d.email ?? ""),
    phone: String(d.phone ?? ""),
    status: pending > 0 || unpaid > 0 ? "Требует внимания" : "Активен",
    tags: pending > 0 ? ["к оплате"] : [],
    lastVisit: String(d.lastVisit ?? "—"),
    adminMessengerConversationId: null,
    upcomingBookings: Array.isArray(d.upcomingBookings) ? d.upcomingBookings : [],
    visitHistory: Array.isArray(d.visitHistory) ? d.visitHistory : [],
    payments: Array.isArray(d.payments)
      ? d.payments.map((p) => ({
          id: String(p.id),
          date: String(p.date),
          amount: String(p.amount),
          method: String(p.method ?? ""),
          status: String(p.status),
          label: String(p.label ?? ""),
        }))
      : [],
  };
}
export function StaffClientBaseView({
  variant,
  clients,
  branchLabel,
  externalSelectedId = null,
  onExternalSelectedIdChange,
}) {
  const [query, setQuery] = useState("");
  const [internalSelectedId, setInternalSelectedId] = useState( (null));
  const selectedId = onExternalSelectedIdChange ? externalSelectedId : internalSelectedId;
  const setSelectedId = onExternalSelectedIdChange ?? setInternalSelectedId;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const inBookings = c.upcomingBookings.some(
        (b) =>
          b.trainerName.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q) ||
          b.whenLabel.toLowerCase().includes(q),
      );
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        c.branchName.toLowerCase().includes(q) ||
        inBookings
      );
    });
  }, [clients, query]);
  const selected = selectedId
    ? clients.find((c) => c.id === selectedId) ?? CLIENT_BASE_MOCK.find((c) => c.id === selectedId) ?? null
    : null;
  const detailPath = variant === "admin" ? (id) => `/admin/users/${id}` : (id) => `/director/clients/${id}`;
  return (
    <div className={`clientPage staffClientBase staffClientBase--${variant}`}>
      <h1 className="clientPageTitle">Клиентская база</h1>
      <p className="clientPageLead">
        Единый справочник: контакты, ближайшие записи с тренерами, история визитов и оплаты. Контекст:{" "}
        <strong>{branchLabel}</strong>
        {variant === "director" ? (
          <>
            . Фильтр по филиалу — в шапке кабинета.{" "}
            <Link to="/director/chat" className="clientPanelLink">
              Мессенджер сети
            </Link>
          </>
        ) : (
          <>
            .{" "}
            <Link to="/admin/chat" className="clientPanelLink">
              Перейти в чат
            </Link>
          </>
        )}
      </p>
      <div className="staffClientBaseLayout">
        <section className="staffClientBaseListPanel" aria-label="Список клиентов">
          <div className="staffClientBaseToolbar">
            <input
              type="search"
              className="staffClientBaseSearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя, телефон, email, тренер, вид занятия…"
              autoComplete="off"
            />
            <p className="staffClientBaseCount">
              <strong>{filtered.length}</strong> из {clients.length}
            </p>
          </div>
          <ul className="staffClientBaseList">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`staffClientBaseRow${selectedId === c.id ? " staffClientBaseRow--active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className="staffClientBaseRowMain">
                    <span className="staffClientBaseRowName">{c.name}</span>
                    {variant === "director" ? (
                      <span className="staffClientBaseRowBranch">{c.branchName}</span>
                    ) : null}
                    <span className="staffClientBaseRowBooking">
                      {c.upcomingBookings[0]
                        ? `${c.upcomingBookings[0].whenLabel} · ${c.upcomingBookings[0].title} · ${c.upcomingBookings[0].trainerName}`
                        : "Нет ближайших записей"}
                    </span>
                  </span>
                  <span className={`staffClientBaseStatus staffClientBaseStatus--${statusTone(c.status)}`}>
                    {c.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="staffClientBaseDetail" aria-label="Карточка клиента">
          {selected ? (
            <div className="staffClientBaseDetailInner">
              <header className="staffClientBaseDetailHead">
                <div>
                  <h2 className="staffClientBaseDetailTitle">{selected.name}</h2>
                  <p className="staffClientBaseDetailMeta">
                    {selected.email} · {selected.phone}
                    {variant === "director" ? ` · ${selected.branchName}` : null}
                  </p>
                  <div className="staffClientBaseTags">
                    {selected.tags.map((t) => (
                      <span key={t} className="staffClientBaseTag">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="staffClientBaseDetailActions">
                  {variant === "admin" && selected.adminMessengerConversationId ? (
                    <Link
                      className="btn btnPrimary"
                      to="/admin/chat"
                      state={{ messengerFocusId: selected.adminMessengerConversationId }}
                    >
                      Чат в Courtly
                    </Link>
                  ) : variant === "director" ? (
                    <>
                      <a className="btn btnSecondary" href={`mailto:${selected.email}`}>
                        Написать на почту
                      </a>
                      <a className="btn btnSecondary" href={`tel:${selected.phone.replace(/\s/g, "")}`}>
                        Позвонить
                      </a>
                      <Link className="btn btnPrimary" to="/director/chat">
                        Мессенджер сети
                      </Link>
                    </>
                  ) : (
                    <span className="staffClientBaseHint">Чат с клиентом появится после первого обращения</span>
                  )}
                  <Link className="btn btnSecondary" to={detailPath(selected.id)}>
                    Полная карточка
                  </Link>
                </div>
              </header>
              <div className="staffClientBaseColumns">
                <div className="staffClientBaseCard">
                  <h3>Ближайшие записи</h3>
                  <ul className="staffClientBaseBookingList">
                    {selected.upcomingBookings.length === 0 ? (
                      <li className="staffClientBaseEmpty">Нет запланированных занятий</li>
                    ) : (
                      selected.upcomingBookings.map((b) => (
                        <li key={b.id} className="staffClientBaseBookingItem">
                          <div>
                            <strong>{b.whenLabel}</strong>
                            <span className="staffClientBaseBookingTitle">{b.title}</span>
                          </div>
                          <div className="staffClientBaseBookingTrainer">
                            <span className="staffClientBaseTrainerLabel">Тренер</span>
                            {variant === "admin" && b.trainerStaffId ? (
                              <Link to={`/admin/users/${b.trainerStaffId}`} className="clientPanelLink">
                                {b.trainerName}
                              </Link>
                            ) : (
                              <span>{b.trainerName}</span>
                            )}
                            <span className="staffClientBasePlace">{b.place}</span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="staffClientBaseCard">
                  <h3>История визитов</h3>
                  <ul className="staffClientBaseHistoryList">
                    {selected.visitHistory.length === 0 ? (
                      <li className="staffClientBaseEmpty">Пока нет посещений</li>
                    ) : (
                      selected.visitHistory.map((v) => (
                        <li key={v.id}>
                          <span className="staffClientBaseHistoryDate">{v.date}</span>
                          <span>
                            {v.summary} · {v.place}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="staffClientBaseCard staffClientBaseCard--wide">
                  <h3>Оплаты</h3>
                  <div className="staffClientBaseTableWrap">
                    <table className="staffClientBaseTable">
                      <thead>
                        <tr>
                          <th>Дата</th>
                          <th>Сумма</th>
                          <th>Способ</th>
                          <th>Статус</th>
                          <th>Описание</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.payments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="staffClientBaseEmptyCell">
                              Нет платежей
                            </td>
                          </tr>
                        ) : (
                          selected.payments.map((p) => (
                            <tr key={p.id}>
                              <td>{p.date}</td>
                              <td>{p.amount}</td>
                              <td>{p.method}</td>
                              <td>{p.status}</td>
                              <td>{p.label}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="staffClientBasePlaceholder">
              <p>Выберите клиента слева, чтобы увидеть записи, историю и оплаты.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
function AdminStaffClientApiInner({ branchId, branchLabel }) {
  const [list, setList] = useState( ([]));
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState( (null));
  const [detailById, setDetailById] = useState(
     ({}),
  );
  const [detailLoading, setDetailLoading] = useState( (null));
  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    fetchBranchCrmClients(branchId)
      .then((raw) => {
        const clients = raw.data?.clients ?? raw.clients;
        if (!cancelled) setList(Array.isArray(clients) ? clients : []);
      })
      .catch((e) => {
        if (!cancelled) {
          setList([]);
          setListError(e instanceof Error ? e.message : "Не удалось загрузить клиентов");
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);
  const [selectedId, setSelectedId] = useState( (null));
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setDetailLoading(selectedId);
    fetchBranchCrmClient(branchId, selectedId)
      .then((raw) => {
        const d = raw.data ?? raw;
        if (cancelled || !d || typeof d !== "object") return;
        setDetailById((prev) => ({
          ...prev,
          [selectedId]: mapCrmApiToClientRecord(d, branchLabel),
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setDetailById((prev) => {
            const next = { ...prev };
            delete next[selectedId];
            return next;
          });
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, branchId, branchLabel]);
  const clients = useMemo(() => {
    return list.map((row) => {
      const ref = String(row.clientRef ?? row.id ?? "");
      const full = detailById[ref];
      if (full) return full;
      return {
        id: ref,
        branchId,
        branchName: branchLabel,
        name: String(row.name ?? ref),
        email: "",
        phone: String(row.phone ?? ""),
        status: String(row.statusHint ?? "Активен"),
        tags: [],
        lastVisit: String(row.lastBookingDate ?? "—"),
        adminMessengerConversationId: null,
        upcomingBookings: [],
        visitHistory: [],
        payments: [],
      };
    });
  }, [list, detailById, branchId, branchLabel]);
  return (
    <div className="staffClientBaseApiWrap">
      {listError ? (
        <p className="authError" role="alert">
          {listError}
        </p>
      ) : null}
      {listLoading ? <p className="clientPanelHint">Загрузка клиентской базы филиала…</p> : null}
      {detailLoading ? (
        <p className="clientPanelHint" aria-live="polite">
          Карточка «{detailLoading}»…
        </p>
      ) : null}
      <StaffClientBaseView
        variant="admin"
        clients={clients}
        branchLabel={branchLabel}
        externalSelectedId={selectedId}
        onExternalSelectedIdChange={setSelectedId}
      />
    </div>
  );
}
function DirectorStaffClientBaseInner() {
  const { activeBranchContextId, branches } = useManagerNetwork();
  const clients = useMemo(() => filterClientsByBranchId(activeBranchContextId), [activeBranchContextId]);
  const branchLabel = activeBranchContextId
    ? branches.find((b) => b.id === activeBranchContextId)?.name ?? "Филиал"
    : "Все филиалы сети";
  return <StaffClientBaseView variant="director" clients={clients} branchLabel={branchLabel} />;
}
export default function StaffClientBasePage({ variant }) {
  if (variant === "director") {
    return <DirectorStaffClientBaseInner />;
  }
  const ab = getActiveBranch();
  const branchLabel = ab?.branchName ?? "Филиал (демо)";
  if (USE_API && ab?.branchId) {
    return <AdminStaffClientApiInner branchId={ab.branchId} branchLabel={branchLabel} />;
  }
  const clients = filterClientsForAdminBranch(ab?.branchName);
  return <StaffClientBaseView variant="admin" clients={clients} branchLabel={branchLabel} />;
}
function statusTone(status) {
  if (/долг|ожидает/i.test(status)) return "warn";
  if (/новый/i.test(status)) return "neutral";
  return "ok";
}
