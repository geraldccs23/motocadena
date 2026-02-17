
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Filter, ChevronRight, Bike, User, Loader2, X, Calendar, Gauge,
  DollarSign, ClipboardList, History, Wrench, Package, CheckCircle2, AlertTriangle,
  Activity, ArrowLeft, Save, Hammer, Settings, Trash2, Lock, ShieldCheck,
  ChevronDown, Layers, Info, RefreshCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WorkOrder, OrderStatus, Customer, Vehicle, Service, Product, UserProfile } from '../types';
import { useAuth } from '../hooks/useAuth';

const INSPECTION_ITEMS = [
  { id: 'lights', label: 'Sistema Eléctrico / Luces' },
  { id: 'brakes', label: 'Frenos (Pastillas/Discos)' },
  { id: 'tires', label: 'Neumáticos (Presión/Vida)' },
  { id: 'fluids', label: 'Fluidos (Aceite/Refrigerante)' },
  { id: 'suspension', label: 'Suspensión (Retenes)' },
  { id: 'transmission', label: 'Kit de Arrastre / Cadena' }
];

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const styles: Record<OrderStatus, string> = {
    DRAFT: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    WAITING_PARTS: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15_rgba(239,68,68,0.2)]',
    READY: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    DELIVERED: 'bg-zinc-900 text-zinc-500 border-zinc-800',
    CANCELED: 'bg-zinc-950 text-zinc-700 border-zinc-900'
  };

  return (
    <span className={`px-2 md:px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const WorkOrders: React.FC = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError(err.message);
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
      alert(`Fallo de telemetría: ${err.message}`);
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
    const currentData = currentOrder[section] || {};
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
      alert(`Error al añadir item: ${err.message}`);
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
      const { data: ws } = await supabase.from('workshops').select('id').limit(1).single();
      const payload = {
        workshop_id: ws?.id,
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

  // --- RENDER LOGIC ---
  const renderDetailView = () => {
    if (!currentOrder) return null;
    const isBilled = currentOrder.billing_status !== 'NOT_BILLED';

    return (
      <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-10 duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button
            onClick={() => { setSelectedOrderId(null); fetchOrders(); }}
            className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 transition-all font-black heading-racing text-xl md:text-2xl uppercase italic tracking-widest group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Volver
          </button>
          <div className="flex gap-2 items-center">
            {isBilled && (
              <span className={`px-3 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] border ${currentOrder.billing_status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                {currentOrder.billing_status === 'PAID' ? 'COBRADA' : 'PENDIENTE'}
              </span>
            )}
            <StatusBadge status={currentOrder.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="glass-panel p-5 md:p-10 rounded-2xl md:rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl">
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 items-center sm:items-start text-center sm:text-left relative z-10">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-zinc-950 border border-zinc-800 rounded-2xl md:rounded-[2rem] flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                  <Bike size={40} className="md:w-12 md:h-12 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                </div>
                <div className="space-y-1 md:space-y-4 w-full">
                  <div>
                    <h2 className="heading-racing text-3xl md:text-7xl text-zinc-100 italic leading-none tracking-tighter uppercase">Orden #{currentOrder.id.slice(0, 8).toUpperCase()}</h2>
                    <p className="text-amber-500 font-bold heading-racing text-xl md:text-4xl tracking-widest mt-1 italic">
                      {currentOrder.vehicle?.plate} • {currentOrder.vehicle?.brand} {currentOrder.vehicle?.model}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    <span className="bg-zinc-900/50 px-3 py-2 rounded-lg border border-zinc-800 flex items-center gap-2 backdrop-blur-sm"><User size={14} /> {currentOrder.customer?.first_name}</span>
                    <span className="bg-zinc-900/50 px-3 py-2 rounded-lg border border-zinc-800 flex items-center gap-2 backdrop-blur-sm"><Gauge size={14} /> {currentOrder.mileage} KM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 md:p-10 rounded-2xl md:rounded-[3rem] border border-white/5 space-y-6 md:space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="heading-racing text-3xl md:text-5xl text-zinc-100 italic uppercase">Liquidación</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setShowItemSearch('SERVICE')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-[10px] font-black text-amber-500 uppercase hover:bg-amber-500/10 transition-colors"><Layers size={16} /> +Servicio</button>
                  <button onClick={() => setShowItemSearch('PART')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-[10px] font-black text-blue-500 uppercase hover:bg-blue-500/10 transition-colors"><Package size={16} /> +Repuesto</button>
                </div>
              </div>

              <div className="space-y-3">
                {currentOrder.services?.length === 0 && currentOrder.parts?.length === 0 && (
                  <div className="py-12 md:py-20 text-center border border-dashed border-zinc-900 rounded-2xl opacity-20">
                    <p className="heading-racing text-xl md:text-3xl uppercase italic tracking-widest">Sin items</p>
                  </div>
                )}

                {currentOrder.services?.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-4 md:p-6 bg-zinc-950/50 rounded-xl md:rounded-2xl border border-zinc-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center"><Wrench size={16} /></div>
                      <div>
                        <p className="text-zinc-100 font-bold text-xs md:text-sm">{s.service?.name}</p>
                        <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Mano de Obra</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8">
                      <span className="heading-racing text-lg md:text-2xl text-amber-500">${Number(s.price).toFixed(2)}</span>
                      <button onClick={() => removeItem('service', s.id)} className="text-zinc-800 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}

                {currentOrder.parts?.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-4 md:p-6 bg-zinc-950/50 rounded-xl md:rounded-2xl border border-zinc-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center"><Package size={16} /></div>
                      <div>
                        <p className="text-zinc-100 font-bold text-xs md:text-sm">{p.product?.name}</p>
                        <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Repuesto</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8">
                      <span className="heading-racing text-lg md:text-2xl text-blue-500">${Number(p.price).toFixed(2)}</span>
                      <button onClick={() => removeItem('part', p.id)} className="text-zinc-800 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-zinc-900/50 space-y-3">
                <div className="flex justify-between text-zinc-600 text-[10px] font-black uppercase tracking-widest px-2">
                  <span>Subtotal General</span>
                  <span className="text-zinc-100">${Number(currentOrder.total_amount || 0).toFixed(2)}</span>
                </div>

                {/* CÁLCULO DE COMISIÓN MECÁNICO */}
                {currentOrder.mechanic && (
                  <div className="flex justify-between items-center py-2 px-3 bg-amber-500/5 rounded-lg border border-amber-500/10 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest">Comisión Mecánico ({currentOrder.mechanic.commission_rate}%)</span>
                    </div>
                    <span className="heading-racing text-xl text-amber-500 italic">
                      +${(Number(currentOrder.total_labor || 0) * (currentOrder.mechanic.commission_rate / 100)).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                  <div className="relative flex justify-between items-center bg-zinc-950/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
                    <span className="heading-racing text-3xl md:text-4xl text-zinc-100 italic">TOTAL</span>
                    <span className="heading-racing text-5xl md:text-7xl text-amber-500 text-glow-amber italic leading-none tracking-tighter">${Number(currentOrder.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 md:space-y-8">
            <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-white/5">
              <h3 className="heading-racing text-2xl md:text-3xl text-zinc-100 mb-4 md:mb-6 italic uppercase">Telemetría</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">Mecánico</label>
                  <select
                    value={currentOrder.mechanic_id || ''}
                    onChange={(e) => updateOrderField(currentOrder.id, 'mechanic_id', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-sm font-bold outline-none"
                  >
                    <option value="">Definir...</option>
                    {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Estatus de Reparación</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['DRAFT', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'READY'].map(s => (
                      <button
                        key={s}
                        onClick={() => updateOrderField(currentOrder.id, 'status', s)}
                        className={`py-4 px-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border transition-all shadow-lg ${currentOrder.status === s ? 'bg-amber-500 border-amber-500 text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-600 active:bg-zinc-800'}`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-white/5 space-y-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-amber-500" />
                <h3 className="heading-racing text-2xl md:text-3xl text-zinc-100 italic uppercase">Inspección</h3>
              </div>
              <div className="space-y-2">
                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest border-b border-zinc-900 pb-1 italic">Entrada</p>
                <div className="max-h-64 overflow-y-auto scrollbar-hide space-y-2 pr-1">
                  {INSPECTION_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleToggleInspection('initial_inspection', item.id)}
                      className={`w-full flex items-center justify-between p-4 md:p-5 rounded-xl border transition-all shadow-md ${currentOrder.initial_inspection?.[item.id] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-zinc-950 border-zinc-900 text-zinc-600 active:bg-zinc-900'}`}
                    >
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest truncate">{item.label}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${currentOrder.initial_inspection?.[item.id] ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-800'}`}>
                        {currentOrder.initial_inspection?.[item.id] && <CheckCircle2 size={12} />}
                      </div>
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
      <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="heading-racing text-5xl md:text-8xl text-zinc-100 text-glow-amber italic tracking-tighter uppercase leading-none">Race Control</h1>
            <p className="text-zinc-500 text-xs md:text-sm italic mt-1">"Monitoreo centralizado de boxes."</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchOrders}
              className="p-3 md:p-5 bg-zinc-900 text-zinc-600 border border-zinc-800 rounded-xl md:rounded-2xl transition-all"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-500 text-black px-6 md:px-12 py-3 md:py-5 rounded-xl md:rounded-2xl font-bold heading-racing text-xl md:text-4xl shadow-xl transition-all"
            >
              <Plus size={24} /> Apertura
            </button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-zinc-600" size={24} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl md:rounded-[3rem] py-4 md:py-8 pl-12 md:pl-24 pr-4 md:pr-8 text-zinc-100 focus:border-amber-500/50 outline-none transition-all text-sm md:text-2xl font-black italic shadow-2xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="glass-panel rounded-2xl md:rounded-[4rem] overflow-hidden border border-zinc-800 shadow-2xl min-h-[400px] flex flex-col relative">
          <div className="overflow-x-auto flex-1 scrollbar-hide">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-zinc-900/90 border-b border-zinc-800 sticky top-0 z-10">
                <tr>
                  <th className="px-6 md:px-12 py-6 md:py-9 heading-racing text-zinc-600 text-[10px] md:text-xs tracking-widest uppercase italic">Orden</th>
                  <th className="px-6 md:px-12 py-6 md:py-9 heading-racing text-zinc-600 text-[10px] md:text-xs tracking-widest uppercase italic">Piloto / Máquina</th>
                  <th className="px-6 md:px-12 py-6 md:py-9 heading-racing text-zinc-600 text-[10px] md:text-xs tracking-widest uppercase italic text-center">Estatus</th>
                  <th className="px-6 md:px-12 py-6 md:py-9 heading-racing text-zinc-600 text-[10px] md:text-xs tracking-widest uppercase italic text-right">Inversión</th>
                  <th className="px-6 md:px-12 py-6 md:py-9"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto text-amber-500 mb-4 opacity-40" />
                      <p className="heading-racing text-xl text-zinc-700 tracking-widest uppercase animate-pulse">Escaneando...</p>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <p className="heading-racing text-2xl text-zinc-800 uppercase italic tracking-widest opacity-40">Pista Despejada.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-amber-500/[0.04] transition-all cursor-pointer group" onClick={() => fetchOrderDetails(order.id)}>
                      <td className="px-6 md:px-12 py-6 md:py-10">
                        <div className="heading-racing text-xl md:text-3xl text-zinc-100 italic uppercase">#{order.id.slice(0, 8)}</div>
                        <div className="text-zinc-600 text-[8px] font-black mt-1 uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 md:px-12 py-6 md:py-10">
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 items-center justify-center text-zinc-800">
                            <Bike size={24} />
                          </div>
                          <div>
                            <div className="text-zinc-100 font-black text-sm md:text-3xl leading-none italic uppercase mb-1">{order.vehicle?.plate || 'S/P'}</div>
                            <div className="text-zinc-500 text-[8px] md:text-[10px] uppercase font-black tracking-widest">{order.customer?.first_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 md:px-12 py-6 md:py-10 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 md:px-12 py-6 md:py-10 text-right">
                        <div className="heading-racing text-xl md:text-5xl text-zinc-100 italic tracking-tighter leading-none">${Number(order.total_amount).toFixed(2)}</div>
                      </td>
                      <td className="px-6 md:px-12 py-6 md:py-10 text-right">
                        <ChevronRight size={24} className="text-zinc-800 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* MAIN CONTENT REGION */}
      {selectedOrderId && currentOrder ? renderDetailView() : renderListView()}

      {/* MODAL LAYER: ITEM SEARCH */}
      {showItemSearch && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 md:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowItemSearch(null)} />
          <div className="glass-panel w-full max-w-lg rounded-2xl md:rounded-[3rem] border border-white/10 relative z-10 animate-in zoom-in duration-300 overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <div>
                <h3 className="heading-racing text-2xl md:text-4xl text-zinc-100 italic uppercase leading-none">
                  {showItemSearch === 'SERVICE' ? 'Añadir Servicio' : 'Añadir Repuesto'}
                </h3>
                <p className="text-[8px] md:text-[10px] font-black text-amber-500 tracking-widest mt-1 uppercase">
                  Búsqueda en Catálogo
                </p>
              </div>
              <button onClick={() => setShowItemSearch(null)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Escribe para buscar..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-zinc-100 outline-none focus:border-amber-500/50 transition-all font-bold"
                  value={searchCatalogTerm}
                  onChange={(e) => setSearchCatalogTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                {catalogItems.length === 0 ? (
                  <div className="py-12 text-center text-zinc-700 italic text-sm">
                    {searchCatalogTerm ? 'No se encontraron resultados' : 'Ingresa un término para buscar...'}
                  </div>
                ) : (
                  catalogItems.map((item) => (
                    <button
                      key={item.id}
                      disabled={submitting}
                      onClick={() => handleAddItem(item)}
                      className="w-full flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800/50 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${showItemSearch === 'SERVICE' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {showItemSearch === 'SERVICE' ? <Wrench size={18} /> : <Package size={18} />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{item.name}</p>
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{item.sku || 'CAT-001'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="heading-racing text-xl text-zinc-100 italic">${Number(item.price || item.unit_price).toFixed(2)}</p>
                        <ChevronRight size={16} className="text-zinc-800 group-hover:text-amber-500 ml-auto" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LAYER: APERTURA BOX */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !submitting && setShowCreateModal(false)} />
          <div className="glass-panel w-full max-w-2xl rounded-2xl md:rounded-[3rem] border border-white/10 relative z-10 animate-in zoom-in duration-300 overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 border-b border-zinc-800 bg-zinc-900">
              <h3 className="heading-racing text-3xl md:text-5xl text-zinc-100 italic uppercase leading-none">Apertura Box</h3>
              <p className="text-[8px] md:text-[10px] font-black text-amber-500 tracking-widest mt-1">Nueva Orden de Trabajo</p>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 md:p-10 space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase">Piloto</label>
                  <select required value={selectedCustomer?.id || ''} onChange={e => {
                    const c = customersList.find(c => (c as any).id === e.target.value);
                    setSelectedCustomer(c || null);
                    setSelectedVehicle(null);
                  }} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-100 text-sm outline-none">
                    <option value="">Elegir Cliente...</option>
                    {customersList.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase">Máquina</label>
                  <select required disabled={!selectedCustomer} value={selectedVehicle?.id || ''} onChange={e => {
                    const v = (selectedCustomer as any)?.vehicles?.find((v: any) => v.id === e.target.value);
                    setSelectedVehicle(v || null);
                  }} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-100 text-sm outline-none disabled:opacity-30">
                    <option value="">Elegir Vehículo...</option>
                    {(selectedCustomer as any)?.vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.plate} - {v.brand}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">KM</label>
                  <input required type="number" value={mileage} onChange={e => setMileage(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-100 text-sm outline-none" placeholder="0" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Falla</label>
                  <input required value={faultDescription} onChange={e => setFaultDescription(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-100 text-sm outline-none" placeholder="Descripción..." />
                </div>
              </div>
              <button disabled={submitting} type="submit" className="w-full py-4 md:py-6 bg-amber-500 text-black rounded-xl md:rounded-2xl font-bold heading-racing text-2xl md:text-4xl shadow-xl flex items-center justify-center gap-2 transition-all">
                {submitting ? <Loader2 size={24} className="animate-spin" /> : <>ABRIR ORDEN <ChevronRight size={24} /></>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;
