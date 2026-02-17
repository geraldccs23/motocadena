
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Wrench,
  Package,
  ShoppingCart,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Bike,
  ShieldCheck,
  Loader2,
  Layers,
  BarChart3,
  BookOpen,
  MoreHorizontal,
  X as CloseIcon,
  FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const SidebarItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active?: boolean }> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${active
      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
      : 'text-zinc-400 hover:text-amber-500 hover:bg-zinc-800/50'
      }`}
  >
    <div className={`transition-colors ${active ? 'text-black' : 'group-hover:text-amber-500'}`}>
      {icon}
    </div>
    <span className="heading-racing text-lg font-medium tracking-tight">{label}</span>
    {active && <ChevronRight className="ml-auto w-4 h-4" />}
  </Link>
);

const BottomNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active?: boolean }> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex flex-col items-center justify-center flex-1 py-2 gap-1 transition-all ${active ? 'text-amber-500' : 'text-zinc-500'
      }`}
  >
    <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
      {icon}
    </div>
    <span className="text-[8px] font-black uppercase tracking-widest leading-none">{label}</span>
  </Link>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { profile, loading, hasRole, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (location.pathname === '/admin/login') return <>{children}</>;
  if (!profile && !loading) return null;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black overflow-hidden">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 glass-panel border-r border-zinc-800/50 flex-col z-20">
        <div className="p-6 flex flex-col items-center border-b border-zinc-800/50">
          <div className="flex items-center gap-2 mb-1">
            <Bike className="w-8 h-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            <h1 className="heading-racing text-3xl font-bold text-zinc-100 tracking-tighter">
              MOTOCADENA
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-bold heading-racing">Performance Workshop</p>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-hide">
          <SidebarItem to="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/admin' || location.pathname === '/admin/'} />
          <SidebarItem to="/admin/agenda" icon={<Calendar size={20} />} label="Agenda" active={location.pathname === '/admin/agenda'} />
          <SidebarItem to="/admin/ordenes" icon={<Wrench size={20} />} label="Órdenes" active={location.pathname.startsWith('/admin/ordenes')} />
          <SidebarItem to="/admin/clientes" icon={<Users size={20} />} label="Clientes" active={location.pathname.startsWith('/admin/clientes')} />
          <SidebarItem to="/admin/manuales" icon={<BookOpen size={20} />} label="Manuales" active={location.pathname.startsWith('/admin/manuales')} />
          <SidebarItem to="/admin/presupuestos" icon={<FileText size={20} />} label="Presupuestos" active={location.pathname.startsWith('/admin/presupuestos')} />

          {(hasRole(['DIRECTOR', 'GERENTE_GENERAL', 'ADMINISTRADOR', 'VENDEDOR', 'CAJERO'])) && (
            <>
              <SidebarItem to="/admin/inventario" icon={<Package size={20} />} label="Inventario" active={location.pathname.startsWith('/admin/inventario')} />
              <SidebarItem to="/admin/servicios" icon={<Layers size={20} />} label="Servicios" active={location.pathname.startsWith('/admin/servicios')} />
              <SidebarItem to="/admin/pos" icon={<ShoppingCart size={20} />} label="POS Ventas" active={location.pathname === '/admin/pos'} />
              <SidebarItem to="/admin/reportes-ventas" icon={<BarChart3 size={20} />} label="Reportes" active={location.pathname === '/admin/reportes-ventas'} />
            </>
          )}

          <SidebarItem to="/admin/membresias" icon={<CreditCard size={20} />} label="Membresías" active={location.pathname === '/admin/membresias'} />

          {hasRole(['DIRECTOR', 'GERENTE_GENERAL', 'ADMINISTRADOR']) && (
            <div className="pt-4 mt-4 border-t border-zinc-800/50">
              <p className="px-4 mb-2 text-[9px] font-bold uppercase text-zinc-600 tracking-[0.2em]">Administración</p>
              <SidebarItem to="/admin/usuarios" icon={<ShieldCheck size={20} />} label="Usuarios" active={location.pathname === '/admin/usuarios'} />
              <SidebarItem to="/admin/configuracion" icon={<Settings size={20} />} label="Ajustes" active={location.pathname === '/admin/configuracion'} />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-800/50">
          <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-zinc-500 hover:text-red-500 transition-colors group">
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="heading-racing text-lg">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 glass-panel border-t border-zinc-800/50 flex items-center justify-around px-2 z-[100] pb-2">
        <BottomNavItem to="/admin" icon={<LayoutDashboard size={24} />} label="DASH" active={location.pathname === '/admin' || location.pathname === '/admin/'} />
        <BottomNavItem to="/admin/ordenes" icon={<Wrench size={24} />} label="BOXES" active={location.pathname.startsWith('/admin/ordenes')} />
        <BottomNavItem to="/admin/pos" icon={<ShoppingCart size={24} />} label="VENTAS" active={location.pathname === '/admin/pos'} />
        <BottomNavItem to="/admin/clientes" icon={<Users size={24} />} label="PILOTOS" active={location.pathname.startsWith('/admin/clientes')} />

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center flex-1 py-2 gap-1 transition-all ${isMobileMenuOpen ? 'text-amber-500' : 'text-zinc-500'}`}
        >
          <div className={`${isMobileMenuOpen ? 'scale-110' : 'scale-100'} transition-transform`}>
            {isMobileMenuOpen ? <CloseIcon size={24} /> : <MoreHorizontal size={24} />}
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest leading-none">MÁS</span>
        </button>
      </nav>

      {/* MOBILE EXPANDED MENU */}
      <div className={`fixed inset-0 bg-zinc-950 z-[110] md:hidden transition-all duration-300 border-t border-zinc-800 ${isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
        <div className="p-8 pt-20 grid grid-cols-2 gap-4">
          <Link to="/admin/agenda" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-3 p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
            <Calendar size={32} className="text-amber-500" />
            <span className="heading-racing text-lg font-bold text-white uppercase italic">Agenda</span>
          </Link>
          <Link to="/admin/manuales" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-3 p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
            <BookOpen size={32} className="text-amber-500" />
            <span className="heading-racing text-lg font-bold text-white uppercase italic">Manuales</span>
          </Link>
          <Link to="/admin/presupuestos" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-3 p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
            <FileText size={32} className="text-amber-500" />
            <span className="heading-racing text-lg font-bold text-white uppercase italic">Presupuestos</span>
          </Link>

          {hasRole(['DIRECTOR', 'GERENTE_GENERAL', 'ADMINISTRADOR', 'VENDEDOR', 'CAJERO']) && (
            <>
              <Link to="/admin/inventario" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-3 p-6 bg-zinc-900 rounded-3xl border border-zinc-800 text-center">
                <Package size={32} className="text-amber-500" />
                <span className="heading-racing text-lg font-bold text-white uppercase italic">Inventario</span>
              </Link>
              <Link to="/admin/reportes-ventas" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-3 p-6 bg-zinc-900 rounded-3xl border border-zinc-800 text-center">
                <BarChart3 size={32} className="text-amber-500" />
                <span className="heading-racing text-lg font-bold text-white uppercase italic">Reportes</span>
              </Link>
            </>
          )}

          {hasRole(['DIRECTOR', 'GERENTE_GENERAL', 'ADMINISTRADOR']) && (
            <Link to="/admin/usuarios" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-3 p-6 bg-zinc-900 rounded-3xl border border-zinc-800 col-span-2">
              <ShieldCheck size={32} className="text-red-500" />
              <span className="heading-racing text-lg font-bold text-white uppercase italic">Administración Personal</span>
            </Link>
          )}

          <button
            onClick={() => { logout(); setIsMobileMenuOpen(false); }}
            className="flex items-center justify-center gap-3 p-6 bg-red-500/10 rounded-3xl border border-red-500/20 col-span-2 mt-8"
          >
            <LogOut size={24} className="text-red-500" />
            <span className="heading-racing text-xl font-bold text-red-500 uppercase italic">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      <main className="flex-1 relative overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.03),transparent_50%)] pb-20 md:pb-0">
        <header className="sticky top-0 z-10 h-16 glass-panel border-b border-zinc-800/50 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Bike className="w-6 h-6 text-amber-500" />
            <span className="heading-racing text-xl font-bold text-zinc-100">MOTOCADENA</span>
          </div>

          <div className="hidden md:block">
            {/* Título de módulo removido para evitar solapamiento con títulos internos */}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              {loading ? (
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-1"></div>
              ) : (
                <>
                  <p className="text-sm font-bold text-zinc-100 leading-none">{profile?.full_name || 'Staff'}</p>
                  <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-1">
                    {profile?.role?.replace('_', ' ') || 'Rider'}
                  </p>
                </>
              )}
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-lg">
              {loading ? (
                <Loader2 size={16} className="animate-spin text-zinc-700" />
              ) : (
                <img src={`https://ui-avatars.com/api/?name=${profile?.full_name || 'MC'}&background=18181b&color=f59e0b&bold=true`} alt="avatar" />
              )}
            </div>
            <button onClick={logout} className="md:hidden text-zinc-600 p-1"><LogOut size={20} /></button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
