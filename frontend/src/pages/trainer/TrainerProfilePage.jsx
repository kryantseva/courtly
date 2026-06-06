import { useState } from "react";
import { TRAINER_SELF_MOCK } from "../../data/trainerDashboardMock";
export default function TrainerProfilePage() {
  const [fullName, setFullName] = useState(TRAINER_SELF_MOCK.fullName);
  const [email, setEmail] = useState(TRAINER_SELF_MOCK.email);
  const [phone, setPhone] = useState(TRAINER_SELF_MOCK.phone);
  const [specialties, setSpecialties] = useState(TRAINER_SELF_MOCK.specialties);
  const [bio, setBio] = useState(TRAINER_SELF_MOCK.bio);
  const [photoUrl, setPhotoUrl] = useState(TRAINER_SELF_MOCK.photoUrl);
  const [savedHint, setSavedHint] = useState("");
  function handleSubmit(e) {
    e.preventDefault();
    setSavedHint("Сохранено локально (демо). После API данные уйдут на сервер и могут пройти модерацию филиала.");
    window.setTimeout(() => setSavedHint(""), 5000);
  }
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Профиль</h1>
      <p className="clientPageLead">
        Просмотр и редактирование данных о себе: имя, контакты, специализация, описание и фото. Роль в филиале
        назначается администратором или руководителем.
      </p>
      {savedHint ? <p className="clientPanelHint trainerProfileSaved">{savedHint}</p> : null}
      <section className="clientPanel">
        <h2>Фото</h2>
        <div className="trainerProfilePhotoRow">
          <div className="trainerProfilePhotoPreview" aria-hidden>
            {photoUrl ? (
              <img src={photoUrl} alt="" className="trainerProfilePhotoImg" />
            ) : (
              <span className="trainerProfilePhotoPlaceholder">Нет фото</span>
            )}
          </div>
          <label className="authField trainerProfilePhotoUrl">
            <span>URL изображения (демо)</span>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
        </div>
        <p className="clientPanelHint">Загрузка файла с устройства — при подключении хранилища и модерации.</p>
      </section>
      <section className="clientPanel">
        <h2>Контакты и описание</h2>
        <form className="profileForm" onSubmit={handleSubmit}>
          <label className="authField">
            <span>Имя</span>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="authField">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="authField">
            <span>Телефон</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="authField">
            <span>Специализация</span>
            <input type="text" value={specialties} onChange={(e) => setSpecialties(e.target.value)} />
          </label>
          <label className="authField">
            <span>О себе</span>
            <textarea
              className="trainerProfileBio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Краткое описание для клиентов филиала…"
            />
          </label>
          <button type="submit" className="btn btnPrimary">
            Сохранить
          </button>
        </form>
      </section>
    </div>
  );
}
