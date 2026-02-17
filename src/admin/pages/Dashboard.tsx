
import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Bike,
  CheckCircle2,
  Clock,
  Users,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  Zap,
  // Added RefreshCw to imports
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

const StatCard = ({ title, value, icon, subValue, colorClass = 'text-amber-500', loading }: any) => (
  <div className="glass-panel p-6 rounded-[2.5rem] border border-white/5 hover:border-amber-500/30 transition-all duration-500 group relative overflow-hidden">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
      {icon}
    </div>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-4 rounded-2xl bg-zinc-900 border border-zinc-800 ${colorClass} shadow-inner`}>
        {loading ? <Loader2 size={24} className="animate-spin" /> : icon}
      </div>
      {subValue && (
        <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-500 uppercase tracking-widest">
          {subValue}
        </span>
      )}
    </div>
    <h3 className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">{title}</h3>
    <p className="text-5xl font-bold text-zinc-100 heading-racing tracking-tighter italic">
      {loading ? '---' : value}
    </p>
  </div>
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // 1. Órdenes del día
      const { count: ordersCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      // 2. Ventas del día (desde pagos para ser exactos con multimoneda/abonos)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', todayISO);

      const revenue = payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

      // 3. Nuevos Clientes (Últimos 7 días para dar contexto)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // 4. Stock Bajo (Calculado desde productos con niveles de inventario)
      const { data: lowStock } = await supabase
        .from('products')
        .select('id, min_stock, inventory_levels(stock)');

      const lowStockCount = lowStock?.filter(p => {
        const stock = p.inventory_levels?.[0]?.stock || 0;
        return stock <= p.min_stock;
      }).length || 0;

      setStats({
        dailyOrders: ordersCount || 0,
        dailyRevenue: revenue,
        newCustomers: customersCount || 0,
        lowStockItems: lowStockCount
      });

      // 5. Datos para el gráfico (Últimos 6 días + Hoy)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });

        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);

        const { data: dayPayments } = await supabase
          .from('payments')
          .select('amount')
          .gte('created_at', d.toISOString())
          .lt('created_at', nextDay.toISOString());

        const dayTotal = dayPayments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
        last7Days.push({ name: dayName, sales: dayTotal });
      }
      setWeeklyData(last7Days);

      // 6. Actividad Reciente (Últimas 5 órdenes modificadas)
      const { data: recent } = await supabase
        .from('work_orders')
        .select(`
          id, status, updated_at, 
          customer:customers(first_name, last_name),
          vehicle:vehicles(plate)
        `)
        .order('updated_at', { ascending: false })
        .limit(5);

      setRecentActivity(recent || []);

    } catch (err) {
      console.error("Error en telemetría:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Órdenes del Día"
          value={stats.dailyOrders}
          icon={<Bike size={24} />}
          subValue="En Boxes"
          loading={loading}
        />
        <StatCard
          title="Ingresos Hoy"
          value={`$${stats.dailyRevenue.toFixed(2)}`}
          icon={<TrendingUp size={24} />}
          subValue="USD Bruto"
          colorClass="text-emerald-500"
          loading={loading}
        />
        <StatCard
          title="Nuevos Pilotos"
          value={stats.newCustomers}
          icon={<Users size={24} />}
          subValue="Últimos 7d"
          colorClass="text-blue-500"
          loading={loading}
        />
        <StatCard
          title="Alertas Stock"
          value={`${stats.lowStockItems} Items`}
          icon={<AlertTriangle size={24} />}
          subValue="Crítico"
          colorClass="text-red-500"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 glass-panel p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={120} /></div>
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="heading-racing text-4xl text-zinc-100 italic uppercase">Curva de Rendimiento</h3>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">Ingresos de los últimos 7 días</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 rounded-xl border border-zinc-900">
              <Zap size={14} className="text-amber-500" />
              <span className="text-[10px] font-black text-zinc-100 uppercase tracking-widest italic">Live Feed</span>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#3f3f46"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525b', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
                <YAxis
                  stroke="#3f3f46"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: '1.5rem',
                    padding: '15px'
                  }}
                  itemStyle={{ color: '#f59e0b', fontWeight: 'bold', fontFamily: 'Teko' }}
                  labelStyle={{ color: '#52525b', marginBottom: '5px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f59e0b"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Recent Activity */}
        <div className="glass-panel p-10 rounded-[3rem] border border-white/5 flex flex-col shadow-2xl">
          <h3 className="heading-racing text-4xl text-zinc-100 mb-8 italic uppercase">Status de Pista</h3>
          <div className="space-y-6 flex-1">
            {recentActivity.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                <Clock size={48} className="mb-4" />
                <p className="heading-racing text-xl">Sin actividad reciente</p>
              </div>
            ) : (
              recentActivity.map((activity, i) => (
                <div key={activity.id} className="flex gap-5 items-start pb-6 border-b border-zinc-900 last:border-0 group">
                  <div className={`mt-2 h-3 w-3 rounded-full shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.5)] ${activity.status === 'WAITING_PARTS' ? 'bg-red-500' :
                      activity.status === 'READY' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                  <div>
                    <p className="text-zinc-100 text-sm font-bold leading-tight group-hover:text-amber-500 transition-colors">
                      {activity.customer?.first_name} {activity.customer?.last_name} ({activity.vehicle?.plate})
                    </p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                      OT #{activity.id.slice(0, 6).toUpperCase()} • <span className="text-zinc-400">{activity.status.replace('_', ' ')}</span>
                    </p>
                    <span className="text-[9px] text-zinc-700 font-bold uppercase mt-2 block italic">
                      {new Date(activity.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={fetchDashboardData} className="mt-8 w-full py-4 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 rounded-2xl transition-all font-black heading-racing text-xl border border-zinc-800 flex items-center justify-center gap-3">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> REFRESCAR TELEMETRÍA
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
