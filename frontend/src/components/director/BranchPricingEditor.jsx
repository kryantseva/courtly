import {
  mergeMembershipProducts,
  mergePricingMatrix,
  pricingCellKey,
} from "../../data/branchPricingDefaults";
function newId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}-${Date.now()}`;
}
export default function BranchPricingEditor({ membershipProducts, pricingMatrix, pricingSummary, onChange }) {
  const matrix = mergePricingMatrix(pricingMatrix);
  const memberships = mergeMembershipProducts(membershipProducts);
  function setMatrix(nextMatrix) {
    onChange({ membershipProducts: memberships, pricingMatrix: nextMatrix, pricingSummary });
  }
  function setMemberships(next) {
    onChange({ membershipProducts: next, pricingMatrix: matrix, pricingSummary });
  }
  function setSummary(v) {
    onChange({ membershipProducts: memberships, pricingMatrix: matrix, pricingSummary: v });
  }
  function setCell(hallId, timeId, categoryId, value) {
    const key = pricingCellKey(hallId, timeId, categoryId);
    setMatrix({
      ...matrix,
      cells: { ...matrix.cells, [key]: value },
    });
  }
  function addMembership() {
    setMemberships([
      ...memberships,
      {
        id: newId("mp"),
        name: "Новый абонемент",
        visitsTotal: 10,
        unlimitedVisits: false,
        validityDays: 30,
        priceRub: 0,
        categoryId: "std",
        notes: "",
      },
    ]);
  }
  function updateMembership(id, patch) {
    setMemberships(memberships.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeMembership(id) {
    setMemberships(memberships.filter((m) => m.id !== id));
  }
  function addHallType() {
    const label = window.prompt("Название типа зала (например: Студия йоги)");
    if (!label?.trim()) return;
    setMatrix({
      ...matrix,
      hallTypes: [...matrix.hallTypes, { id: newId("hall"), label: label.trim() }],
    });
  }
  function addClientCategory() {
    const label = window.prompt("Название категории клиентов");
    if (!label?.trim()) return;
    setMatrix({
      ...matrix,
      clientCategories: [...matrix.clientCategories, { id: newId("cat"), label: label.trim() }],
    });
  }
  const categoryOptions = [{ id: "all", label: "Все категории" }, ...matrix.clientCategories];
  return (
    <div className="branchPricingEditor">
      <section className="branchPricingSection">
        <div className="branchPricingSectionHead">
          <h3 className="branchPricingSectionTitle">Абонементы</h3>
          <p className="clientPanelHint branchPricingSectionHint">
            Каждый абонемент настраивается отдельно: визиты, срок действия, цена и для какой катории клиентов доступен.
          </p>
          <button type="button" className="btn btnSecondary" onClick={addMembership}>
            + Добавить абонемент
          </button>
        </div>
        <div className="branchPricingMembershipList">
          {memberships.map((m) => (
            <div key={m.id} className="branchPricingMembershipCard">
              <div className="branchPricingMembershipGrid">
                <label className="authField">
                  <span>Название</span>
                  <input value={m.name} onChange={(e) => updateMembership(m.id, { name: e.target.value })} />
                </label>
                <label className="authField">
                  <span>Цена, ₽</span>
                  <input
                    type="number"
                    min={0}
                    value={m.priceRub}
                    onChange={(e) => updateMembership(m.id, { priceRub: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="authCheck directorWizardCheck branchPricingCheck">
                  <input
                    type="checkbox"
                    checked={m.unlimitedVisits}
                    onChange={(e) => updateMembership(m.id, { unlimitedVisits: e.target.checked })}
                  />
                  <span>Безлимит посещений в срок</span>
                </label>
                {!m.unlimitedVisits ? (
                  <label className="authField">
                    <span>Количество посещений</span>
                    <input
                      type="number"
                      min={1}
                      value={m.visitsTotal}
                      onChange={(e) => updateMembership(m.id, { visitsTotal: Number(e.target.value) || 1 })}
                    />
                  </label>
                ) : null}
                <label className="authField">
                  <span>Срок действия, дней</span>
                  <input
                    type="number"
                    min={1}
                    value={m.validityDays}
                    onChange={(e) => updateMembership(m.id, { validityDays: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="authField">
                  <span>Категория клиентов</span>
                  <select
                    value={m.categoryId}
                    onChange={(e) => updateMembership(m.id, { categoryId: e.target.value })}
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="authField branchPricingFullWidth">
                  <span>Комментарий (условия)</span>
                  <input
                    value={m.notes}
                    onChange={(e) => updateMembership(m.id, { notes: e.target.value })}
                    placeholder="Напр.: только будни, без переноса"
                  />
                </label>
              </div>
              <button type="button" className="btn btnSecondary branchPricingRemove" onClick={() => removeMembership(m.id)}>
                Удалить абонемент
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="branchPricingSection">
        <div className="branchPricingSectionHead">
          <h3 className="branchPricingSectionTitle">Матрица цен (разовое бронирование)</h3>
          <p className="clientPanelHint branchPricingSectionHint">
            Цена за слот или за час (укажите в комментарии сети) по типу зала, интервалу времени суток и категории клиента.
            Единица однаковая по всей таблице — как договоритесь на филиале.
          </p>
          <div className="staffQuickActions">
            <button type="button" className="btn btnSecondary" onClick={addHallType}>
              + Тип зала
            </button>
            <button type="button" className="btn btnSecondary" onClick={addClientCategory}>
              + Категория клиентов
            </button>
          </div>
        </div>
        <div className="branchPricingMatrixWrap">
          {matrix.hallTypes.map((h) => (
            <div key={h.id} className="branchPricingMatrixBlock">
              <h4 className="branchPricingMatrixHall">{h.label}</h4>
              <div className="staffTableWrap">
                <table className="staffTable directorMatrixTable">
                  <thead>
                    <tr>
                      <th>Время суток</th>
                      {matrix.clientCategories.map((c) => (
                        <th key={c.id}>{c.label}, ₽</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.timeBands.map((t) => (
                      <tr key={t.id}>
                        <td>{t.label}</td>
                        {matrix.clientCategories.map((c) => {
                          const key = pricingCellKey(h.id, t.id, c.id);
                          return (
                            <td key={c.id}>
                              <input
                                className="directorMatrixInput"
                                type="text"
                                inputMode="decimal"
                                placeholder="—"
                                value={matrix.cells[key] ?? ""}
                                onChange={(e) => setCell(h.id, t.id, c.id, e.target.value)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="branchPricingSection">
        <label className="authField">
          <span>Комментарий для персонала (общий)</span>
          <textarea
            className="directorTextarea"
            rows={4}
            value={pricingSummary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Например: все цены за 60 минут; праздники по коэффициенту 1,2"
          />
        </label>
      </section>
    </div>
  );
}
