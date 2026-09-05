import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import Landing from './pages/Landing';
import MissionControl from './pages/MissionControl';
import DemoMode from './pages/DemoMode';
import IncidentDetail from './pages/IncidentDetail';
import RecoveryLab from './pages/RecoveryLab';
import Guardrails from './pages/Guardrails';
import IncidentsList from './pages/IncidentsList';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Landing */}
        <Route index element={<Landing />} />

        {/* Core workspace — flat, clear routes */}
        <Route path="dashboard"       element={<MissionControl />} />
        <Route path="incidents"       element={<IncidentsList />} />
        <Route path="incidents/:id"   element={<IncidentDetail />} />
        <Route path="demo"            element={<DemoMode />} />
        <Route path="lab"             element={<RecoveryLab />} />
        <Route path="guardrails"      element={<Guardrails />} />

        {/* Legacy redirects so old links still work */}
        <Route path="app"                      element={<Navigate to="/dashboard" replace />} />
        <Route path="app/incidents"            element={<Navigate to="/incidents" replace />} />
        <Route path="app/incidents/:id"        element={<Navigate to="/incidents/:id" replace />} />
        <Route path="app/recovery-lab"         element={<Navigate to="/lab" replace />} />
        <Route path="app/settings"             element={<Navigate to="/guardrails" replace />} />
        <Route path="console"                  element={<Navigate to="/demo" replace />} />
        <Route path="console/demo"             element={<Navigate to="/demo" replace />} />
        <Route path="dashboard"                element={<Navigate to="/dashboard" replace />} />
        <Route path="lab"                      element={<Navigate to="/lab" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
