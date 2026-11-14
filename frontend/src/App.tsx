import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { MonitorDetailPage } from "./pages/MonitorDetailPage";
import { WorkflowDetailPage } from "./pages/WorkflowDetailPage";
import { TeamSettingsPage } from "./pages/TeamSettingsPage";
import { IncidentPage } from "./pages/IncidentPage";
import { IssuesPage } from "./pages/IssuesPage";
import { IssueDetailPage } from "./pages/IssueDetailPage";

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      {/* Public home page with the "Try the live demo" button */}
      <Route path="/" element={<HomePage />} />
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
        <Route path="/incidents" element={<IncidentPage />} />
        <Route path="/incidents/:id" element={<IncidentPage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={token ? "/dashboard" : "/"} replace />}
      />
    </Routes>
  );
}

export default App;
