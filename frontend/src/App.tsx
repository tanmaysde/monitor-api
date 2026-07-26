import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MonitorDetailPage } from "./pages/MonitorDetailPage";
import { WorkflowDetailPage } from "./pages/WorkflowDetailPage";
import { TeamSettingsPage } from "./pages/TeamSettingsPage";

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <AuthPage />}
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/monitors" element={<MonitorDetailPage />} />
        <Route path="/monitors/:id" element={<MonitorDetailPage />} />
        <Route path="/workflows" element={<WorkflowDetailPage />} />
        <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
        <Route path="/team" element={<TeamSettingsPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={token ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
