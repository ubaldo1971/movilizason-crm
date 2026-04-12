import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { useRole } from './context/RoleContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Territory from './pages/Territory';
import Communication from './pages/Communication';
import Tasks from './pages/Tasks';
import Capture from './pages/Capture';
import Commitments from './pages/Commitments';
import Reports from './pages/Reports';
import Incentives from './pages/Incentives';
import Profile from './pages/Profile';
import Permissions from './pages/Permissions';
import Estructura from './pages/Estructura';
import Messages from './pages/Messages';
import Performance from './pages/Performance';
import TaskScoring from './pages/TaskScoring';
import Brigades from './pages/Brigades';
import SupportContainer from './pages/SupportContainer';
import ExecutiveSummary from './pages/ExecutiveSummary';
import AssetsCatalog from './pages/AssetsCatalog';

import Onboarding from './pages/Onboarding';

function AuthGuard({ children }) {
  const { currentUser } = useRole();
  // Temporarily bypass auth guard for browser testing
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthGuard><MainLayout /></AuthGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="territory" element={<Territory />} />
          <Route path="communication" element={<Communication />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="capture" element={<Capture />} />
          <Route path="commitments" element={<Commitments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="incentives" element={<Incentives />} />
          <Route path="profile" element={<Profile />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="estructura" element={<Estructura />} />
          <Route path="performance" element={<Performance />} />
          <Route path="scoring" element={<TaskScoring />} />
          <Route path="brigades" element={<Brigades />} />
          <Route path="support" element={<SupportContainer />} />
          <Route path="summary" element={<ExecutiveSummary />} />
          <Route path="assets" element={<AssetsCatalog />} />
        </Route>
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
