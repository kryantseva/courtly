import { useLocation, useNavigate } from "react-router-dom";
import { useBookingDrawer } from "../../context/BookingDrawerContext";
export default function ClientBookingFab() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { openDrawer } = useBookingDrawer();
  return (
    <button
      type="button"
      className="clientBookingFab"
      onClick={() => {
        if (pathname !== "/app/booking") navigate("/app/booking");
        openDrawer();
      }}
    >
      Записаться
    </button>
  );
}
