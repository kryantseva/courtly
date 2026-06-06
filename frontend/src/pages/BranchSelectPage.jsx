import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import CourtlyLogo from "../components/CourtlyLogo";
import BranchHeroGrid from "../components/BranchHeroGrid";
import { fetchBranchList } from "../api/branches";
import { ApiError } from "../api/http";
import { setActiveBranch } from "../utils/activeBranch";
import { clearApiTokens } from "../utils/apiAuth";
import { cabinetPathForRole, getDevRole } from "../utils/sessionRole";
const USE_API = import.meta.env.VITE_USE_API === "true";
const RECENT_BRANCHES = [
  { id: "1", name: "Courtly Downtown", hint: "Последний визит: сегодня", tone: "teal" },
  { id: "2", name: "Courtly Riverside", hint: "Последний визит: 3 дня назад", tone: "coral" },
];
const HERO_TONES = ["teal", "coral", "slate"];
function withHeroTones(list) {
  return list.map((b, i) => ({
    ...b,
    tone: b.tone ?? HERO_TONES[i % HERO_TONES.length],
  }));
}
export default function BranchSelectPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState(() => withHeroTones(RECENT_BRANCHES));
  const [branchListError, setBranchListError] = useState( (null));
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codePending, setCodePending] = useState(false);
  const codeInputRef = useRef(null);
  const codePanelRef = useRef(null);
  useEffect(() => {
    if (!USE_API) return;
    let cancelled = false;
    fetchBranchList()
      .then((data) => {
        if (cancelled || !Array.isArray(data.branches)) return;
        setBranches(withHeroTones(data.branches));
        setBranchListError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          clearApiTokens();
          navigate("/login", { replace: true });
          return;
        }
        setBranchListError("Список филиалов с сервера недоступен, показаны демо-карточки.");
        setBranches(withHeroTones(RECENT_BRANCHES));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  const focusCodeSection = useCallback(() => {
    codePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => codeInputRef.current?.focus(), 350);
  }, []);
  function handleOpenBranch(branch) {
    setActiveBranch({ branchId: branch.id, branchName: branch.name });
    navigate(cabinetPathForRole(getDevRole()));
  }
  async function handleJoinByCode(e) {
    e.preventDefault();
    setCodeError("");
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setCodeError("Введите код, который выдала администрация центра");
      return;
    }
    if (USE_API) {
      setCodePending(true);
      try {
        const { joinBranchByCode } = await import("../api/branches");
        const data = await joinBranchByCode(trimmed);
        const b = data.branch;
        setActiveBranch({ branchId: b.id, branchName: b.name });
        setCode("");
        navigate(cabinetPathForRole(getDevRole()));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearApiTokens();
          navigate("/login", { replace: true });
          return;
        }
        setCodeError(err instanceof Error ? err.message : "Не удалось подключить филиал");
      } finally {
        setCodePending(false);
      }
      return;
    }
    setActiveBranch({
      branchId: null,
      branchName: `Новый филиал (${trimmed})`,
      joinedByCode: trimmed,
    });
    navigate(cabinetPathForRole(getDevRole()));
  }
  function handleSwitchAccount() {
    if (USE_API) clearApiTokens();
  }
  return (
    <div className="branchPage branchPage--rich">
      <div className="branchPageInner">
        <header className="branchHeader">
          <Link to="/" className="brandLink" aria-label="Courtly — на главную">
            <CourtlyLogo size={36} />
          </Link>
          <div className="branchHeaderActions">
            <Link to="/login" className="linkBtn" onClick={handleSwitchAccount}>
              Сменить аккаунт
            </Link>
          </div>
        </header>
        {branchListError ? (
          <p className="branchListApiHint" role="note">
            {branchListError}
          </p>
        ) : null}
        <BranchHeroGrid branches={branches} onSelectBranch={handleOpenBranch} onEmptySlotClick={focusCodeSection} />
        <main className="branchMain">
          <div className="branchIntro">
            <h1>Выберите филиал</h1>
            <p className="branchLead">
              Нажмите на карточку центра выше или подключите новый филиал по коду от администрации. Кабинет после
              входа зависит от роли учётной записи (клиент, тренер, администратор или руководитель сети).
            </p>
          </div>
          <section
            ref={codePanelRef}
            id="branch-code-panel"
            className="branchPanel branchPanel--code"
            aria-labelledby="code-heading"
          >
            <div className="branchPanelHead">
              <span className="branchPanelKicker branchPanelKicker--alt">Новое подключение</span>
              <h2 id="code-heading">Филиал по коду</h2>
              <p className="branchSectionHint">Код выдаёт администратор клуба — на стойке или в сообщении</p>
              {USE_API ? (
                <p className="branchSectionHint branchSectionHint--dim">
                  Демо после <code className="authCode">seed_journal_demo</code>: <strong>DOWNTOWN-DEMO</strong>,{" "}
                  <strong>RIVERSIDE-DEMO</strong>
                </p>
              ) : null}
            </div>
            <form className="joinForm" onSubmit={handleJoinByCode}>
              <label className="authField">
                <span>Код подключения</span>
                <input
                  ref={codeInputRef}
                  id="branch-code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Например: CLUB-9X2K"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              {codeError ? <p className="authError">{codeError}</p> : null}
              <button type="submit" className="btn btnPrimary btnBlock" disabled={codePending}>
                {codePending ? "Подключение…" : "Подключить и войти"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
