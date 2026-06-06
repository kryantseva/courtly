import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchEventBracket, generateEventBracket, patchBracketMatch } from "../../api/branchEventBracket";
const USE_API = import.meta.env.VITE_USE_API === "true";
const BRACKET_SIZES =  ([4, 8, 16, 32, 64]);
function BracketMatchEditor({ match, eventId, disabled, onSaved }) {
  const [labelTop, setLabelTop] = useState(match.labelTop ?? "");
  const [labelBottom, setLabelBottom] = useState(match.labelBottom ?? "");
  const [scoreTop, setScoreTop] = useState(match.scoreTop != null ? String(match.scoreTop) : "");
  const [scoreBottom, setScoreBottom] = useState(match.scoreBottom != null ? String(match.scoreBottom) : "");
  const [winner, setWinner] = useState(match.winner ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    setLabelTop(match.labelTop ?? "");
    setLabelBottom(match.labelBottom ?? "");
    setScoreTop(match.scoreTop != null ? String(match.scoreTop) : "");
    setScoreBottom(match.scoreBottom != null ? String(match.scoreBottom) : "");
    setWinner(match.winner ?? "");
    setErr("");
  }, [match]);
  async function onSave(e) {
    e.preventDefault();
    if (!eventId) return;
    setErr("");
    setBusy(true);
    try {
      const body = {
        label_top: labelTop,
        label_bottom: labelBottom,
        score_top: scoreTop.trim() === "" ? null : Number(scoreTop),
        score_bottom: scoreBottom.trim() === "" ? null : Number(scoreBottom),
        winner: winner || "",
      };
      const data = await patchBracketMatch(eventId, match.id, body);
      onSaved(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="bracketMatchCard adminOpsForm" onSubmit={onSave}>
      {err ? (
        <p className="authError" role="alert">
          {err}
        </p>
      ) : null}
      <div className="bracketMatchRow">
        <label className="authField bracketMatchField">
          <span>Верх</span>
          <input value={labelTop} onChange={(e) => setLabelTop(e.target.value)} disabled={disabled || busy} />
        </label>
        <label className="authField bracketMatchField bracketMatchScore">
          <span>Счёт</span>
          <input
            type="number"
            min={0}
            value={scoreTop}
            onChange={(e) => setScoreTop(e.target.value)}
            disabled={disabled || busy}
          />
        </label>
      </div>
      <div className="bracketMatchRow">
        <label className="authField bracketMatchField">
          <span>Низ</span>
          <input value={labelBottom} onChange={(e) => setLabelBottom(e.target.value)} disabled={disabled || busy} />
        </label>
        <label className="authField bracketMatchField bracketMatchScore">
          <span>Счёт</span>
          <input
            type="number"
            min={0}
            value={scoreBottom}
            onChange={(e) => setScoreBottom(e.target.value)}
            disabled={disabled || busy}
          />
        </label>
      </div>
      <label className="authField">
        <span>Победитель</span>
        <select value={winner} onChange={(e) => setWinner(e.target.value)} disabled={disabled || busy}>
          <option value="">—</option>
          <option value="top">Верхняя строка</option>
          <option value="bottom">Нижняя строка</option>
        </select>
      </label>
      <button type="submit" className="btn btnSecondary bracketMatchSave" disabled={disabled || busy}>
        {busy ? "Сохранение…" : "Сохранить матч"}
      </button>
    </form>
  );
}
export default function AdminEventBracketPage() {
  const { eventId } = useParams();
  const [payload, setPayload] = useState( (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const [genSize, setGenSize] = useState(8);
  const [genBusy, setGenBusy] = useState(false);
  const load = useCallback(() => {
    if (!USE_API || !eventId) return;
    setLoading(true);
    setError(null);
    fetchEventBracket(eventId)
      .then((data) => setPayload(data))
      .catch((e) => {
        setPayload(null);
        setError(e instanceof Error ? e.message : "Не удалось загрузить сетку");
      })
      .finally(() => setLoading(false));
  }, [eventId]);
  useEffect(() => {
    load();
  }, [load]);
  function onMatchSaved( data) {
    const saved = data.match;
    const propagated = data.propagatedMatch;
    setPayload((prev) => {
      if (!prev || !Array.isArray(prev.matches)) return prev;
      const byId = new Map(prev.matches.map((m) => [m.id, m]));
      byId.set(saved.id, saved);
      if (propagated) byId.set(propagated.id, propagated);
      const matches = Array.from(byId.values()).sort(
        (a, b) => (a.roundNum ?? 0) - (b.roundNum ?? 0) || (a.slot ?? 0) - (b.slot ?? 0),
      );
      return { ...prev, matches };
    });
  }
  async function onGenerate() {
    if (!USE_API || !eventId) return;
    if (payload?.matches?.length) {
      const ok = window.confirm("Текущая сетка будет удалена и создана заново. Продолжить?");
      if (!ok) return;
    }
    setGenBusy(true);
    setError(null);
    try {
      const data = await generateEventBracket(eventId, { bracket_size: genSize });
      setPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сгенерировать сетку");
    } finally {
      setGenBusy(false);
    }
  }
  if (!USE_API) {
    return (
      <div className="clientPage bracketPage">
        <p className="clientPanelHint">Включите VITE_USE_API для работы со сеткой турнира.</p>
        <Link to="/admin/events" className="clientPanelLink">
          К событиям
        </Link>
      </div>
    );
  }
  const event = payload?.event;
  const rounds = Array.isArray(payload?.rounds) ? payload.rounds : [];
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const isTournament = event?.kind === "tournament";
  return (
    <div className="clientPage bracketPage">
      <nav className="bracketBreadcrumb">
        <Link to="/admin/events" className="clientPanelLink">
          События
        </Link>
        <span className="bracketBreadcrumbSep" aria-hidden>
          /
        </span>
        <span className="bracketBreadcrumbCurrent">Сетка</span>
      </nav>
      <h1 className="clientPageTitle">{event?.title ?? "Сетка турнира"}</h1>
      <p className="clientPageLead">
        Олимпийская система: после сохранения матча с выбранным победителем его имя подставляется в следующий раунд (в
        нужную половину пары).
      </p>
      {loading && !payload ? <p className="clientPanelHint">Загрузка…</p> : null}
      {error ? (
        <p className="authError" role="alert">
          {error}
        </p>
      ) : null}
      {event && isTournament ? (
        <section className="clientPanel adminOpsCard bracketGeneratePanel">
          <h2 className="bracketGenerateTitle">Сетка</h2>
          <p className="clientPanelHint">
            Размер — число участников (степень двойки). По умолчанию при автогенерации из списка событий берётся лимит
            турнира.
          </p>
          <div className="bracketGenerateRow">
            <label className="authField">
              <span>Участников в сетке</span>
              <select value={genSize} onChange={(e) => setGenSize(Number(e.target.value))} disabled={genBusy}>
                {BRACKET_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btnPrimary bracketGenBtn" disabled={genBusy} onClick={onGenerate}>
              {genBusy ? "Генерация…" : matches.length ? "Пересоздать сетку" : "Сгенерировать сетку"}
            </button>
          </div>
          {payload?.bracketSize ? (
            <p className="bracketSizeHint">Текущая сетка: {payload.bracketSize} участников.</p>
          ) : null}
        </section>
      ) : null}
      {event && !isTournament ? (
        <p className="clientPanelHint" role="note">
          Сетка доступна только для событий с типом «турнир».
        </p>
      ) : null}
      {matches.length > 0 ? (
        <div className="bracketRounds">
          {rounds.map((r) => (
            <section key={r.roundNum} className="bracketRound">
              <h2 className="bracketRoundTitle">{r.label}</h2>
              {matches
                .filter((m) => m.roundNum === r.roundNum)
                .map((m) => (
                  <BracketMatchEditor
                    key={m.id}
                    match={m}
                    eventId={eventId ?? ""}
                    disabled={genBusy}
                    onSaved={onMatchSaved}
                  />
                ))}
            </section>
          ))}
        </div>
      ) : null}
      {!loading && payload && isTournament && matches.length === 0 ? (
        <p className="clientPanelHint">Сетка ещё не создана — нажмите «Сгенерировать сетку».</p>
      ) : null}
    </div>
  );
}
