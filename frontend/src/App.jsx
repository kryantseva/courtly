import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import ClientShell from "./layout/ClientShell";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HelpPage from "./pages/HelpPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import BranchSelectPage from "./pages/BranchSelectPage";
import ClientHomePage from "./pages/client/ClientHomePage";
import ClientTrainersPage from "./pages/client/ClientTrainersPage";
import ClientHistoryPage from "./pages/client/ClientHistoryPage";
import ProfilePage from "./pages/client/ProfilePage";
import ClientFaqPage from "./pages/client/ClientFaqPage";
import ClientChatPage from "./pages/client/ClientChatPage";
import TrainerShell from "./layout/TrainerShell";
import AdminShell from "./layout/AdminShell";
import TrainerHomePage from "./pages/trainer/TrainerHomePage";
import TrainerChatPage from "./pages/trainer/TrainerChatPage";
import TrainerSchedulePage from "./pages/trainer/TrainerSchedulePage";
import TrainerSessionsPage from "./pages/trainer/TrainerSessionsPage";
import TrainerProfilePage from "./pages/trainer/TrainerProfilePage";
import TrainerSessionDetailPage from "./pages/trainer/TrainerSessionDetailPage";
import TrainerAvailabilityPage from "./pages/trainer/TrainerAvailabilityPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminChatPage from "./pages/admin/AdminChatPage";
import AdminSchedulePage from "./pages/admin/AdminSchedulePage";
import AdminStaffPage from "./pages/admin/AdminStaffPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import DirectorShell from "./layout/DirectorShell";
import DirectorNetworkRoot from "./layout/DirectorNetworkRoot";
import DirectorOverviewPage from "./pages/director/DirectorOverviewPage";
import DirectorBranchesPage from "./pages/director/DirectorBranchesPage";
import DirectorAnalyticsPage from "./pages/director/DirectorAnalyticsPage";
import DirectorOrganizationPage from "./pages/director/DirectorOrganizationPage";
import DirectorProfilePage from "./pages/director/DirectorProfilePage";
import ClientMembershipsPage from "./pages/client/ClientMembershipsPage";
import ClientBranchEventsPage from "./pages/client/ClientBranchEventsPage";
import ClientEventDetailPage from "./pages/client/ClientEventDetailPage";
import ClientTrainerDetailPage from "./pages/client/ClientTrainerDetailPage";
import ClientHallPage from "./pages/client/ClientHallPage";
import ClientBookingDetailPage from "./pages/client/ClientBookingDetailPage";
import ClientBookingPage from "./pages/client/ClientBookingPage";
import TrainerEarningsPage from "./pages/trainer/TrainerEarningsPage";
import AdminClientsPage from "./pages/admin/AdminClientsPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import AdminBookingDetailPage from "./pages/admin/AdminBookingDetailPage";
import AdminRoomsPage from "./pages/admin/AdminRoomsPage";
import AdminPaymentDetailPage from "./pages/admin/AdminPaymentDetailPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";
import AdminSlotsPage from "./pages/admin/AdminSlotsPage";
import AdminEventsPage from "./pages/admin/AdminEventsPage";
import AdminEventBracketPage from "./pages/admin/AdminEventBracketPage";
import AdminUserDetailPage from "./pages/admin/AdminUserDetailPage";
import CourtlyNotificationsCenterPage from "./pages/CourtlyNotificationsCenterPage";
import DirectorBranchWizardPage from "./pages/director/DirectorBranchWizardPage";
import DirectorBranchEditPage from "./pages/director/DirectorBranchEditPage";
import DirectorFinancePage from "./pages/director/DirectorFinancePage";
import DirectorBranchSelectPage from "./pages/director/DirectorBranchSelectPage";
import DirectorCalendarPage from "./pages/director/DirectorCalendarPage";
import DirectorOperationsBookingsPage from "./pages/director/DirectorOperationsBookingsPage";
import DirectorPersonnelPage from "./pages/director/DirectorPersonnelPage";
import DirectorStaffUserPage from "./pages/director/DirectorStaffUserPage";
import DirectorNotificationsPage from "./pages/director/DirectorNotificationsPage";
import DirectorReportsPage from "./pages/director/DirectorReportsPage";
import DirectorBranchAccessPage from "./pages/director/DirectorBranchAccessPage";
import DirectorChatPage from "./pages/director/DirectorChatPage";
import DirectorClientsPage from "./pages/director/DirectorClientsPage";
import DirectorClientDetailPage from "./pages/director/DirectorClientDetailPage";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/branches" element={<BranchSelectPage />} />
        <Route path="/app" element={<ClientShell />}>
          <Route index element={<ClientHomePage />} />
          <Route path="chat" element={<ClientChatPage />} />
          <Route
            path="notifications"
            element={<CourtlyNotificationsCenterPage role="client" backTo="/app" backLabel="Главная" />}
          />
          <Route path="trainers" element={<ClientTrainersPage />} />
          <Route path="trainers/:trainerId" element={<ClientTrainerDetailPage />} />
          <Route path="halls/:hallId" element={<ClientHallPage />} />
          <Route path="bookings/:bookingId" element={<ClientBookingDetailPage />} />
          <Route path="booking" element={<ClientBookingPage />} />
          <Route path="book" element={<Navigate to="/app/booking" replace />} />
          <Route path="history" element={<ClientHistoryPage />} />
          <Route path="events/:eventId" element={<ClientEventDetailPage />} />
          <Route path="events" element={<ClientBranchEventsPage />} />
          <Route path="memberships" element={<ClientMembershipsPage />} />
          <Route path="payments" element={<Navigate to="/app/history" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="faq" element={<ClientFaqPage />} />
        </Route>
        <Route path="/trainer" element={<TrainerShell />}>
          <Route index element={<TrainerHomePage />} />
          <Route path="chat" element={<TrainerChatPage />} />
          <Route
            path="notifications"
            element={<CourtlyNotificationsCenterPage role="trainer" backTo="/trainer" backLabel="Сегодня" />}
          />
          <Route path="schedule" element={<TrainerSchedulePage />} />
          <Route path="availability" element={<TrainerAvailabilityPage />} />
          <Route path="sessions" element={<TrainerSessionsPage />} />
          <Route path="sessions/:sessionId" element={<TrainerSessionDetailPage />} />
          <Route path="earnings" element={<TrainerEarningsPage />} />
          <Route path="profile" element={<TrainerProfilePage />} />
        </Route>
        <Route path="/admin" element={<AdminShell />}>
          <Route path="chat" element={<AdminChatPage />} />
          <Route index element={<AdminSchedulePage />} />
          <Route path="overview" element={<AdminDashboardPage />} />
          <Route path="schedule" element={<Navigate to="/admin" replace />} />
          <Route path="slots" element={<AdminSlotsPage />} />
          <Route path="events" element={<AdminEventsPage />} />
          <Route path="events/:eventId/bracket" element={<AdminEventBracketPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="bookings/:bookingId" element={<AdminBookingDetailPage />} />
          <Route path="clients" element={<AdminClientsPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="users/:userId" element={<AdminUserDetailPage />} />
          <Route path="rooms" element={<AdminRoomsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="payments/:paymentId" element={<AdminPaymentDetailPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="/director" element={<DirectorNetworkRoot />}>
          <Route path="select" element={<DirectorBranchSelectPage />} />
          <Route element={<DirectorShell />}>
            <Route index element={<DirectorCalendarPage />} />
            <Route path="overview" element={<DirectorOverviewPage />} />
            <Route path="chat" element={<DirectorChatPage />} />
            <Route path="branches" element={<DirectorBranchesPage />} />
            <Route path="branches/new" element={<DirectorBranchWizardPage />} />
            <Route path="branches/:branchId" element={<DirectorBranchEditPage />} />
            <Route path="calendar" element={<Navigate to="/director" replace />} />
            <Route path="bookings" element={<DirectorOperationsBookingsPage />} />
            <Route path="clients" element={<DirectorClientsPage />} />
            <Route path="clients/:clientId" element={<DirectorClientDetailPage />} />
            <Route path="personnel" element={<DirectorPersonnelPage />} />
            <Route path="personnel/:userId" element={<DirectorStaffUserPage />} />
            <Route path="access" element={<DirectorBranchAccessPage />} />
            <Route path="finance" element={<DirectorFinancePage />} />
            <Route path="analytics" element={<DirectorAnalyticsPage />} />
            <Route path="notifications" element={<DirectorNotificationsPage />} />
            <Route path="reports" element={<DirectorReportsPage />} />
            <Route path="organization" element={<DirectorOrganizationPage />} />
            <Route path="profile" element={<DirectorProfilePage />} />
          </Route>
        </Route>
        <Route path="/home" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
