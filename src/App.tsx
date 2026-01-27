import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PublicWebsite from './components/PublicWebsite';
import SponsorsPresentation from './components/SponsorsPresentation';
import { getCurrentUser } from './lib/auth';
import type { User } from './lib/auth';

type View = 'public' | 'login' | 'dashboard' | 'sponsors';

function App() {
  const [currentView, setCurrentView] = useState<View>('public');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set initial view from pathname if not authenticated yet
    const path = window.location.pathname.replace(/\/+$/, '');
    if (path === '/sponsors') {
      setCurrentView('sponsors');
    }
    checkUser();
  }, []);

  const checkUser = async () => {
    const user = await getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setCurrentView('dashboard');
    }
    setIsLoading(false);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('public');
  };

  const handleNavigateToPanel = () => {
    setCurrentView('login');
  };

  const handleNavigateToSponsors = () => {
    setCurrentView('sponsors');
    const href = '/sponsors';
    if (window.location.pathname !== href) {
      window.history.pushState({}, '', href);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen garage-texture flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentView === 'public') {
    return <PublicWebsite onNavigateToPanel={handleNavigateToPanel} onNavigateToSponsors={handleNavigateToSponsors} />;
  }

  if (currentView === 'sponsors') {
    return <SponsorsPresentation />;
  }

  if (currentView === 'login' || !currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard user={currentUser} onLogout={handleLogout} />;
}

export default App;
