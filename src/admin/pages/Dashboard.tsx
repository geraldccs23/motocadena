import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Bike,
  Users,
  AlertTriangle,
  Loader2,
  Zap,
  RefreshCw,
  Clock,
  ChevronRight,
  ShieldCheck,
  Package
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, subValue, colorClass = 'text-amber-500', loading }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-6 border border-white/5 relative overflow-hidden group premium-border"
  >
    <div className={`absolute -right-2 -bottom-2 opacity-5 pointer-events-none group-hover:scale-150 transition-transform duration-700 ${colorClass}`}>
      {icon}
    </div>
    
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-xl bg-zinc-950/50 border border-white/5 ${colorClass} shadow-xl`}>
        {loading ? <Loader2 size={24} className="animate-spin" /> : icon}
      </div>
      {subValue && (
        <span className="text-[9px] font-black px-3 py-1 rounded-full bg-zinc-950 border border-white/10 text-zinc-500 uppercase tracking-widest">
          {subValue}
        </span>
      )}
    </div>

    <div className="space-y-1">
      <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] italic">{title}</h3>
      <p className="text-5xl font-bold text-white heading-racing tracking-tighter italic">
        {loading ? '---' : value}
      </p>
    </div>
  </motion.div>
);

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    dailyOrders: 0,
    dailyRevenue: 0,
    newCustomers: 0,
    lowStockItems: 0
  });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      // Intentar obtener sesión actual y stats
      const sessionRes = await fetch(`${backendUrl}/api/admin/cash-sessions/current`, {
        headers: { 'Authorization': `Bearer ${authSession?.access_token}` }
      });
      const sessionData = await sessionRes.json();

      let revenue = 0;
      let pivotISO = new Date(new Date().setHours(0,0,0,0)).toISOString();

      if (sessionData.is_open) {
        revenue = sessionData.session.live_calculated_usd;
        pivotISO = sessionData.session.opened_at;
      }

      // Parallel Fetching for stats
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        supabase.from('work_orders').select('id', { count: 'exact' }).gte('created_at', pivotISO),
        supabase.from('customers').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString()),
        supabase.from('products').select('min_stock, inventory_levels(stock)')
      ]);

      const lowStockCount = productsRes.data?.filter(p => (p.inventory_levels?.[0]?.stock || 0) <= p.min_stock).length || 0;

      setStats({
        dailyOrders: ordersRes.count || 0,
        dailyRevenue: revenue,
        newCustomers: customersRes.count || 0,
        lowStockItems: lowStockCount
      });

      // Gráfico de tendencia (últimos 7 días)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
        const endDay = new Date(d); endDay.setDate(endDay.getDate() + 1);

        const { data: p } = await supabase.from('payments').select('amount').gte('created_at', d.toISOString()).lt('created_at', endDay.toISOString());
        const total = p?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        last7Days.push({ name: dayName.toUpperCase(), sales: total });
      }
      setWeeklyData(last7Days);

      // Actividad Reciente
      const { data: recent } = await supabase.from('work_orders')
        .select('id, status, updated_at, customers(first_name, last_name), vehicles(plate)')
        .order('updated_at', { ascending: false }).limit(5);
      
      setRecentActivity(recent || []);

    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      {/* Header Premium */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-0.5 w-16 bg-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 italic">Paddock Real-Time</span>
          </div>
          <h1 className="heading-racing text-7xl text-white italic tracking-tighter leading-none">
            DASHBOARD <span className="text-zinc-600">CENTRAL</span>
          </h1>
        </div>
        
        <button 
          onClick={fetchDashboardData}
          className="glass-card px-8 py-3 flex items-center gap-3 border border-white/5 hover:border-amber-500/50 transition-all group"
        >
          <RefreshCw size={18} className={`text-amber-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span className="heading-racing text-xl text-white tracking-widest">REFRESCAR</span>
        </button>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ventas del Turno"
          value={`$${stats.dailyRevenue.toFixed(2)}`}
          icon={<TrendingUp size={28} />}
          subValue="Revenue"
          colorClass="text-emerald-500"
          loading={loading}
        />
        <StatCard
          title="Órdenes Activas"
          value={stats.dailyOrders}
          icon={<Bike size={28} />}
          subValue="En Taller"
          loading={loading}
        />
        <StatCard
          title="Nuevos Pilotos"
          value={stats.newCustomers}
          icon={<Users size={28} />}
          subValue="Últimos 7 días"
          colorClass="text-blue-500"
          loading={loading}
        />
        <StatCard
          title="Stock Crítico"
          value={stats.lowStockItems}
          icon={<AlertTriangle size={28} />}
          subValue="Repuestos"
          colorClass="text-red-500"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 glass-card p-10 premium-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
            <TrendingUp size={200} />
          </div>
          
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="heading-racing text-4xl text-white italic tracking-tight">RENDIMIENTO SEMANAL</h3>
              <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase mt-1">Histórico de ingresos brutos (USD)</p>
            </div>
            <div className="px-5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-2">
              <Zap size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Live Feed</span>
            </div>
          </div>

          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#3f3f46"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525b', fontWeight: 'bold' }}
                />
                <YAxis
                  stroke="#3f3f46"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525b' }}
                />
                <Tooltip
                  cursor={{ stroke: '#f59e0b', strokeWidth: 1 }}
                  contentStyle={{
                    backgroundColor: '#09090b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    padding: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                  itemStyle={{ color: '#f59e0b', fontWeight: 'bold', fontFamily: 'Teko', fontSize: '24px' }}
                  labelStyle={{ color: '#52525b', marginBottom: '10px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', letterSpacing: '2px' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f59e0b"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                  animationDuration={2500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status de Pista (Actividad Reciente) */}
        <div className="glass-card p-10 premium-border flex flex-col h-full bg-zinc-950/20">
          <div className="flex items-center gap-4 mb-10">
            <ShieldCheck className="text-amber-500" size={32} />
            <h3 className="heading-racing text-4xl text-white italic tracking-tight">STATUS PISTA</h3>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {recentActivity.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                <Clock size={60} className="mb-6 text-zinc-600" />
                <p className="heading-racing text-2xl text-zinc-500">Buscando actividad...</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <motion.div 
                  key={activity.id} 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4 items-center p-5 bg-black/40 border border-white/5 rounded-2xl group hover:border-amber-500/20 transition-all cursor-default"
                >
                  <div className={`h-12 w-1.5 rounded-full shrink-0 ${
                    activity.status === 'READY' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                    activity.status === 'WAITING_PARTS' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                    'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-white text-xs font-black uppercase tracking-widest truncate group-hover:text-amber-500 transition-colors">
                        {activity.customers?.first_name} {activity.customers?.last_name}
                      </p>
                      <span className="text-[10px] text-zinc-600 font-bold whitespace-nowrap">
                        {new Date(activity.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <p className="text-[10px] text-zinc-500 font-bold">{activity.vehicles?.plate}</p>
                       <div className="h-1 w-1 rounded-full bg-zinc-800" />
                       <p className="text-[10px] text-amber-500/80 font-black uppercase tracking-widest italic">{activity.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-800 group-hover:text-amber-500/50 transition-colors" />
                </motion.div>
              ))
            )}
          </div>
          
          <div className="mt-10 p-5 bg-gradient-to-r from-amber-500/10 to-transparent border border-white/5 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <Package size={24} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Alerta de Inventario</p>
                <p className="text-[9px] text-zinc-500 font-bold leading-tight mt-1">Hay {stats.lowStockItems} productos por debajo del stock de seguridad.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
