import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { SignalDetailPage } from "./pages/SignalDetailPage";
import { SignalsFeedPage } from "./pages/SignalsFeedPage";
import { TropelsPage } from "./pages/TropelsPage";
import { SectorsPage } from "./pages/SectorsPage";
import { SectorStoryPage } from "./pages/SectorStoryPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tropels" element={<TropelsPage />} />
          <Route path="/signals" element={<SignalsFeedPage />} />
          <Route path="/signals/:id" element={<SignalDetailPage />} />
          <Route path="/sectors" element={<SectorsPage />} />

<Route
  path="/sectors/:id/story"
  element={<SectorStoryPage />}
/>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}