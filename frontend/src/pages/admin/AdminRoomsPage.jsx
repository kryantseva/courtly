import { ADMIN_ROOMS_MOCK } from "../../data/adminOperationsMock";
export default function AdminRoomsPage() {
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Залы и площадки</h1>
      <p className="clientPageLead">
        Ресурсы филиала: название, тип, описание, доступность. Создание и редактирование — после согласования модели.
      </p>
      <section className="clientPanel">
        <div className="staffQuickActions">
          <button type="button" className="btn btnSecondary" disabled>
            Добавить зал
          </button>
        </div>
        <div className="staffTableWrap">
          <table className="staffTable">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ADMIN_ROOMS_MOCK.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td>{r.type}</td>
                  <td>{r.status}</td>
                  <td>
                    <button type="button" className="btn btnSecondary" disabled>
                      Изменить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
