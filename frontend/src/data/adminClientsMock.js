import { CLIENT_BASE_MOCK } from "./clientBaseMock";
export const ADMIN_CLIENTS_MOCK = CLIENT_BASE_MOCK.map((c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  status: c.status,
  lastVisit: c.lastVisit,
}));
