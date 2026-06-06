import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BranchPricingEditor from "../../components/director/BranchPricingEditor";
import { defaultMembershipProducts, defaultPricingMatrix } from "../../data/branchPricingDefaults";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
const STEPS = [
  { id: 0, title: "Филиал", hint: "Название и адрес" },
  { id: 1, title: "Помещения", hint: "Залы, корты, вместимость" },
  { id: 2, title: "Роли", hint: "Тренеры и персонал" },
  { id: 3, title: "Администраторы", hint: "По ID или новая учётная запись" },
  { id: 4, title: "Правила брони", hint: "Одновременные записи" },
  { id: 5, title: "Тарифы", hint: "Абонементы и матрица цен" },
];
function newId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}-${Date.now()}`;
}
function stepFromSearchParams( sp) {
  const raw = sp.get("step");
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  const i = Math.floor(n) - 1;
  if (i < 0 || i >= STEPS.length) return 0;
  return i;
}
export default function DirectorBranchWizardPage() {
  const navigate = useNavigate();
  const { addBranch } = useManagerNetwork();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = useMemo(() => stepFromSearchParams(searchParams), [searchParams]);
  const goToStep = useCallback(
    (i) => {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
      const next = new URLSearchParams(searchParams);
      if (clamped <= 0) next.delete("step");
      else next.set("step", String(clamped + 1));
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams],
  );
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [workHoursWeekday, setWorkHoursWeekday] = useState("07:00–23:00");
  const [workHoursWeekend, setWorkHoursWeekend] = useState("08:00–22:00");
  const [connectionCode, setConnectionCode] = useState("");
  const [rooms, setRooms] = useState([
    { id: newId("room"), name: "Корт 1", capacityMode:  ("both"), maxSolo: 1, maxGroup: 4 },
  ]);
  const [rolesPersonalTrainers, setRolesPersonalTrainers] = useState(true);
  const [rolesGroupCoaches, setRolesGroupCoaches] = useState(true);
  const [rolesHallAdmin, setRolesHallAdmin] = useState(true);
  const [admins, setAdmins] = useState([
    { id: newId("adm"), mode:  ("existing"), userId: "", email: "", note: "" },
  ]);
  const [allowConcurrentInRoom, setAllowConcurrentInRoom] = useState(false);
  const [maxConcurrentBookingsPerRoom, setMaxConcurrentBookingsPerRoom] = useState(1);
  const [membershipProducts, setMembershipProducts] = useState(() => defaultMembershipProducts());
  const [pricingMatrix, setPricingMatrix] = useState(() => defaultPricingMatrix());
  const [pricingSummary, setPricingSummary] = useState("");
  const canNext = useMemo(() => {
    if (step === 0) return name.trim().length >= 2 && city.trim().length >= 2;
    if (step === 1) return rooms.length > 0 && rooms.every((r) => r.name.trim().length >= 1);
    if (step === 3) {
      return admins.every((a) => {
        if (a.mode === "existing") return a.userId.trim().length >= 3;
        return a.email.trim().includes("@");
      });
    }
    return true;
  }, [step, name, city, rooms, admins]);
  function addRoom() {
    setRooms((r) => [
      ...r,
      { id: newId("room"), name: `Зал ${r.length + 1}`, capacityMode: "group", maxSolo: 1, maxGroup: 12 },
    ]);
  }
  function updateRoom(id, patch) {
    setRooms((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeRoom(id) {
    setRooms((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)));
  }
  function addAdminRow(mode) {
    setAdmins((a) => [
      ...a,
      {
        id: newId("adm"),
        mode,
        userId: "",
        email: mode === "generated" ? `courtly.admin+${Date.now()}@invite.local` : "",
        note: "",
      },
    ]);
  }
  function generateCredentials(adminId) {
    const pass = `Ct-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
    setAdmins((list) =>
      list.map((a) => (a.id === adminId ? { ...a, note: `Временный пароль: ${pass} (передайте администратору)` } : a)),
    );
  }
  function finish() {
    const branch = {
      id: newId("br"),
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      workHoursWeekday: workHoursWeekday.trim(),
      workHoursWeekend: workHoursWeekend.trim(),
      connectionCode: connectionCode.trim().toUpperCase(),
      rooms,
      rolesPersonalTrainers,
      rolesGroupCoaches,
      rolesHallAdmin,
      admins,
      allowConcurrentInRoom,
      maxConcurrentBookingsPerRoom: Math.max(1, Number(maxConcurrentBookingsPerRoom) || 1),
      membershipProducts,
      pricingMatrix,
      pricingSummary: pricingSummary.trim(),
      createdAt: new Date().toISOString(),
    };
    addBranch(branch);
    navigate(`/director/branches/${branch.id}`);
  }
  return (
    <div className="clientPage directorWizardPage">
      <div className="directorWizardHead">
        <div>
          <h1 className="clientPageTitle">Новый филиал</h1>
          <p className="clientPageLead">
            Поздравляем с расширением сети. Пройдите шаги — зададим помещения, роли, администраторов и правила, чтобы
            клиенты, тренеры и админы могли работать в единой экосистеме Courtly.
          </p>
        </div>
        <Link to="/director/branches" className="btn btnSecondary">
          К списку филиалов
        </Link>
      </div>
      <ol className="directorStepper" aria-label="Шаги настройки филиала">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={`directorStepperItem${i === step ? " directorStepperItem--active" : ""}${i < step ? " directorStepperItem--done" : ""}`}
              onClick={() => goToStep(i)}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="directorStepperNum">{i + 1}</span>
              <span className="directorStepperText">
                <span className="directorStepperTitle">{s.title}</span>
                <span className="directorStepperHint">{s.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <section className="directorWizardCard">
        <header className="directorWizardStepHeader">
          <span className="directorWizardStepKicker">
            Шаг {step + 1} из {STEPS.length}
          </span>
          <h2 className="directorWizardStepHeading">{STEPS[step].title}</h2>
          <p className="directorWizardStepSub">{STEPS[step].hint}</p>
          {step === 0 ? (
            <p className="directorWizardValidationHint">
              Чтобы активировать «Далее», укажите название филиала и город (не короче 2 символов в каждом поле). Карточки
              шагов сверху можно нажимать в любой момент — данные не сбрасываются.
            </p>
          ) : null}
        </header>
        <div className="directorWizardFields" hidden={step !== 0}>
            <label className="authField">
              <span>Название филиала</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Courtly Север" />
            </label>
            <label className="authField">
              <span>Город</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" />
            </label>
            <label className="authField">
              <span>Адрес</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Улица, дом, ориентир" />
            </label>
            <label className="authField">
              <span>Телефон филиала</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 …" type="tel" />
            </label>
            <label className="authField">
              <span>Email для клиентов и партнёров</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="frontdesk@…" type="email" />
            </label>
            <label className="authField">
              <span>Часы работы (будни)</span>
              <input value={workHoursWeekday} onChange={(e) => setWorkHoursWeekday(e.target.value)} placeholder="07:00–23:00" />
            </label>
            <label className="authField">
              <span>Часы работы (выходные)</span>
              <input value={workHoursWeekend} onChange={(e) => setWorkHoursWeekend(e.target.value)} placeholder="08:00–22:00" />
            </label>
            <label className="authField">
              <span>Код подключения филиала (необязательно)</span>
              <input
                value={connectionCode}
                onChange={(e) => setConnectionCode(e.target.value)}
                placeholder="Будет виден администраторам"
              />
            </label>
        </div>
        <div className="directorWizardFields" hidden={step !== 1}>
            <p className="clientPanelHint">
              Укажите залы и корты. Режим «одиночный» — одна активная запись на интервал; «групповой» — несколько человек
              до лимита; «оба» — можно настраивать тип занятия при брони.
            </p>
            {rooms.map((room) => (
              <div key={room.id} className="directorRoomCard">
                <div className="directorRoomCardRow">
                  <label className="authField">
                    <span>Название помещения</span>
                    <input value={room.name} onChange={(e) => updateRoom(room.id, { name: e.target.value })} />
                  </label>
                  <button type="button" className="btn btnSecondary directorRoomRemove" onClick={() => removeRoom(room.id)}>
                    Удалить
                  </button>
                </div>
                <label className="authField">
                  <span>Режим вместимости</span>
                  <select
                    value={room.capacityMode}
                    onChange={(e) =>
                      updateRoom(room.id, { capacityMode:  (e.target.value) })
                    }
                  >
                    <option value="solo">Только индивидуально (одна запись на слот)</option>
                    <option value="group">Групповой зал (несколько человек)</option>
                    <option value="both">И индивидуально, и группы — по типу услуги</option>
                  </select>
                </label>
                <div className="directorRoomCardRow directorRoomCardRow--split">
                  <label className="authField">
                    <span>Макс. человек (индив.)</span>
                    <input
                      type="number"
                      min={1}
                      value={room.maxSolo}
                      onChange={(e) => updateRoom(room.id, { maxSolo: Number(e.target.value) || 1 })}
                    />
                  </label>
                  <label className="authField">
                    <span>Макс. человек (группа)</span>
                    <input
                      type="number"
                      min={1}
                      value={room.maxGroup}
                      onChange={(e) => updateRoom(room.id, { maxGroup: Number(e.target.value) || 1 })}
                    />
                  </label>
                </div>
              </div>
            ))}
            <button type="button" className="btn btnSecondary" onClick={addRoom}>
              + Добавить помещение
            </button>
        </div>
        <div className="directorWizardFields" hidden={step !== 2}>
            <p className="clientPanelHint">Отметьте, какие роли доступны на филиале. Это влияет на запись и права в приложении.</p>
            <label className="authCheck directorWizardCheck">
              <input type="checkbox" checked={rolesPersonalTrainers} onChange={(e) => setRolesPersonalTrainers(e.target.checked)} />
              <span>Персональные тренеры (индивидуальные занятия)</span>
            </label>
            <label className="authCheck directorWizardCheck">
              <input type="checkbox" checked={rolesGroupCoaches} onChange={(e) => setRolesGroupCoaches(e.target.checked)} />
              <span>Групповые тренеры и мини-группы</span>
            </label>
            <label className="authCheck directorWizardCheck">
              <input type="checkbox" checked={rolesHallAdmin} onChange={(e) => setRolesHallAdmin(e.target.checked)} />
              <span>Администратор зала / смены на площадке</span>
            </label>
        </div>
        <div className="directorWizardFields" hidden={step !== 3}>
            <p className="clientPanelHint">
              Назначьте администраторов филиала: по идентификатору пользователя Courtly, если человек уже в системе, либо
              создайте учётную запись — мы сгенерируем email и временный пароль для входа.
            </p>
            {admins.map((a) => (
              <div key={a.id} className="directorAdminCard">
                <label className="authField">
                  <span>Тип назначения</span>
                  <select
                    value={a.mode}
                    onChange={(e) =>
                      setAdmins((list) =>
                        list.map((x) =>
                          x.id === a.id
                            ? {
                                ...x,
                                mode:  (e.target.value),
                                email:
                                  e.target.value === "generated"
                                    ? `courtly.admin+${Date.now()}@invite.local`
                                    : x.email,
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <option value="existing">Уже есть пользователь (ID)</option>
                    <option value="generated">Создать учётную запись</option>
                  </select>
                </label>
                {a.mode === "existing" ? (
                  <label className="authField">
                    <span>ID пользователя в Courtly</span>
                    <input
                      value={a.userId}
                      onChange={(e) => setAdmins((list) => list.map((x) => (x.id === a.id ? { ...x, userId: e.target.value } : x)))}
                      placeholder="usr_7f3a… или внутренний номер"
                    />
                  </label>
                ) : (
                  <label className="authField">
                    <span>Email для входа</span>
                    <input
                      value={a.email}
                      onChange={(e) => setAdmins((list) => list.map((x) => (x.id === a.id ? { ...x, email: e.target.value } : x)))}
                    />
                  </label>
                )}
                {a.note ? <p className="directorAdminNote">{a.note}</p> : null}
                <div className="directorAdminActions">
                  {a.mode === "generated" ? (
                    <button type="button" className="btn btnSecondary" onClick={() => generateCredentials(a.id)}>
                      Сгенерировать пароль
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={() => setAdmins((list) => (list.length <= 1 ? list : list.filter((x) => x.id !== a.id)))}
                  >
                    Убрать
                  </button>
                </div>
              </div>
            ))}
            <div className="staffQuickActions">
              <button type="button" className="btn btnSecondary" onClick={() => addAdminRow("existing")}>
                + По ID пользователя
              </button>
              <button type="button" className="btn btnSecondary" onClick={() => addAdminRow("generated")}>
                + Новая учётная запись
              </button>
            </div>
        </div>
        <div className="directorWizardFields" hidden={step !== 4}>
            <p className="clientPanelHint">
              Запретите одновременно несколько активных броней в одном помещении или задайте лимит — например, для зала с
              разделением по секторам.
            </p>
            <label className="authCheck directorWizardCheck">
              <input
                type="checkbox"
                checked={allowConcurrentInRoom}
                onChange={(e) => setAllowConcurrentInRoom(e.target.checked)}
              />
              <span>Разрешить несколько параллельных записей в одном помещении (по правилам вместимости)</span>
            </label>
            <label className="authField">
              <span>Максимум одновременных броней на помещение</span>
              <input
                type="number"
                min={1}
                max={20}
                value={maxConcurrentBookingsPerRoom}
                onChange={(e) => setMaxConcurrentBookingsPerRoom(Number(e.target.value) || 1)}
              />
            </label>
        </div>
        <div className="directorWizardFields directorWizardFields--pricing" hidden={step !== 5}>
            <p className="clientPanelHint">
              Настройте пакеты абонементов отдельно и заполните матрицу разовых цен: пересечение типа зала, интервала времени
              суток и категории клиента. Общий комментарий внизу — для согласованных правил филиала.
            </p>
            <BranchPricingEditor
              membershipProducts={membershipProducts}
              pricingMatrix={pricingMatrix}
              pricingSummary={pricingSummary}
              onChange={(next) => {
                setMembershipProducts(next.membershipProducts);
                setPricingMatrix(next.pricingMatrix);
                setPricingSummary(next.pricingSummary);
              }}
            />
        </div>
        <div className="directorWizardNav">
          <button type="button" className="btn btnSecondary" disabled={step === 0} onClick={() => goToStep(step - 1)}>
            Назад
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!canNext}
              title={
                !canNext && step === 0
                  ? "Укажите название филиала и город (не короче 2 символов каждое)"
                  : !canNext && step === 1
                    ? "Заполните название каждого помещения"
                    : !canNext && step === 3
                      ? "Для каждого администратора укажите ID или корректный email"
                      : undefined
              }
              onClick={() => goToStep(step + 1)}
            >
              Далее
            </button>
          ) : (
            <button type="button" className="btn btnPrimary" onClick={finish}>
              Сохранить филиал
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
