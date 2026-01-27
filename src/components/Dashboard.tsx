import { useState, useEffect } from 'react';
import {
  Users, Wrench, ClipboardList, Settings, LogOut,
  BarChart3, Plus, TrendingUp, CalendarCheck, BadgePercent, ShoppingCart,
  Package, Truck, Receipt, RotateCcw, Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ADMIN_BASE } from '../lib/api';
import { clearUser, isAdmin } from '../lib/auth';
import type { User } from '../lib/auth';
import ClientsManager from './ClientsManager';
import ServicesManager from './ServicesManager';
import WorkOrdersManager from './WorkOrdersManager';
import UsersManager from './UsersManager';
import SqlEditor from './SqlEditor';
import AppointmentsManager from './AppointmentsManager';
import MembershipsManager from './MembershipsManager';
import PosManager from './PosManager';
import ProductsManager from './ProductsManager';
import SuppliersManager from './SuppliersManager';
import PurchasesManager from './PurchasesManager';
import ReturnsManager from './ReturnsManager';
import ReportsManager from './ReportsManager';
import LoyaltyManager from './LoyaltyManager';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type View = 'dashboard' | 'clients' | 'services' | 'orders' | 'users' | 'sql' | 'mechanics' | 'appointments' | 'memberships' | 'pos' | 'products' | 'suppliers' | 'purchases' | 'returns' | 'reports' | 'loyalty';

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedToday: 0,
    totalClients: 0,
    totalServices: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [ordersResult, completedResult, clientsResult, servicesResult] = await Promise.all([
        supabase
          .from('work_orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'in_progress']),
        supabase
          .from('work_orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('updated_at', today.toISOString()),
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
      ]);

      let totalServices = servicesResult.count || 0;
      if (!totalServices || (servicesResult as any)?.error) {
        try {
          const resp = await fetch(`${ADMIN_BASE}/admin/services`);
          if (resp.ok) {
            const json = await resp.json();
            totalServices = (json?.services || []).length;
          }
        } catch (e) {
          console.warn('No se pudo obtener conteo de servicios desde backend:', (e as any)?.message || e);
        }
      }

      setStats({
        activeOrders: ordersResult.count || 0,
        completedToday: completedResult.count || 0,
        totalClients: clientsResult.count || 0,
        totalServices
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearUser();
    onLogout();
  };

  const menuItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: BarChart3, roles: ['admin', 'mechanic', 'receptionist'] },
    { id: 'orders' as View, label: 'Órdenes', icon: ClipboardList, roles: ['admin', 'mechanic', 'receptionist'] },
    { id: 'appointments' as View, label: 'Agendamiento', icon: CalendarCheck, roles: ['admin', 'mechanic', 'receptionist'] },
    { id: 'pos' as View, label: 'POS', icon: ShoppingCart, roles: ['admin', 'receptionist'] },
    { id: 'returns' as View, label: 'Devoluciones', icon: RotateCcw, roles: ['admin', 'receptionist'] },
    { id: 'reports' as View, label: 'Reporte Diario', icon: TrendingUp, roles: ['admin', 'receptionist'] },
    { id: 'products' as View, label: 'Productos y Stock', icon: Package, roles: ['admin'] },
    { id: 'suppliers' as View, label: 'Proveedores', icon: Truck, roles: ['admin'] },
    { id: 'purchases' as View, label: 'Compras', icon: Receipt, roles: ['admin', 'receptionist'] },
    { id: 'clients' as View, label: 'Clientes', icon: Users, roles: ['admin', 'receptionist'] },
    { id: 'services' as View, label: 'Servicios', icon: Wrench, roles: ['admin'] },
    { id: 'memberships' as View, label: 'Membresías', icon: BadgePercent, roles: ['admin', 'receptionist'] },
    { id: 'loyalty' as View, label: 'Lealtad', icon: Award, roles: ['admin', 'receptionist'] },
    { id: 'users' as View, label: 'Usuarios', icon: Settings, roles: ['admin'] },
    { id: 'sql' as View, label: 'SQL Editor', icon: Settings, roles: ['admin'] }
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen garage-texture flex">
      <aside className="w-72 card-metal flex flex-col">
        <div className="p-6 border-b border-neutral-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="w-8 h-8 text-amber-500" />
            <div>
              <h1 className="text-2xl font-bold heading-racing text-amber-500">MOTOCADENA</h1>
              <p className="text-xs text-neutral-400 uppercase tracking-wider">Panel de Control</p>
            </div>
          </div>

          <div className="metal-gradient rounded-lg p-3 border border-neutral-700/50">
            <p className="text-sm text-neutral-400 uppercase tracking-wide mb-1">Usuario Activo</p>
            <p className="font-semibold text-neutral-100">{user.full_name}</p>
            <p className="text-xs text-amber-500 uppercase tracking-wider mt-1">{user.role}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 scrollbar-thin overflow-y-auto">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-racing ${currentView === item.id
                ? 'btn-gold'
                : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 border border-transparent'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-all duration-200 border border-red-800/50"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-racing">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto scrollbar-thin">
        {currentView === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h2 className="text-4xl font-bold heading-racing text-neutral-100 mb-2">
                BIENVENIDO, {user.full_name.toUpperCase()}
              </h2>
              <p className="text-neutral-400 text-racing">
                Panel de control del taller
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="card-metal p-6 animate-pulse">
                    <div className="h-12 bg-neutral-800 rounded mb-4"></div>
                    <div className="h-8 bg-neutral-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card-metal p-6 hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <ClipboardList className="w-10 h-10 text-amber-500" />
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-neutral-100 mb-1">{stats.activeOrders}</p>
                  <p className="text-sm text-neutral-400 uppercase tracking-wide">Órdenes Activas</p>
                </div>

                <div className="card-metal p-6 hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <BarChart3 className="w-10 h-10 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-neutral-100 mb-1">{stats.completedToday}</p>
                  <p className="text-sm text-neutral-400 uppercase tracking-wide">Completadas Hoy</p>
                </div>

                <div className="card-metal p-6 hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-10 h-10 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-neutral-100 mb-1">{stats.totalClients}</p>
                  <p className="text-sm text-neutral-400 uppercase tracking-wide">Total Clientes</p>
                </div>

                <div className="card-metal p-6 hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <Wrench className="w-10 h-10 text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-neutral-100 mb-1">{stats.totalServices}</p>
                  <p className="text-sm text-neutral-400 uppercase tracking-wide">Servicios Disponibles</p>
                </div>
              </div>
            )}

            <div className="card-metal p-8 text-center">
              <Plus className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold heading-racing text-neutral-100 mb-4">
                NUEVA ORDEN DE TRABAJO
              </h3>
              <p className="text-neutral-400 mb-6">
                Crea una nueva orden de trabajo para comenzar el servicio
              </p>
              <button
                onClick={() => setCurrentView('orders')}
                className="btn-gold text-lg"
              >
                + CREAR ORDEN
              </button>
            </div>
          </div>
        )}

        {currentView === 'clients' && <ClientsManager />}
        {currentView === 'services' && <ServicesManager />}
        {currentView === 'orders' && <WorkOrdersManager user={user} onStatsUpdate={loadStats} />}
        {currentView === 'appointments' && <AppointmentsManager onNavigateToOrders={() => setCurrentView('orders')} />}
        {currentView === 'memberships' && <MembershipsManager />}
        {currentView === 'loyalty' && <LoyaltyManager />}
        {currentView === 'pos' && <PosManager />}
        {currentView === 'products' && <ProductsManager />}
        {currentView === 'suppliers' && <SuppliersManager />}
        {currentView === 'purchases' && <PurchasesManager />}
        {currentView === 'returns' && <ReturnsManager />}
        {currentView === 'reports' && <ReportsManager />}
        {currentView === 'users' && isAdmin(user) && <UsersManager />}
        {currentView === 'sql' && isAdmin(user) && <SqlEditor />}
      </main>
    </div>
  );
}
