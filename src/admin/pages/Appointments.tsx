import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Bike,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Loader2,
  CheckCircle2,
  Wrench,
  AlertCircle,
  CalendarDays,
  Activity,
  Trophy,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Appointment, Customer, Vehicle, Service, UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [mechanics, setMechanics] = useState<UserProfile[]>([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    service_id: '',
    mechanic_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    duration_min: 60,
    status: 'CONFIRMED'
  });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const startOfDay = `${selectedDate}T00:00:00Z`;
      const endOfDay = `${selectedDate}T23:59:59Z`;

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(*),
          vehicle:vehicles(*),
          service:services(*),
          mechanic:user_profiles(*)
        `)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err: any) {
      console.error("Error fetching agenda:", err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAppointments();
    fetchSupportData();
  }, [fetchAppointments]);

  const fetchSupportData = async () => {
    try {
      const { data: cust } = await supabase.from('customers').select('*, vehicles(*)').order('first_name');
      const { data: serv } = await supabase.from('services').select('*').eq('is_active', true).order('name');
      const { data: mech } = await supabase.from('user_profiles').select('*').in('role', ['MECANICO', 'AYUDANTE_MECANICO']).eq('is_active', true);

      setCustomers(cust || []);
      setServices(serv || []);
      setMechanics(mech || []);
    } catch (err) {
      console.error("Error support data:", err);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: ws } = await supabase.from('workshops').select('id').limit(1).single();

      const payload = {
        workshop_id: ws?.id,
        customer_id: formData.customer_id,
        vehicle_id: formData.vehicle_id,
        service_id: formData.service_id,
        mechanic_id: formData.mechanic_id || null,
        scheduled_at: `${formData.date}T${formData.time}:00Z`,
        duration_min: formData.duration_min,
        status: formData.status
      };

      const { error } = await supabase.from('appointments').insert([payload]);
      if (error) throw error;

      setShowModal(false);
      resetForm();
      fetchAppointments();
    } catch (err: any) {
      alert(`ERROR AGENDA: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      vehicle_id: '',
      service_id: '',
      mechanic_id: '',
      date: new Date().toISOString().split('T')[0],
      time: '08:00',
      duration_min: 60,
      status: 'CONFIRMED'
    });
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-0.5 w-20 bg-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 italic">Paddock Schedule</span>
          </div>
          <h1 className="heading-racing text-8xl text-white italic tracking-tighter leading-none">
            AGENDA <span className="text-zinc-600">BOXES</span>
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="glass-card px-10 py-5 bg-amber-500 hover:bg-amber-400 text-black border border-amber-600/50 shadow-xl shadow-amber-500/20 transition-all active:scale-95"
        >
          <div className="flex items-center gap-4">
            <Plus size={32} />
            <span className="heading-racing text-4xl uppercase italic leading-none">Agendar</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <div className="glass-card p-10 premium-border">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="heading-racing text-3xl text-white italic uppercase tracking-tight">Timeline</h2>
                 <CalendarDays size={24} className="text-amber-500" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-5 text-white heading-racing text-3xl focus:border-amber-500 outline-none transition-all [color-scheme:dark] shadow-inner"
              />
           </div>

           <div className="glass-card p-10 premium-border space-y-8">
              <div className="flex items-center gap-3">
                 <Activity className="text-emerald-500" size={24} />
                 <h3 className="heading-racing text-2xl text-white italic uppercase tracking-widest">Telemetry</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Citas Hoy</span>
                    <span className="heading-racing text-5xl text-white italic">{appointments.length}</span>
                 </div>
                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Disponibilidad</span>
                    <span className="heading-racing text-5xl text-emerald-500 italic opacity-50">92%</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Timeline */}
        <div className="lg:col-span-3 space-y-8">
           <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-40 text-center">
                  <Loader2 className="w-20 h-20 animate-spin mx-auto text-amber-500/20 mb-6" />
                  <p className="heading-racing text-3xl text-zinc-700 uppercase italic tracking-widest animate-pulse">Sincronizando Cronómetros...</p>
                </motion.div>
              ) : (
                <motion.div key="list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                   {appointments.length === 0 ? (
                      <div className="py-40 text-center glass-card rounded-[4rem] border-2 border-dashed border-zinc-900 bg-zinc-950/20">
                         <Trophy size={80} className="mx-auto text-zinc-900 mb-8 opacity-10" />
                         <p className="heading-racing text-4xl text-zinc-800 uppercase italic tracking-widest">Pista totalmente despejada</p>
                         <p className="text-zinc-600 text-sm mt-2 italic font-medium tracking-tight">"Ready for the green flag"</p>
                      </div>
                   ) : (
                      appointments.map((appt, idx) => {
                        const timeStr = new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={appt.id}
                            className="glass-card p-0 rounded-[3rem] border border-white/5 flex flex-col md:flex-row relative group hover:border-amber-500/20 transition-all shadow-2xl overflow-hidden"
                          >
                             <div className="flex flex-col items-center justify-center md:w-44 shrink-0 border-r border-white/5 bg-black/60 p-10">
                                <span className="heading-racing text-6xl text-amber-500 italic leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">{timeStr}</span>
                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-3">{appt.duration_min} MIN</span>
                             </div>

                             <div className="flex-1 p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div className="flex gap-8">
                                   <div className="w-20 h-20 rounded-[2rem] bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-800 group-hover:text-amber-500 transition-colors shadow-inner shrink-0 scale-90 group-hover:scale-100 duration-500">
                                      <User size={40} />
                                   </div>
                                   <div>
                                      <p className="text-white font-black text-3xl italic uppercase tracking-tighter leading-none mb-2 group-hover:text-amber-500 transition-colors">{appt.customer?.first_name} {appt.customer?.last_name}</p>
                                      <div className="flex items-center gap-3 text-[11px] text-amber-500/60 font-black tracking-widest uppercase italic">
                                         <Bike size={14} className="text-amber-500" /> {appt.vehicle?.plate} <span className="opacity-30">•</span> {appt.vehicle?.brand} {appt.vehicle?.model}
                                      </div>
                                   </div>
                                </div>

                                <div className="flex items-center justify-between lg:justify-end gap-10">
                                   <div className="hidden xl:block text-right">
                                      <div className="flex items-center gap-2 justify-end mb-1">
                                         <Wrench size={14} className="text-zinc-600" />
                                         <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest leading-none">Job Order</span>
                                      </div>
                                      <p className="text-zinc-300 font-bold uppercase tracking-tight leading-none italic">{appt.service?.name}</p>
                                   </div>

                                   <div className="flex flex-col items-end gap-3">
                                      <div className={`px-5 py-2 rounded-full text-[9px] font-black tracking-[0.2em] uppercase border transition-all ${
                                        appt.status === 'CONFIRMED' 
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                      }`}>
                                        {appt.status}
                                      </div>
                                      <div className="flex items-center gap-2">
                                         <Users size={12} className="text-zinc-600" />
                                         <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{appt.mechanic?.full_name?.split(' ')[0] || 'TBD'}</span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </motion.div>
                        );
                      })
                   )}
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </div>

      {/* Register Modal */}
      <AnimatePresence>
         {showModal && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => !submitting && setShowModal(false)} />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card w-full max-w-2xl rounded-[3.5rem] border border-white/10 relative z-10 overflow-hidden premium-border shadow-3xl">
                 <div className="p-12 border-b border-white/5 bg-white/5">
                    <h3 className="heading-racing text-5xl text-white italic uppercase leading-none">RESERVA DE BOX</h3>
                    <p className="text-[10px] font-black text-amber-500 tracking-widest mt-1 uppercase italic">Gestión de Tiempos de Pista</p>
                 </div>
                 
                 <form onSubmit={handleCreateAppointment} className="p-12 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Piloto (Cliente)</label>
                          <select required value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, vehicle_id: '' })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500/50 appearance-none">
                             <option value="">Buscar Piloto...</option>
                             {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Máquina (Vehículo)</label>
                          <select required disabled={!formData.customer_id} value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none disabled:opacity-20 appearance-none">
                             <option value="">{formData.customer_id ? 'Elegir Vehículo...' : 'Primero elija piloto'}</option>
                             {selectedCustomer?.vehicles?.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.brand}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Servicio Master</label>
                       <select required value={formData.service_id} onChange={(e) => {
                          const serv = services.find(s => s.id === e.target.value);
                          setFormData({ ...formData, service_id: e.target.value, duration_min: serv?.estimated_duration_min || 60 });
                       }} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none italic">
                          <option value="">Trabajo a realizar...</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>)}
                       </select>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Fecha</label>
                          <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none italic [color-scheme:dark]" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Hora</label>
                          <input required type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-amber-500 font-bold heading-racing text-2xl outline-none italic [color-scheme:dark]" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">DUR. (MIN)</label>
                          <input required type="number" value={formData.duration_min} onChange={e => setFormData({ ...formData, duration_min: parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none" />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Staff Técnico (Opcional)</label>
                       <select value={formData.mechanic_id} onChange={(e) => setFormData({ ...formData, mechanic_id: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-zinc-400 font-bold outline-none text-xs">
                          <option value="">Por asignar en Pista</option>
                          {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                       </select>
                    </div>

                    <button disabled={submitting} type="submit" className="w-full py-8 bg-amber-500 hover:bg-amber-400 text-black rounded-[2.5rem] font-black heading-racing text-5xl shadow-2xl transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-6 mt-6">
                       {submitting ? <Loader2 className="animate-spin" size={40} /> : <>CONFIRMAR CITA <ChevronRight size={40} /></>}
                    </button>
                 </form>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default Appointments;