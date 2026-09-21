import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { IntroOverlay } from './components/IntroOverlay';
import { Toaster } from './components/Toaster';
import NewSpar from './pages/NewSpar';
import NotFound from './pages/NotFound';
import Personas from './pages/Personas';
import ReportView from './pages/ReportView';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SharedReport from './pages/SharedReport';
import SignIn from './pages/SignIn';
import SparWorkspace from './pages/SparWorkspace';
import SparsList from './pages/SparsList';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<SparsList />} />
          <Route path="spars" element={<Navigate to="/" replace />} />
          <Route path="spars/new" element={<NewSpar />} />
          <Route path="spars/:id" element={<SparWorkspace />} />
          <Route path="personas" element={<Personas />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportView />} />
          <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="settings/:tab" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="share/:slug" element={<SharedReport />} />
        <Route path="signin" element={<SignIn />} />
      </Routes>
      <IntroOverlay />
      <Toaster />
    </>
  );
}
