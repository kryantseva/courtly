import { useManagerNetwork } from "../../context/ManagerNetworkContext";
export default function DirectorOrganizationPage() {
  const { subscriptionActive, subscriptionPlan, networkName, setNetworkName, setSubscriptionActive, resetNetworkDemo } =
    useManagerNetwork();
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Организация и подписка</h1>
      <p className="clientPageLead">
        Маркер «менеджер сети» в Courtly выдаётся только после покупки подписки на платформу — так мы отделяем
        руководителей сети от посетителей и персонала филиалов. Ниже — как это будет выглядеть в продукте; переключатели
        для демонстрации UX.
      </p>
      <section className={`clientPanel${subscriptionActive ? " directorOrgPanel--ok" : ""}`}>
        <h2>Подписка Courtly Manager</h2>
        {subscriptionActive ? (
          <p className="clientPanelHint">
            Статус: <strong>активна</strong> ({subscriptionPlan}). В бою здесь будут счёт, договор и дата следующего
            списания.
          </p>
        ) : (
          <p className="clientPanelHint">
            Статус: <strong>не оформлена</strong>. Без подписки создание сети и филиалов в продукте будет недоступно —
            оставляем переключатель для макета экрана оплаты.
          </p>
        )}
        <label className="authCheck directorWizardCheck">
          <input
            type="checkbox"
            checked={subscriptionActive}
            onChange={(e) => setSubscriptionActive(e.target.checked)}
          />
          <span>Симулировать активную подписку (демо)</span>
        </label>
      </section>
      <section className="clientPanel">
        <h2>Название сети</h2>
        <label className="authField">
          <span>Как отображается в кабинете</span>
          <input value={networkName} onChange={(e) => setNetworkName(e.target.value)} />
        </label>
      </section>
      <section className="clientPanel clientPanel--schedule">
        <h2>Юридическое лицо и бренд</h2>
        <p className="clientPanelHint">
          Реквизиты, логотип для приложения клиентов и филиалов, единые правила отмены — подключим вместе с API и
          документооборотом.
        </p>
        <button type="button" className="btn btnSecondary" disabled>
          Загрузить реквизиты
        </button>
      </section>
      <section className="clientPanel clientPanel--schedule">
        <h2>Коды подключения и системные события</h2>
        <p className="clientPanelHint">
          Коды выдаются для привязки филиалов и приложений клиентов. Ключевые события платформы (обновления, инциденты)
          отображаются в центре уведомлений.
        </p>
        <ul className="clientList">
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Courtly Manager API</span>
              <span className="clientListMeta">Статус: работа штатная (демо)</span>
            </div>
            <span className="clientBadge">Ок</span>
          </li>
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Ротация ключей интеграции</span>
              <span className="clientListMeta">Следующая плановая — через 45 дней</span>
            </div>
            <span className="clientBadge">Инфо</span>
          </li>
        </ul>
        <p className="clientPanelHint">
          Руководитель не меняет инфраструктуру и системные настройки платформы — только бизнес-контур своей сети.
        </p>
      </section>
      <section className="clientPanel">
        <h2>Сброс демо-данных сети</h2>
        <p className="clientPanelHint">
          Очистить сохранённые в браузере филиалы и настройки (localStorage). Полезно, чтобы снова увидеть сценарий «пустая
          сеть».
        </p>
        <button
          type="button"
          className="btn btnSecondary"
          onClick={() => {
            if (window.confirm("Сбросить все филиалы и настройки сети в этом браузере?")) resetNetworkDemo();
          }}
        >
          Сбросить демо-сеть
        </button>
      </section>
    </div>
  );
}
