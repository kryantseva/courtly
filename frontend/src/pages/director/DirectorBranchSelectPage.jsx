import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CourtlyLogo from "../../components/CourtlyLogo";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
export default function DirectorBranchSelectPage() {
  const navigate = useNavigate();
  const {
    branches,
    networkName,
    subscriptionActive,
    connectedCodes,
    addConnectedCode,
    setActiveBranchContextId,
  } = useManagerNetwork();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  function openWholeNetwork() {
    setActiveBranchContextId(null);
    navigate("/director");
  }
  function openBranch(branchId) {
    setActiveBranchContextId(branchId);
    navigate("/director");
  }
  function handleCode(e) {
    e.preventDefault();
    setCodeError("");
    const t = code.trim().toUpperCase();
    if (t.length < 4) {
      setCodeError("Введите код подключения филиала к сети Courtly");
      return;
    }
    addConnectedCode(t);
    setCode("");
  }
  return (
    <div className="branchPage branchPage--rich">
      <div className="branchPageInner">
        <header className="branchHeader">
          <Link to="/" className="brandLink" aria-label="Courtly — на главную">
            <CourtlyLogo size={36} />
          </Link>
          <div className="branchHeaderActions">
            <Link to="/login" className="linkBtn">
              Сменить аккаунт
            </Link>
          </div>
        </header>
        <main className="branchMain">
          <div className="branchIntro">
            <h1>Выбор контекста филиала</h1>
            <p className="branchLead">
              Сеть «{networkName}». Выберите филиал для работы в кабинете руководителя или откройте агрегированный обзор
              по всей сети. Новый филиал можно подключить по коду или создать вручную в разделе «Филиалы».
            </p>
            {!subscriptionActive ? (
              <p className="authError">Активируйте подписку Courtly Manager в разделе «Организация» после входа.</p>
            ) : null}
          </div>
          <section className="branchPanel">
            <div className="branchPanelHead">
              <h2>Режим просмотра</h2>
            </div>
            <button type="button" className="btn btnPrimary btnBlock" onClick={openWholeNetwork}>
              Вся сеть (KPI и аналитика агрегировано)
            </button>
            <p className="clientPanelHint branchSectionHint">
              Удобно для сравнения филиалов и сетевых отчётов. Переключить контекст можно и из шапки кабинета.
            </p>
          </section>
          {branches.length > 0 ? (
            <section className="branchPanel branchPanel--hero">
              <div className="branchPanelHead">
                <h2>Филиалы вашей сети</h2>
              </div>
              <ul className="clientList">
                {branches.map((b) => (
                  <li key={b.id} className="clientListItem">
                    <div>
                      <span className="clientListTitle">{b.name}</span>
                      <span className="clientListMeta">
                        {b.city}
                        {b.connectionCode ? ` · код: ${b.connectionCode}` : ""}
                      </span>
                    </div>
                    <button type="button" className="btn btnSecondary" onClick={() => openBranch(b.id)}>
                      Открыть
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="branchPanel">
              <h2>Пока нет созданных филиалов</h2>
              <p className="clientPanelHint">
                После первого входа создайте филиал в мастере настройки — или подключите существующий объект по коду ниже.
              </p>
              <Link to="/director/branches/new" className="btn btnPrimary">
                Создать филиал
              </Link>
            </section>
          )}
          <section className="branchPanel branchPanel--code" aria-labelledby="dir-code-heading">
            <div className="branchPanelHead">
              <span className="branchPanelKicker branchPanelKicker--alt">Подключение</span>
              <h2 id="dir-code-heading">Код филиала</h2>
              <p className="branchSectionHint">Код выдаётся при регистрации филиала в Courtly или вашим администратором</p>
            </div>
            <form className="joinForm" onSubmit={handleCode}>
              <label className="authField">
                <span>Код подключения</span>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Например: NET-7K2M" autoComplete="off" />
              </label>
              {codeError ? <p className="authError">{codeError}</p> : null}
              <button type="submit" className="btn btnPrimary btnBlock">
                Сохранить код в сети
              </button>
            </form>
            {connectedCodes.length > 0 ? (
              <p className="clientPanelHint">Сохранённые коды (демо): {connectedCodes.join(", ")}</p>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
