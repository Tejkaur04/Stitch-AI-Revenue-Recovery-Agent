import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import Landing from './pages/Landing';
import MissionControl from './pages/MissionControl';
import DemoMode from './pages/DemoMode';
import IncidentDetail from './pages/IncidentDetail';
import RecoveryLab from './pages/RecoveryLab';
import Guardrails from './pages/Guardrails';
import IncidentsList from './pages/IncidentsList';

// Placeholder pages
const Customers = () => (
  <div style={{ maxWidth: 600, margin: '0 auto' }}>
    <h1>Customers</h1>
    <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Customer revenue profiles — coming soon.</p>
  </div>
);

function App() {
  return (
    <Routes>
      {/* Landing page (uses AppLayout for nav only) */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Landing />} />
      </Route>

      {/* App pages */}
      <Route path="/" element={<AppLayout />}>
        <Route path="dashboard"           element={<MissionControl />} />
        <Route path="demo"                element={<DemoMode />} />
        <Route path="incidents"           element={<IncidentsList />} />
        <Route path="incidents/:id"       element={<IncidentDetail />} />
        <Route path="lab"                 element={<RecoveryLab />} />
        <Route path="customers"           element={<Customers />} />
        <Route path="guardrails"          element={<Guardrails />} />
      </Route>
    </Routes>
  );
}

export default App;
