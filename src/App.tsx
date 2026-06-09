import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import SimulationConsole from '@/pages/SimulationConsole';
import DustEvolution from '@/pages/DustEvolution';
import PlanetTracking from '@/pages/PlanetTracking';
import ApprovalCenter from '@/pages/ApprovalCenter';
import ExportCenter from '@/pages/ExportCenter';
import RecommendationEngine from '@/pages/RecommendationEngine';
import Dashboard from '@/pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<SimulationConsole />} />
          <Route path="/simulation" element={<SimulationConsole />} />
          <Route path="/dust-evolution" element={<DustEvolution />} />
          <Route path="/planet-tracking" element={<PlanetTracking />} />
          <Route path="/approval" element={<ApprovalCenter />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/recommendation" element={<RecommendationEngine />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
