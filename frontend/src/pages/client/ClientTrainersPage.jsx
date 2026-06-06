import TrainerBioCards from "../../components/booking/TrainerBioCards";
import { useBookingDrawer } from "../../context/BookingDrawerContext";
export default function ClientTrainersPage() {
  const { openDrawerForTrainer } = useBookingDrawer();
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Наши тренера</h1>
      <p className="clientPageLead">
        Ознакомьтесь со специалистами и запишитесь на удобное время — в записи останутся только окна, где свободны и тренер, и
        площадка.
      </p>
      <div className="clientTrainersShowcase">
        <TrainerBioCards onBookTrainer={openDrawerForTrainer} />
      </div>
    </div>
  );
}
