import { Outlet } from "react-router-dom";
import { ManagerNetworkProvider } from "../context/ManagerNetworkContext";
export default function DirectorNetworkRoot() {
  return (
    <ManagerNetworkProvider>
      <Outlet />
    </ManagerNetworkProvider>
  );
}
