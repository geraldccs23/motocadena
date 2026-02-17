import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const POS = lazy(() => import('./pages/POS'));
const Login = lazy(() => import('./pages/Login'));
const Users = lazy(() => import('./pages/Users'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Services = lazy(() => import('./pages/Services'));
const Customers = lazy(() => import('./pages/Customers'));
const Appointments = lazy(() => import('./pages/Appointments'));
const SalesReports = lazy(() => import('./pages/SalesReports'));
const Budgets = lazy(() => import('./pages/Budgets'));
const TechnicalGuides = lazy(() => import('./pages/TechnicalGuides'));

const LoadingFallback = () => (
  <div className="h-screen w-full flex items-center justify-center bg-black text-amber-500">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
      <h2 className="heading-racing text-3xl tracking-[0.3em] animate-pulse">MOTOCADENA</h2>
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Calentando Motores...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/ordenes" element={<ProtectedRoute><Layout><WorkOrders /></Layout></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute><Layout><POS /></Layout></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
          <Route path="/inventario" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
          <Route path="/servicios" element={<ProtectedRoute><Layout><Services /></Layout></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Layout><Customers /></Layout></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><Layout><Appointments /></Layout></ProtectedRoute>} />
          <Route path="/reportes-ventas" element={<ProtectedRoute><Layout><SalesReports /></Layout></ProtectedRoute>} />
          <Route path="/presupuestos" element={<ProtectedRoute><Layout><Budgets /></Layout></ProtectedRoute>} />
          <Route path="/manuales" element={<ProtectedRoute><Layout><TechnicalGuides /></Layout></ProtectedRoute>} />
          <Route path="/membresias" element={<ProtectedRoute><Layout><div className="glass-panel p-10 text-center rounded-3xl border border-white/5"><h2 className="heading-racing text-5xl text-amber-500">Módulo de Membresías</h2><p className="text-zinc-500 mt-2 font-medium">Planes VIP y lealtad próximamente.</p></div></Layout></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><Layout><div className="glass-panel p-10 text-center rounded-3xl border border-white/5"><h2 className="heading-racing text-5xl text-amber-500">Configuración</h2><p className="text-zinc-500 mt-2 font-medium">Ajustes del taller y sistema.</p></div></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
};

export default App;