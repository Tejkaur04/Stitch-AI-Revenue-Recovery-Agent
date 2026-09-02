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
import MerchantDashboard from './pages/MerchantDashboard';
import ConsoleDashboard from './pages/ConsoleDashboard';
import PreExecutionDemo from './pages/PreExecutionDemo';
import PolicyTest from './pages/PolicyTest';
import DecisionInspector from './pages/DecisionInspector';

const Customers = () => (
  <div style={{ maxWidth: 600, margin: '0 auto' }}>
    <h1>Customers</h1>
    <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Customer revenue profiles — coming soon.</p>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Landing />} />

        <Route path="app" element={<MerchantDashboard />} />
        <Route path="app/incidents" element={<IncidentsList />} />
        <Route path="app/incidents/:id" element={<IncidentDetail />} />
        <Route path="app/recovery-lab" element={<RecoveryLab />} />
        <Route path="app/settings" element={<Guardrails />} />

        <Route path="console" element={<ConsoleDashboard />} />
        <Route path="console/demo" element={<DemoMode />} />
        <Route path="console/pre-execution-demo" element={<PreExecutionDemo />} />
        <Route path="console/policy-test" element={<PolicyTest />} />
        <Route path="console/decision-inspector" element={<DecisionInspector />} />

        <Route path="dashboard" element={<MissionControl />} />
        <Route path="demo" element={<DemoMode />} />
        <Route path="incidents" element={<IncidentsList />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="lab" element={<RecoveryLab />} />
        <Route path="customers" element={<Customers />} />
        <Route path="guardrails" element={<Guardrails />} />
      </Route>
    </Routes>
  );
}

export default App;
