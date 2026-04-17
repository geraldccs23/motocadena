import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, ChevronRight, Bike, User, Loader2, X, Calendar, Gauge,
  ClipboardList, Wrench, Package, CheckCircle2,
  Activity, ArrowLeft, Trash2, ShieldCheck,
  RefreshCcw, LayoutGrid, List, MessageSquare, Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WorkOrder, OrderStatus, Customer, Vehicle, Service, Product, UserProfile } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const INSPECTION_ITEMS = [
  { id: 'lights', label: 'Electrónica / Luces' },
  { id: 'brakes', label: 'Frenos (Fluido/Vida)' },
  { id: 'tires', label: 'Cauchos (Presión)' },
  { id: 'fluids', label: 'Aceite / Refrigerante' },
  { id: 'suspension', label: 'Suspensión (Retenes)' },
  { id: 'transmission', label: 'Kit de Arrastre' }
];

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const styles: Record<OrderStatus, string> = {
    DRAFT: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    WAITING_PARTS: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    READY: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    DELIVERED: 'bg-zinc-900 text-zinc-500 border-zinc-800',
    CANCELED: 'bg-zinc-950 text-zinc-700 border-zinc-900'
  };

  return (
    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const WorkOrders: React.FC = () => {
  const { profile } = useAuthContext();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showItemSearch, setShowItemSearch] = useState<'SERVICE' | 'PART' | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [currentOrder, setCurrentOrder] = useState<WorkOrder | null>(null);
  const [mechanics, setMechanics] = useState<UserProfile[]>([]);
  const [searchCatalogTerm, setSearchCatalogTerm] = useState('');
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [mileage, setMileage] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>([]);

  const isMechanic = profile?.role === 'MECANICO';

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('work_orders')
        .select(`
          *, 
          customer:customers(*), 
          vehicle:vehicles(*), 
          mechanic:user_profiles!mechanic_id(*)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchSupportData();
  }, [fetchOrders]);

  const fetchSupportData = async () => {
    try {
      const { data: c } = await supabase.from('customers').select('*, vehicles(*)').order('first_name');
      setCustomersList(c || []);

      const { data: m } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['MECANICO', 'AYUDANTE_MECANICO'])
        .eq('is_active', true)
        .order('full_name');

      setMechanics(m || []);
    } catch (err) {
      console.error("Error soporte:", err);
    }
  };

  const fetchOrderDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          customer:customers(*),
          vehicle:vehicles(*),
          mechanic:user_profiles!mechanic_id(*),
          services:work_order_services(*, service:services(*)),
          parts:work_order_parts(*, product:products(*))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCurrentOrder(data);
      setSelectedOrderId(id);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncTotals = async (orderId: string) => {
    try {
      const { data: services } = await supabase.from('work_order_services').select('price, quantity').eq('work_order_id', orderId);
      const { data: parts } = await supabase.from('work_order_parts').select('price, quantity').eq('work_order_id', orderId);

      const totalLabor = (services || []).reduce((acc, s) => acc + (s.price * s.quantity), 0);
      const totalParts = (parts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
      const totalAmount = totalLabor + totalParts;

      await supabase.from('work_orders').update({
        total_labor: totalLabor,
        total_parts: totalParts,
        total_amount: totalAmount
      }).eq('id', orderId);

      fetchOrderDetails(orderId);
    } catch (err) {
      console.error("Error sincronizando totales:", err);
    }
  };

  const updateOrderField = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase.from('work_orders').update({ [field]: value }).eq('id', id);
      if (error) throw error;
      fetchOrderDetails(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleInspection = async (section: 'initial_inspection' | 'final_inspection', itemId: string) => {
    if (!currentOrder) return;
    const currentData = (currentOrder as any)[section] || {};
    const newData = { ...currentData, [itemId]: !currentData[itemId] };
    await updateOrderField(currentOrder.id, section, newData);
  };

  const handleAddItem = async (item: any) => {
    if (!currentOrder || !showItemSearch) return;
    setSubmitting(true);
    try {
      if (showItemSearch === 'SERVICE') {
        await supabase.from('work_order_services').insert([{
          work_order_id: currentOrder.id,
          service_id: item.id,
          price: item.price,
          quantity: 1
        }]);
      } else {
        await supabase.from('work_order_parts').insert([{
          work_order_id: currentOrder.id,
          product_id: item.id,
          price: item.price,
          quantity: 1
        }]);
      }
      setShowItemSearch(null);
      await syncTotals(currentOrder.id);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = async (type: 'service' | 'part', itemId: string) => {
    if (!currentOrder) return;
    try {
      const table = type === 'service' ? 'work_order_services' : 'work_order_parts';
      await supabase.from(table).delete().eq('id', itemId);
      await syncTotals(currentOrder.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedVehicle) return;
    setSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        vehicle_id: selectedVehicle.id,
        advisor_id: profile?.id,
        status: 'DRAFT',
        mileage: parseInt(mileage) || 0,
        fault_description: faultDescription.trim() || 'Ingreso a boxes',
        initial_inspection: {},
        final_inspection: {},
        total_labor: 0,
        total_parts: 0,
        total_amount: 0
      };
      const { error } = await supabase.from('work_orders').insert([payload]);
      if (error) throw error;
      setShowCreateModal(false);
      resetForm();
      fetchOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    setMileage('');
    setFaultDescription('');
  };

  useEffect(() => {
    if (showItemSearch) {
      const search = async () => {
        const table = showItemSearch === 'SERVICE' ? 'services' : 'products';
        const { data } = await supabase.from(table).select('*').ilike('name', `%${searchCatalogTerm}%`).limit(5);
        setCatalogItems(data || []);
      };
      search();
    }
  }, [searchCatalogTerm, showItemSearch]);

  const renderDetailView = () => {
    if (!currentOrder) return null;
    const isBilled = currentOrder.billing_status !== 'NOT_BILLED';

    return (
      <div className="space-y-8 animate-in slide-in-from-right-10 duration-700 pb-20">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <button
            onClick={() => { setSelectedOrderId(null); fetchOrders(); }}
            className="flex items-center gap-3 text-zinc-500 hover:text-white transition-all group"
          >
            <ArrowLeft className="group-hover:-translate-x-2 transition-transform" />
            <span className="heading-racing text-3xl italic tracking-tighter uppercase">Race Control / Listado</span>
          </button>
          
          <div className="flex items-center gap-3">
             <AnimatePresence>
               {isBilled && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                    currentOrder.billing_status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {currentOrder.billing_status === 'PAID' ? 'LIQUIDADA' : 'PENDIENTE COBRO'}
                  </motion.div>
                )}
             </AnimatePresence>
             <StatusBadge status={currentOrder.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Detailed Info Card */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-10 premium-border relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                  <Bike size={200} />
               </div>
               
               <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                  <div className="w-24 h-24 bg-zinc-950/50 rounded-[2rem] border border-white/5 flex items-center justify-center text-amber-500 shadow-xl shrink-0">
                    <Bike size={48} className="drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div>
                      <h2 className="heading-racing text-6xl text-white italic tracking-tighter leading-none uppercase">OT #{currentOrder.id.slice(0, 8).toUpperCase()}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="heading-racing text-3xl text-amber-500 italic tracking-widest uppercase">{currentOrder.vehicle?.plate}</p>
                        <div className="h-1 w-1 rounded-full bg-zinc-800" />
                        <p className="text-zinc-400 font-bold uppercase tracking-tight">{currentOrder.vehicle?.brand} {currentOrder.vehicle?.model}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <div className="px-4 py-2 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2">
                        <User size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">{currentOrder.customer?.first_name} {currentOrder.customer?.last_name}</span>
                      </div>
                      <div className="px-4 py-2 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2">
                        <Gauge size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">{currentOrder.mileage} KM</span>
                      </div>
                      <div className="px-4 py-2 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2">
                        <ShieldCheck size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">Inboxes: {new Date(currentOrder.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Tasks & Spares Area */}
            <div className="glass-card p-10 premium-border space-y-8 bg-zinc-950/20">
              <div className="flex items-center justify-between border-b border-white/5 pb-8">
                 <div className="flex items-center gap-4">
                    <Briefcase className="text-amber-500" size={32} />
                    <h3 className="heading-racing text-4xl text-white italic tracking-tight">MANIFIESTO TÉCNICO</h3>
                 </div>
                 {!isMechanic && !isBilled && (
                    <div className="flex gap-2">
                       <button onClick={() => setShowItemSearch('SERVICE')} className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all flex items-center gap-2">
                          <Wrench size={14} /> +Labor
                       </button>
                       <button onClick={() => setShowItemSearch('PART')} className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-2">
                          <Package size={14} /> +Spare
                       </button>
                    </div>
                 )}
              </div>

              <div className="space-y-4">
                {currentOrder.services?.length === 0 && currentOrder.parts?.length === 0 && (
                   <div className="py-20 text-center opacity-20 border-2 border-dashed border-zinc-900 rounded-[2rem]">
                      <ClipboardList className="mx-auto mb-4" size={48} />
                      <p className="heading-racing text-2xl uppercase italic">No se han cargado tareas</p>
                   </div>
                )}

                {currentOrder.services?.map((s: any) => (
                  <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={s.id} className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-2xl group hover:border-amber-500/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                      <div>
                        <p className="text-white font-bold text-sm uppercase italic tracking-tight">{s.service?.name}</p>
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">Servicio Profesional</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {!isMechanic && <span className="heading-racing text-2xl text-amber-500 italic">${Number(s.price).toFixed(2)}</span>}
                      {!isMechanic && !isBilled && <button onClick={() => removeItem('service', s.id)} className="text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>}
                    </div>
                  </motion.div>
                ))}

                {currentOrder.parts?.map((p: any) => (
                  <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={p.id} className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-2xl group hover:border-blue-500/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                      <div>
                        <p className="text-white font-bold text-sm uppercase italic tracking-tight">{p.product?.name}</p>
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">Componente / Repuesto</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {!isMechanic && <span className="heading-racing text-2xl text-blue-500 italic">${Number(p.price).toFixed(2)}</span>}
                      {!isMechanic && !isBilled && <button onClick={() => removeItem('part', p.id)} className="text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>}
                    </div>
                  </motion.div>
                ))}
              </div>

              {!isMechanic && (
                 <div className="pt-10 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center px-4">
                       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Facturación Bruta</span>
                       <span className="text-zinc-300 font-bold tracking-widest">${Number(currentOrder.total_amount || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/10 to-transparent rounded-[2rem] blur-xl opacity-30" />
                      <div className="relative flex justify-between items-center bg-black/60 p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                         <span className="heading-racing text-4xl text-white italic tracking-tighter uppercase">Total Presupuestado</span>
                         <span className="heading-racing text-7xl text-amber-500 italic leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                            ${(Number(currentOrder.total_amount || 0)).toFixed(2)}
                         </span>
                      </div>
                    </div>
                 </div>
              )}
            </div>
          </div>

          {/* Sidebar Telemetría */}
          <div className="space-y-8">
             <div className="glass-card p-10 premium-border space-y-8">
                <div className="flex items-center gap-3">
                   <Settings className="text-zinc-600" size={20} />
                   <h3 className="heading-racing text-2xl text-white italic uppercase tracking-widest">TELEMETRÍA</h3>
                </div>
                
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Técnico Asignado</label>
                      <select
                        disabled={isMechanic || isBilled}
                        value={currentOrder.mechanic_id || ''}
                        onChange={(e) => updateOrderField(currentOrder.id, 'mechanic_id', e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white font-bold text-xs outline-none focus:border-amber-500/50 appearance-none disabled:opacity-50"
                      >
                        <option value="">Definir Mecánico...</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </select>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cambio de Estatus</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['DRAFT', 'IN_PROGRESS', 'WAITING_PARTS', 'READY'].map(s => (
                          <button
                            key={s}
                            disabled={isBilled && s !== currentOrder.status}
                            onClick={() => updateOrderField(currentOrder.id, 'status', s)}
                            className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                              currentOrder.status === s 
                              ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20' 
                              : 'bg-zinc-950 border-white/5 text-zinc-600 hover:border-white/10'
                            } disabled:opacity-30`}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="glass-card p-10 premium-border space-y-6">
                <div className="flex items-center gap-3">
                   <Activity className="text-emerald-500" size={24} />
                   <h3 className="heading-racing text-2xl text-white italic uppercase tracking-widest">CHECKPOINT 1</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-4">Inspección de Entrada</p>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    {INSPECTION_ITEMS.map(item => (
                      <button
                        key={item.id}
                        disabled={isBilled}
                        onClick={() => handleToggleInspection('initial_inspection', item.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                          currentOrder.initial_inspection?.[item.id] 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                          : 'bg-black/40 border-white/5 text-zinc-700'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                        {currentOrder.initial_inspection?.[item.id] ? <CheckCircle2 size={14} className="text-emerald-500" /> : <div className="h-4 w-4 rounded-full border border-zinc-800" />}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const filteredOrders = orders.filter(o =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-0.5 w-20 bg-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 italic">Paddock Control</span>
            </div>
            <h1 className="heading-racing text-8xl text-white italic tracking-tighter leading-none">
              ÓRDENES <span className="text-zinc-600">TRABAJO</span>
            </h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={fetchOrders}
              className="glass-card p-5 border border-white/5 hover:border-amber-500/30 text-zinc-600 hover:text-amber-500 transition-all"
            >
              <RefreshCcw size={24} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="glass-card px-10 py-5 bg-amber-500 hover:bg-amber-400 text-black border border-amber-600/50 shadow-xl shadow-amber-500/20 transition-all active:scale-95"
            >
              <div className="flex items-center gap-4">
                <Plus size={32} />
                <span className="heading-racing text-4xl uppercase italic leading-none">Apertura</span>
              </div>
            </button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-colors" size={28} />
          <input
            type="text"
            placeholder="Buscar por placa, cliente o folio..."
            className="w-full bg-zinc-950/50 border border-white/5 rounded-[2.5rem] py-8 pl-20 pr-10 text-2xl text-white font-black italic tracking-tight outline-none focus:border-amber-500/50 focus:bg-zinc-950 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-2xl placeholder:text-zinc-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="glass-card rounded-[3.5rem] overflow-hidden border border-white/5 premium-border shadow-3xl bg-zinc-950/30">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/60 border-b border-white/5">
                  <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">ID FOLIO</th>
                  <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">PILOTO / MÁQUINA</th>
                  <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-center">STATUS BOX</th>
                  <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-right">PRESUPUESTO</th>
                  <th className="px-12 py-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-40 text-center">
                       <Loader2 className="w-20 h-20 animate-spin mx-auto text-amber-500/20 mb-6" />
                       <p className="heading-racing text-3xl text-zinc-700 uppercase italic tracking-widest animate-pulse">Escaneando Pista...</p>
                    </td>
                  </tr>
                ) : filteredOrders.map((order) => (
                  <motion.tr 
                    key={order.id} 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    className="group cursor-pointer" 
                    onClick={() => fetchOrderDetails(order.id)}
                  >
                    <td className="px-12 py-10">
                      <div className="heading-racing text-3xl text-white italic uppercase tracking-tighter">#{order.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-zinc-600 font-black mt-1 uppercase tracking-widest flex items-center gap-2">
                         <Calendar size={12} /> {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-12 py-10">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-800 group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-all">
                             <Bike size={32} />
                          </div>
                          <div>
                             <p className="heading-racing text-3xl text-white italic tracking-tighter uppercase leading-none mb-1 group-hover:text-amber-500 transition-colors">
                                {order.vehicle?.plate || 'SIN PLACA'}
                             </p>
                             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <User size={12} /> {order.customer?.first_name} {order.customer?.last_name}
                             </p>
                          </div>
                       </div>
                    </td>
                    <td className="px-12 py-10 text-center">
                       <StatusBadge status={order.status} />
                    </td>
                    <td className="px-12 py-10 text-right">
                       {!isMechanic ? (
                          <div className="heading-racing text-5xl text-white italic tracking-tighter leading-none group-hover:text-amber-500 transition-all">
                            ${Number(order.total_amount).toFixed(2)}
                          </div>
                       ) : (
                          <div className="heading-racing text-2xl text-zinc-800 italic uppercase">Acceso Privado</div>
                       )}
                    </td>
                    <td className="px-12 py-10 text-right">
                       <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-700 group-hover:bg-amber-500 group-hover:text-black transition-all">
                          <ChevronRight size={24} />
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {selectedOrderId && currentOrder ? (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {renderDetailView()}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            {renderListView()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Catalog Search Modal */}
      <AnimatePresence>
        {showItemSearch && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowItemSearch(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card w-full max-w-xl rounded-[3rem] border border-white/10 relative z-10 overflow-hidden premium-border shadow-3xl">
              <div className="p-10 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div>
                  <h3 className="heading-racing text-4xl text-white italic uppercase leading-none">
                    {showItemSearch === 'SERVICE' ? 'AÑADIR LABOR' : 'AÑADIR REPUESTO'}
                  </h3>
                  <p className="text-[10px] font-black text-amber-500 tracking-widest mt-1 uppercase">Busqueda en Red Central</p>
                </div>
                <button onClick={() => setShowItemSearch(null)} className="p-3 text-zinc-600 hover:text-white transition-colors"><X size={32} /></button>
              </div>

              <div className="p-10 space-y-6">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-amber-500" size={20} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Escribe para escanear catálogo..."
                    className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 pl-14 pr-4 text-white font-bold outline-none focus:border-amber-500/50 transition-all appearance-none"
                    value={searchCatalogTerm}
                    onChange={(e) => setSearchCatalogTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                  {catalogItems.map((item) => (
                    <button
                      key={item.id}
                      disabled={submitting}
                      onClick={() => handleAddItem(item)}
                      className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/5 hover:border-amber-500/40 hover:bg-white/10 rounded-[1.5rem] transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${showItemSearch === 'SERVICE' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {showItemSearch === 'SERVICE' ? <Wrench size={20} /> : <Package size={20} />}
                        </div>
                        <div className="text-left">
                          <p className="text-white font-black text-sm group-hover:text-amber-500 transition-colors uppercase italic">{item.name}</p>
                          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{item.sku || 'CAT-REF'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="heading-racing text-2xl text-white italic">${Number(item.price || item.unit_price).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creation Modal (Glass Case) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => !submitting && setShowCreateModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card w-full max-w-2xl rounded-[3.5rem] border border-white/10 relative z-10 overflow-hidden premium-border shadow-3xl">
              <div className="p-12 border-b border-white/5 bg-white/5">
                <h3 className="heading-racing text-5xl text-white italic uppercase leading-none">APERTURA BOX</h3>
                <p className="text-[10px] font-black text-amber-500 tracking-widest mt-1 uppercase italic">Protocolo de Ingreso a Taller</p>
              </div>
              <form onSubmit={handleCreateOrder} className="p-12 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Piloto (Cliente)</label>
                    <select required value={selectedCustomer?.id || ''} onChange={e => {
                      const c = customersList.find(c => c.id === e.target.value);
                      setSelectedCustomer(c || null);
                      setSelectedVehicle(null);
                    }} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500/50 appearance-none">
                      <option value="">Buscar Piloto...</option>
                      {customersList.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Máquina (Vehículo)</label>
                    <select required disabled={!selectedCustomer} value={selectedVehicle?.id || ''} onChange={e => {
                      const v = (selectedCustomer as any)?.vehicles?.find((v: any) => v.id === e.target.value);
                      setSelectedVehicle(v || null);
                    }} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none disabled:opacity-20 appearance-none">
                      <option value="">Elegir Máquina...</option>
                      {(selectedCustomer as any)?.vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.plate} - {v.brand}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Lectura Odómetro (KM)</label>
                    <div className="relative">
                       <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={20} />
                       <input required type="number" value={mileage} onChange={e => setMileage(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white font-bold outline-none focus:border-amber-500/50" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Diagnóstico Inicial</label>
                    <div className="relative">
                       <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={20} />
                       <input required value={faultDescription} onChange={e => setFaultDescription(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white font-bold outline-none focus:border-amber-500/50" placeholder="Falla reportada..." />
                    </div>
                  </div>
                </div>

                <button disabled={submitting || !selectedVehicle} type="submit" className="w-full py-8 bg-amber-500 hover:bg-amber-400 text-black rounded-[2.5rem] font-black heading-racing text-5xl shadow-2xl transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-6">
                  {submitting ? <Loader2 className="animate-spin" size={40} /> : <>INGRESAR A BOXES <ChevronRight size={40} /></>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkOrders;
