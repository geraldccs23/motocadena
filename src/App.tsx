import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import PublicWebsite from './components/PublicWebsite';
import SponsorsPresentation from './components/SponsorsPresentation';
import ScooterPage from './components/ScooterPage';
import PublicBudgetView from './components/PublicBudgetView';

const AdminApp = lazy(() => import('./admin/AdminApp'));
const PortalApp = lazy(() => import('./portal/PortalApp'));

function App() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleNavigateToSponsors = () => {
    navigate('/sponsors');
  };


  const handleNavigateToScooter = () => {
    navigate('/scooter');
  };

  const handleNavigateToPortal = () => {
    navigate('/portal/login');
  };

  const handleNavigateToAdmin = () => {
    navigate('/admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen garage-texture flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<PublicWebsite onNavigateToSponsors={handleNavigateToSponsors} onNavigateToAdmin={handleNavigateToAdmin} onNavigateToScooter={handleNavigateToScooter} onNavigateToPortal={handleNavigateToPortal} />} />
      <Route path="/tienda" element={<PublicWebsite onNavigateToSponsors={handleNavigateToSponsors} onNavigateToAdmin={handleNavigateToAdmin} onNavigateToScooter={handleNavigateToScooter} onNavigateToPortal={handleNavigateToPortal} initialSection="tienda" />} />
      <Route path="/sponsors" element={<SponsorsPresentation />} />
      <Route path="/scooter" element={<ScooterPage />} />
      <Route path="/presupuesto/:id" element={<PublicBudgetView />} />
      <Route path="/admin/*" element={
        <Suspense fallback={
          <div className="h-screen w-full flex items-center justify-center bg-black text-amber-500 font-bold">
            CARGANDO PANEL...
          </div>
        }>
          <AdminApp />
        </Suspense>
      } />
      <Route path="/portal/*" element={
        <Suspense fallback={
          <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-amber-500 font-bold">
            ACCEDIENDO AL GARAJE...
          </div>
        }>
          <PortalApp />
        </Suspense>
      } />
    </Routes>
  );
}

export default App;
