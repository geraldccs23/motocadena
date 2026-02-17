import React, { useState, useEffect } from 'react';
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
  CalendarDays
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Appointment, Customer, Vehicle, Service, UserProfile } from '../types';

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

  useEffect(() => {
    fetchAppointments();
    fetchSupportData();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // API: Filtrar por fecha exacta
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
  };

  const fetchSupportData = async () => {
    const { data: cust } = await supabase.from('customers').select('*, vehicles(*)').order('first_name');
    const { data: serv } = await supabase.from('services').select('*').eq('is_active', true).order('name');
    const { data: mech } = await supabase.from('user_profiles').select('*').in('role', ['MECANICO', 'AYUDANTE_MECANICO']).eq('is_active', true);

    setCustomers(cust || []);
    setServices(serv || []);
    setMechanics(mech || []);
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
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="heading-racing text-5xl text-zinc-100 text-glow-amber italic tracking-tighter">Agenda de Boxes</h1>
          <p className="text-zinc-500 text-sm italic">"Control de flujo y tiempos de pista MOTOCADENA."</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-500 text-black px-8 py-4 rounded-2xl font-bold heading-racing text-2xl hover:bg-amber-400 shadow-[0_4px_30px_rgba(245,158,11,0.3)] transition-all group"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          Agendar Cita
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-[2rem] border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-racing text-xl text-zinc-400 uppercase tracking-widest">Selector de Pista</h2>
              <CalendarDays size={20} className="text-amber-500" />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 heading-racing text-2xl focus:border-amber-500 outline-none transition-all [color-scheme:dark]"
            />
          </div>

          <div className="glass-panel p-6 rounded-[2rem] border border-white/5 space-y-4">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Resumen del Día</h3>
            <div className="flex justify-between items-center bg-zinc-950/50 p-4 rounded-2xl border border-zinc-900">
              <span className="text-zinc-400 text-xs font-bold">Total Citas</span>
              <span className="heading-racing text-3xl text-zinc-100">{appointments.length}</span>
            </div>
          </div>
        </div>

        {/* Appointments Timeline */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 text-black rounded-xl flex items-center justify-center shadow-lg">
                <Clock size={20} />
              </div>
              <h2 className="heading-racing text-3xl text-zinc-100 italic tracking-wider">
                {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
            </div>
            <button className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-amber-500 transition-colors">
              <Filter size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-32 text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-amber-500 mb-6" />
                <p className="heading-racing text-2xl text-zinc-600 animate-pulse uppercase tracking-[0.2em]">Sincronizando Cronómetros...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-32 text-center glass-panel rounded-[3rem] border-dashed border-zinc-800">
                <CalendarIcon size={64} className="mx-auto text-zinc-900 mb-6 opacity-20" />
                <p className="text-zinc-600 heading-racing text-3xl uppercase italic tracking-widest opacity-50">Pista despejada para esta fecha</p>
              </div>
            ) : appointments.map((appt) => {
              const timeStr = new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={appt.id} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row gap-8 relative group hover:border-amber-500/30 transition-all shadow-xl overflow-hidden">
                  <div className="flex flex-col items-center justify-center md:w-32 shrink-0 border-r border-zinc-800/50 pr-8 bg-zinc-900/30 -ml-6 -my-6">
                    <span className="heading-racing text-4xl text-amber-500 text-glow-amber italic leading-none">{timeStr}</span>
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-2">{appt.duration_min} MIN</span>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
                    <div className="flex gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-700 group-hover:text-amber-500 transition-colors shadow-inner">
                        <User size={28} />
                      </div>
                      <div>
                        <p className="text-zinc-100 font-black text-xl leading-tight mb-1">{appt.customer?.first_name} {appt.customer?.last_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-amber-500 font-black tracking-widest uppercase italic">
                          <Bike size={12} /> {appt.vehicle?.plate} • {appt.vehicle?.brand}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Trabajo en Box</p>
                      <div className="flex items-center gap-2 text-zinc-300 font-bold">
                        <Wrench size={14} className="text-amber-500" />
                        {appt.service?.name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6">
                      <div className="text-right hidden lg:block">
                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">Mecánico</p>
                        <p className="text-xs text-zinc-400 font-bold">{appt.mechanic?.full_name || 'Sin asignar'}</p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest border ${appt.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                        }`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL: REGISTRO DE CITA */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !submitting && setShowModal(false)} />
          <div className="glass-panel w-full max-w-2xl rounded-[3rem] border border-white/10 relative z-10 animate-in zoom-in duration-300 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-inner">
                  <CalendarIcon size={36} />
                </div>
                <div>
                  <h3 className="heading-racing text-5xl text-zinc-100 italic">Reserva de Box</h3>
                  <p className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.4em]">Gestión de Agenda MOTOCADENA</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                <X size={36} />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Seleccionar Piloto</label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, vehicle_id: '' })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:border-amber-500/50 outline-none font-bold"
                  >
                    <option value="">Buscar Piloto...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Máquina del Piloto</label>
                  <select
                    required
                    disabled={!formData.customer_id}
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:border-amber-500/50 outline-none font-bold disabled:opacity-30"
                  >
                    <option value="">{formData.customer_id ? 'Elegir Vehículo...' : 'Primero elige un piloto'}</option>
                    {selectedCustomer?.vehicles?.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Servicio Solicitado</label>
                <select
                  required
                  value={formData.service_id}
                  onChange={(e) => {
                    const serv = services.find(s => s.id === e.target.value);
                    setFormData({ ...formData, service_id: e.target.value, duration_min: serv?.estimated_duration_min || 60 });
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:border-amber-500/50 outline-none font-bold"
                >
                  <option value="">Elegir Trabajo de Pista...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Fecha</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 outline-none [color-scheme:dark]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Hora de Ingreso</label>
                  <input required type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 outline-none [color-scheme:dark]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Duración (Min)</label>
                  <input required type="number" value={formData.duration_min} onChange={e => setFormData({ ...formData, duration_min: parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 outline-none heading-racing text-2xl" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Asignar Mecánico (Opcional)</label>
                <select
                  value={formData.mechanic_id}
                  onChange={(e) => setFormData({ ...formData, mechanic_id: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:border-amber-500/50 outline-none font-bold"
                >
                  <option value="">Sin asignar / Por definir</option>
                  {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !formData.customer_id || !formData.vehicle_id || !formData.service_id}
                className="w-full py-7 bg-amber-500 text-black rounded-3xl font-bold heading-racing text-4xl hover:bg-amber-400 shadow-[0_20px_50px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30 mt-6"
              >
                {submitting ? <Loader2 size={36} className="animate-spin" /> : <>CONFIRMAR CITA DE PISTA <ChevronRight size={36} /></>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;