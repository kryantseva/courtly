import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useBookingDrawer } from "../../context/BookingDrawerContext";
import { fetchMyBookings, fetchMyPayments } from "../../api/me";
import { ApiError } from "../../api/http";
import { getActiveBranch } from "../../utils/activeBranch";
import { segmentFromApiTime, toneFromApiStatus } from "../../utils/apiBookingTime";
import {
  isPendingPaymentStatus,
  PAYMENT_STATUSES,
  paymentStatusDetail,
  paymentStatusTone,
} from "../../utils/paymentStatus";
import { useOffsetPagination } from "../../hooks/useOffsetPagination";
const TONE_CLASS = {
  ok: "",
  warn: " clientHistoryBadge--warn",
  muted: " clientHistoryBadge--muted",
  cancel: " clientHistoryBadge--cancel",
};
function isoDatePlusDays(base, deltaDays) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatRuDate(iso) {
  if (!iso || typeof iso !== "string") return "";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}.${p[1]}.${p[0]}`;
}
export default function ClientHistoryPage() {
  const [segment, setSegment] = useState("upcoming");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const { openDrawer } = useBookingDrawer();
  const [apiBookings, setApiBookings] = useState( ([]));
  const [apiPayments, setApiPayments] = useState( ([]));
  const [apiLoading, setApiLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [apiError, setApiError] = useState( (null));
  const bookingsPager = useOffsetPagination(10);
  const paymentsPager = useOffsetPagination(10);
  const bookingsOffset = bookingsPager.offset;
  const paymentsOffset = paymentsPager.offset;
  const pageLimit = bookingsPager.limit;
  const activeBranchId = getActiveBranch()?.branchId || "";
  const queryBranch = activeBranchId || undefined;
  useEffect(() => {
    let cancelled = false;
    setApiLoading(true);
    setApiError(null);
    const today = new Date();
    const from = isoDatePlusDays(today, -120);
    const to = isoDatePlusDays(today, 400);
    fetchMyBookings({ from, to, branch_id: queryBranch, limit: pageLimit, offset: bookingsOffset })
      .then((bData) => {
        if (cancelled) return;
        const list = Array.isArray(bData.data) ? bData.data : Array.isArray(bData.bookings) ? bData.bookings : [];
        setApiBookings(list);
        bookingsPager.setMeta(
          bData.meta ?? { total: list.length, limit: pageLimit, offset: bookingsOffset, next: null, previous: null },
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setApiBookings([]);
        bookingsPager.setMeta(null);
        setApiError(e instanceof ApiError ? e.message : "Не удалось загрузить брони");
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingsOffset, pageLimit, queryBranch]);
  useEffect(() => {
    let cancelled = false;
    setPaymentsLoading(true);
    setApiError(null);
    const today = new Date();
    const from = isoDatePlusDays(today, -120);
    const to = isoDatePlusDays(today, 400);
    fetchMyPayments({
      from,
      to,
      branch_id: queryBranch,
      status: paymentStatusFilter || undefined,
      limit: pageLimit,
      offset: paymentsOffset,
    })
      .then((pData) => {
        if (cancelled) return;
        const list = Array.isArray(pData.data) ? pData.data : Array.isArray(pData.payments) ? pData.payments : [];
        setApiPayments(list);
        paymentsPager.setMeta(
          pData.meta ?? { total: list.length, limit: pageLimit, offset: paymentsOffset, next: null, previous: null },
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setApiPayments([]);
        paymentsPager.setMeta(null);
        setApiError(e instanceof ApiError ? e.message : "Не удалось загрузить платежи");
      })
      .finally(() => {
        if (!cancelled) setPaymentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentStatusFilter, pageLimit, paymentsOffset, queryBranch]);
  useEffect(() => {
    bookingsPager.controls.reset();
    paymentsPager.controls.reset();
  }, [activeBranchId]);
  const apiMapped = useMemo(() => {
    return apiBookings.map((b) => {
      const kind = String(b.kind ?? "lesson");
      const hall = String(b.hall ?? "");
      const time = String(b.time ?? "");
      const status = String(b.status ?? "—");
      const date = String(b.date ?? "");
      return {
        id: String(b.id ?? ""),
        title: `${kind === "group" ? "Групповое" : "Запись"} · ${hall}`,
        when: time,
        place: hall,
        status,
        tone: toneFromApiStatus(status),
        seg: segmentFromApiTime(time),
        date,
      };
    });
  }, [apiBookings]);
  const rows = useMemo(() => {
    const filtered = apiMapped.filter((r) => r.seg === segment);
    return filtered.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return segment === "upcoming" ? cmp : -cmp;
      return a.id.localeCompare(b.id);
    });
  }, [apiMapped, segment]);
  const pendingApiPayments = useMemo(() => {
    return apiPayments.filter((p) => {
      return isPendingPaymentStatus(String(p.status ?? ""));
    });
  }, [apiPayments]);
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">История</h1>
      <p className="clientPageLead">Ваши брони и платежи по ним в выбранном филиале (только то, что оформлено под этим аккаунтом).</p>
      {!activeBranchId ? (
        <p className="clientPanelHint" role="note">Показываются данные по всем вашим филиалам.</p>
      ) : null}
      {apiError ? (
        <p className="authError" role="alert">
          {apiError}
        </p>
      ) : null}
      <section className="clientPanel clientPanel--schedule">
        <h2>Записи</h2>
        <div className="clientSegmented" role="tablist" aria-label="Фильтр записей">
          <button
            type="button"
            role="tab"
            aria-selected={segment === "upcoming"}
            className={`clientSegment${segment === "upcoming" ? " clientSegment--active" : ""}`}
            onClick={() => setSegment("upcoming")}
          >
            Предстоящие
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={segment === "past"}
            className={`clientSegment${segment === "past" ? " clientSegment--active" : ""}`}
            onClick={() => setSegment("past")}
          >
            Прошедшие
          </button>
        </div>
        {apiLoading ? (
          <p className="clientEmpty">Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className="clientEmpty">
            {segment === "upcoming"
              ? "Нет предстоящих записей. Запишитесь через кнопку внизу экрана."
              : "Пока нет завершённых записей в этом филиале."}
          </p>
        ) : (
          <ul className="clientList">
            {rows.map((item) => (
              <li key={item.id} className="clientListItem">
                <div>
                  <Link to={`/app/bookings/${item.id}`} className="clientListTitle clientListTitle--link">
                    {item.title}
                  </Link>
                  <span className="clientListMeta">
                    {item.when}
                    {item.place ? ` · ${item.place}` : ""}
                  </span>
                </div>
                <span className={`clientHistoryBadge${TONE_CLASS[item.tone] || ""}`}>{item.status}</span>
              </li>
            ))}
          </ul>
        )}
        {bookingsPager.meta ? (
          <div className="clientBookingActions clientBookingActions--tight">
            <span className="clientPanelHint" aria-live="polite">
              Всего: {bookingsPager.total} · Стр. {bookingsPager.currentPage}/{bookingsPager.totalPages}
            </span>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={bookingsPager.controls.prev}
              disabled={!bookingsPager.controls.canPrev || apiLoading}
            >
              Назад
            </button>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={bookingsPager.controls.next}
              disabled={!bookingsPager.controls.canNext || apiLoading}
            >
              Далее
            </button>
          </div>
        ) : null}
        {segment === "upcoming" ? (
          <button type="button" className="btn btnPrimary clientHistoryCta" onClick={openDrawer}>
            Новая запись
          </button>
        ) : null}
      </section>
      {pendingApiPayments.length > 0 ? (
        <section className="clientPanel clientPaymentsAlert">
          <h2 className="clientPaymentsAlertTitle">Требуется оплата</h2>
          <p className="clientPanelHint">
            {pendingApiPayments.length === 1
              ? "Есть позиция по вашей брони, ожидающая оплаты."
              : `${pendingApiPayments.length} позиций ожидают оплаты.`}
          </p>
          <ul className="clientPaymentsAlertList">
            {pendingApiPayments.map((p) => {
              const bid = String(p.bookingId ?? "");
              const label = String(p.booking ?? "Платёж");
              const paymentId = String(p.id ?? "");
              return (
                <li key={String(p.id)}>
                  <span className="clientPaymentsAlertName">
                    {bid ? (
                      <Link to={`/app/bookings/${encodeURIComponent(bid)}`} className="clientPaymentsAlertName">
                        {label}
                      </Link>
                    ) : (
                      label
                    )}
                    {paymentId ? ` · #${paymentId}` : ""}
                  </span>
                  <span>{`${String(p.amount ?? "")} · ${String(p.status ?? "")}`}</span>
                </li>
              );
            })}
          </ul>
          <p className="clientPanelHint">Откройте связанную бронь, чтобы увидеть детали и статус оплаты.</p>
        </section>
      ) : null}
      <section className="clientPanel clientPanel--schedule">
        <h2>Платежи</h2>
        <div className="clientBookingActions clientBookingActions--tight">
          <label className="formField">
            <span>Статус</span>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                paymentsPager.controls.reset();
              }}
            >
              <option value="">Все статусы</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        {paymentsLoading ? (
            <p className="clientEmpty">Загрузка…</p>
        ) : apiPayments.length === 0 ? (
          <p className="clientEmpty">
            {paymentStatusFilter
              ? `Нет платежей со статусом «${paymentStatusFilter}» в выбранном периоде.`
              : "Нет платежей по вашим броням в выбранном периоде."}
          </p>
        ) : (
          <ul className="clientPaymentsList">
            {apiPayments.map((p) => {
              const bid = String(p.bookingId ?? "");
              const title = String(p.booking ?? "Платёж");
              const status = String(p.status ?? "—");
              const tone = paymentStatusTone(status);
              return (
                <li key={String(p.id)} className="clientPaymentsRow">
                  <div className="clientPaymentsRowMain">
                    {bid ? (
                      <Link to={`/app/bookings/${encodeURIComponent(bid)}`} className="clientPaymentsRowTitle">
                        {title}
                      </Link>
                    ) : (
                      <span className="clientPaymentsRowTitle">{title}</span>
                    )}
                    <span className="clientPaymentsRowMeta">
                      {formatRuDate(String(p.bookingDate ?? ""))}
                      {p.method ? ` · ${String(p.method)}` : ""}
                    </span>
                  </div>
                  <div className="clientPaymentsRowSide">
                    <span className="clientPaymentsAmount">{String(p.amount ?? "")}</span>
                    <span className={`clientHistoryBadge${TONE_CLASS[tone] || ""}`}>{status}</span>
                  </div>
                  <div className="clientPaymentsRowMeta">
                    {paymentStatusDetail(status)}
                    {bid ? (
                      <>
                        {" · "}
                        <Link to={`/app/bookings/${encodeURIComponent(bid)}`} className="clientPanelLink">
                          Перейти к брони
                        </Link>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {paymentsPager.meta ? (
          <div className="clientBookingActions clientBookingActions--tight">
            <span className="clientPanelHint" aria-live="polite">
              Всего: {paymentsPager.total} · Стр. {paymentsPager.currentPage}/{paymentsPager.totalPages}
            </span>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={paymentsPager.controls.prev}
              disabled={!paymentsPager.controls.canPrev || paymentsLoading}
            >
              Назад
            </button>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={paymentsPager.controls.next}
              disabled={!paymentsPager.controls.canNext || paymentsLoading}
            >
              Далее
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
