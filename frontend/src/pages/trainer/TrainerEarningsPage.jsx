import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyTrainerEarnings } from "../../api/trainerCabinet";
import { ApiError } from "../../api/http";
import { getActiveBranch } from "../../utils/activeBranch";
function firstDayOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export default function TrainerEarningsPage() {
  const branchId = getActiveBranch()?.branchId || "";
  const [body, setBody] = useState( (null));
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");
  const range = useMemo(() => {
    const today = new Date();
    const from = firstDayOfMonth(new Date(today.getFullYear(), today.getMonth() - 2, 1));
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: isoDate(from), to: isoDate(to) };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoad(true);
    setErr("");
    fetchMyTrainerEarnings({
      from: range.from,
      to: range.to,
      branch_id: branchId || undefined,
    })
      .then((b) => {
        if (!cancelled) setBody(b);
      })
      .catch((e) => {
        if (!cancelled) {
          setBody(null);
          setErr(e instanceof ApiError ? e.message : "Не удалось загрузить начисления");
        }
      })
      .finally(() => {
        if (!cancelled) setLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, branchId]);
  const totals = body && typeof body.totals === "object" ? body.totals : null;
  const periods = Array.isArray(body?.periods) ? body.periods : [];
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Доходы</h1>
      <p className="clientPageLead">
        Сводка по оплаченным броням, где вы назначены тренером. В «заработано» входят только позиции со статусом оплаты
        «Оплачено» и отметкой занятия «Проведено». Суммы берутся из поля начисления тренеру по платежу (или оценка 50% от
        суммы в подписи, если начисление не задано).
      </p>
      {!branchId ? (
        <p className="clientPanelHint" role="note">
          Филиал не выбран — данные по всем вашим филиалам.{" "}
          <Link to="/branches">Выбрать филиал</Link>.
        </p>
      ) : null}
      {err ? (
        <p className="authError" role="alert">
          {err}
        </p>
      ) : null}
      {load ? (
        <p className="clientEmpty">Загрузка…</p>
      ) : (
        <>
          <section className="staffKpiGrid staffKpiGrid--tight">
            <article className="staffKpiCard">
              <span className="staffKpiLabel">Заработано (проведённые)</span>
              <span className="staffKpiValue staffKpiValue--sm">
                {totals?.earnedCompletedRub != null ? `${totals.earnedCompletedRub} ₽` : "—"}
              </span>
            </article>
            <article className="staffKpiCard">
              <span className="staffKpiLabel">Оплачено, другие отметки</span>
              <span className="staffKpiValue staffKpiValue--sm">
                {totals?.paidAllocatedOtherOutcomesRub != null ? `${totals.paidAllocatedOtherOutcomesRub} ₽` : "—"}
              </span>
            </article>
          </section>
          <section className="clientPanel clientPanel--schedule">
            <h2>Помесячно</h2>
            {periods.length === 0 ? (
              <p className="clientEmpty">Нет данных за период.</p>
            ) : (
              <ul className="clientList">
                {periods.map((p) => (
                  <li key={String(p.period)} className="clientListItem">
                    <div>
                      <span className="clientListTitle">{String(p.period)}</span>
                      <span className="clientListMeta">{String(p.sessionsCompleted ?? 0)} проведённых занятий</span>
                    </div>
                    <span className="clientHistoryBadge">{String(p.earnedRub ?? 0)} ₽</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="clientPanel">
            <h2>Строки начислений (до 200)</h2>
            {lines.length === 0 ? (
              <p className="clientEmpty">Нет оплаченных позиций за период.</p>
            ) : (
              <ul className="clientList">
                {lines.map((row) => (
                  <li key={String(row.paymentId)} className="clientListItem">
                    <div>
                      <span className="clientListTitle">
                        {String(row.bookingDate ?? "")} · {String(row.amountLabel ?? "")}
                      </span>
                      <span className="clientListMeta">
                        <Link to={`/trainer/sessions/${encodeURIComponent(String(row.bookingId ?? ""))}`}>
                          Занятие {String(row.bookingId ?? "")}
                        </Link>
                        {row.branchId ? ` · филиал ${String(row.branchId)}` : ""}
                      </span>
                    </div>
                    <span className="clientPanelHint">
                      {String(row.trainerRub ?? 0)} ₽ · {String(row.sessionOutcome ?? "")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
