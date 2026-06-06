import { Link, useParams } from "react-router-dom";
import { getClientBaseRecord } from "../../data/clientBaseMock";
import ClientProfileFull from "../../components/staff/ClientProfileFull";
export default function DirectorClientDetailPage() {
  const { clientId } = useParams();
  const client = clientId ? getClientBaseRecord(clientId) : null;
  if (!client) {
    return (
      <div className="clientPage">
        <h1 className="clientPageTitle">Клиент не найден</h1>
        <Link to="/director/clients" className="btn btnSecondary">
          К клиентской базе
        </Link>
      </div>
    );
  }
  return (
    <ClientProfileFull client={client} variant="director" backTo="/director/clients" backLabel="Клиентская база" />
  );
}
