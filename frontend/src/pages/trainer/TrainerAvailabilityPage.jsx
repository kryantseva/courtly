import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTrainerAvailabilityWindow,
  deleteTrainerAvailabilityWindow,
  fetchTrainerAvailability,
  patchTrainerAvailabilityWindow,
} from "../../api/trainerCabinet";
import { ApiError } from "../../api/http";
import { getActiveBranch } from "../../utils/activeBranch";
const WD_OPTIONS = [
  { v: 0, label: "Пн" },
  { v: 1, label: "Вт" },
  { v: 2, label: "Ср" },
  { v: 3, label: "Чт" },
  { v: 4, label: "Пт" },
  { v: 5, label: "Сб" },
  { v: 6, label: "Вс" },
];
function timeToMin(t) {
  const [h, m] = String(t).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}
export default function TrainerAvailabilityPage() {
  const branch = getActiveBranch();
  const branchId = branch?.branchId || "";
  const [rows, setRows] = useState( ([]));
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");
  const [weekday, setWeekday] = useState(0);
  const [startT, setStartT] = useState("10:00");
  const [endT, setEndT] = useState("14:00");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  function reload() {
    if (!branchId) return Promise.resolve();
    return fetchTrainerAvailability(branchId).then((b) => {
      setRows(Array.isArray(b.data) ? b.data : []);
    });
  }
  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoad(true);
    setErr("");
    reload()
      .catch((e) => {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : "Не удалось загрузить окна");
      })
      .finally(() => {
        if (!cancelled) setLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);
  async function addRow(e) {
    e.preventDefault();
    if (!branchId) return;
    setPending(true);
    setErr("");
    try {
      await createTrainerAvailabilityWindow(branchId, {
        weekday,
        start_min: timeToMin(startT),
        end_min: timeToMin(endT),
        note: note.trim(),
      });
      setNote("");
      await reload();
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Не удалось добавить");
    } finally {
      setPending(false);
    }
  }
  async function toggleActive(row) {
    if (!branchId) return;
    const id = String(row.id ?? "");
    try {
      await patchTrainerAvailabilityWindow(branchId, id, { is_active: !row.isActive });
      await reload();
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Не удалось обновить");
    }
  }
  async function removeRow(id) {
    if (!branchId) return;
    try {
      await deleteTrainerAvailabilityWindow(branchId, id);
      await reload();
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Не удалось удалить");
    }
  }
  if (!branchId) {
    return (
      <div className="clientPage">
        <h1 className="clientPageTitle">Моя доступность</h1>
        <p className="authError">
          Выберите активный филиал на <Link to="/branches">/branches</Link>.
        </p>
      </div>
    );
  }
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Моя доступность</h1>
      <p className="clientPageLead">
        Повторяющиеся окна по дням недели хранятся на сервере. При запросе доступности филиала с параметром{" "}
        <code className="authCode">trainer_user_id</code> остаются только слоты, целиком попадающие в ваши активные окна.
      </p>
      {err ? (
        <p className="authError" role="alert">
          {err}
        </p>
      ) : null}
      <section className="clientPanel clientPanel--accent">
        <h2>Важно</h2>
        <p className="clientPanelHint">
          День недели в системе: 0 = понедельник … 6 = воскресенье (как в Python <code className="authCode">weekday()</code>
          ).
        </p>
      </section>
      <section className="clientPanel">
        <h2>Текущие интервалы</h2>
        {load ? (
          <p className="clientEmpty">Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className="clientEmpty">Окон пока нет — добавьте ниже.</p>
        ) : (
          <ul className="clientList">
            {rows.map((row) => (
              <li key={String(row.id)} className="clientListItem">
                <div>
                  <span className="clientListTitle">
                    {WD_OPTIONS.find((w) => w.v === row.weekday)?.label ?? row.weekday}: {String(row.start ?? "")}–
                    {String(row.end ?? "")}
                    {row.isActive === false ? " · выкл." : ""}
                  </span>
                  {row.note ? <span className="clientListMeta">{String(row.note)}</span> : null}
                </div>
                <div className="clientBookingActions clientBookingActions--tight">
                  <button type="button" className="btn btnSecondary" onClick={() => void toggleActive(row)}>
                    {row.isActive === false ? "Включить" : "Выключить"}
                  </button>
                  <button type="button" className="btn btnSecondary" onClick={() => void removeRow(String(row.id))}>
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form className="trainerAvailabilityForm" onSubmit={addRow}>
          <h3 className="trainerAvailabilityFormTitle">Добавить интервал</h3>
          <div className="trainerAvailabilityGrid">
            <label className="authField">
              <span>День недели</span>
              <select
                className="bookingTrainerPrefSelect"
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value))}
              >
                {WD_OPTIONS.map((w) => (
                  <option key={w.v} value={w.v}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="authField">
              <span>Начало</span>
              <input type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
            </label>
            <label className="authField">
              <span>Конец</span>
              <input type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
            </label>
            <label className="authField trainerAvailabilityNote">
              <span>Комментарий</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
            </label>
          </div>
          <button type="submit" className="btn btnPrimary" disabled={pending}>
            {pending ? "Сохранение…" : "Добавить"}
          </button>
        </form>
      </section>
    </div>
  );
}
