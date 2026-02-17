import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import PublicWebsite from './components/PublicWebsite';
import SponsorsPresentation from './components/SponsorsPresentation';
import ScooterPage from './components/ScooterPage';
import PublicBudgetView from './components/PublicBudgetView';

const AdminApp = lazy(() => import('./admin/AdminApp'));

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
      <Route path="/" element={<PublicWebsite onNavigateToSponsors={handleNavigateToSponsors} onNavigateToAdmin={handleNavigateToAdmin} onNavigateToScooter={handleNavigateToScooter} />} />
      <Route path="/tienda" element={<PublicWebsite onNavigateToSponsors={handleNavigateToSponsors} onNavigateToAdmin={handleNavigateToAdmin} onNavigateToScooter={handleNavigateToScooter} initialSection="tienda" />} />
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
    </Routes>
  );
}

export default App;
