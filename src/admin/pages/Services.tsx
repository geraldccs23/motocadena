import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  X,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Zap,
  Activity,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Service } from '../types';

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State basado en el esquema de la DB (Default 60 min)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    estimated_duration_min: 60,
    is_active: true
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      // API: let { data: services, error } = await supabase.from('services').select('*')
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      console.error("Error fetching services:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: ws } = await supabase.from('workshops').select('id').limit(1).single();

      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        estimated_duration_min: formData.estimated_duration_min,
        is_active: formData.is_active,
        workshop_id: ws?.id
      };

      if (editingService) {
        // API: .update({...}).eq('id', '...')
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingService.id);
        if (error) throw error;
      } else {
        // API: .insert([{...}])
        const { error } = await supabase
          .from('services')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (err: any) {
      alert(`ERROR EN PISTA: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Deseas eliminar este servicio del catálogo central?")) return;
    try {
      // API: .delete().eq('id', '...')
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchServices();
    } catch (err: any) {
      alert(`FALLO AL ELIMINAR: ${err.message}`);
    }
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      estimated_duration_min: service.estimated_duration_min,
      is_active: service.is_active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      estimated_duration_min: 60,
      is_active: true
    });
  };

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: services.length,
    active: services.filter(s => s.is_active).length,
    avgPrice: services.length > 0 ? services.reduce((acc, s) => acc + Number(s.price), 0) / services.length : 0
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="heading-racing text-5xl text-zinc-100 text-glow-amber italic tracking-tighter">Servicios de Pista</h1>
          <p className="text-zinc-500 text-sm italic">"Mano de obra y mantenimiento especializado MOTOCADENA."</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-amber-500 text-black px-8 py-4 rounded-2xl font-bold heading-racing text-2xl hover:bg-amber-400 shadow-[0_4px_30px_rgba(245,158,11,0.3)] transition-all group"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          Nuevo Servicio
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Layers size={64} className="text-amber-500" /></div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Catálogo Total</span>
          <p className="heading-racing text-5xl text-zinc-100">{stats.total}</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Zap size={64} className="text-emerald-500" /></div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Activos</span>
          <p className="heading-racing text-5xl text-emerald-500 text-glow-amber">{stats.active}</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><DollarSign size={64} className="text-blue-500" /></div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Costo Promedio</span>
          <p className="heading-racing text-5xl text-blue-500">${stats.avgPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={24} />
        <input
          type="text"
          placeholder="Buscar servicios por nombre o descripción..."
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl py-5 pl-16 pr-6 text-zinc-100 focus:border-amber-500/50 outline-none backdrop-blur-md transition-all text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Services Table */}
      <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-8 py-6 heading-racing text-zinc-500 text-sm uppercase">Descripción del Trabajo</th>
                <th className="px-8 py-6 heading-racing text-zinc-500 text-sm uppercase text-center">Duración (Min)</th>
                <th className="px-8 py-6 heading-racing text-zinc-500 text-sm uppercase text-right">Precio USD</th>
                <th className="px-8 py-6 heading-racing text-zinc-500 text-sm uppercase text-center">Estatus</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-amber-500 mb-4" />
                    <p className="heading-racing text-xl text-zinc-500">Accediendo a la Base de Datos...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <AlertCircle size={48} className="mx-auto text-zinc-800 mb-4" />
                    <p className="text-zinc-600 italic">No hay servicios que coincidan con la búsqueda.</p>
                  </td>
                </tr>
              ) : filtered.map((service) => (
                <tr key={service.id} className="hover:bg-amber-500/[0.02] transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-700 group-hover:text-amber-500 transition-colors">
                        <Layers size={28} />
                      </div>
                      <div>
                        <div className="text-zinc-100 font-bold text-xl leading-tight">{service.name}</div>
                        <div className="text-zinc-500 text-xs mt-1 line-clamp-1 italic max-w-xs">{service.description || 'Sin notas técnicas'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400">
                      <Clock size={16} className="text-amber-500" />
                      <span className="heading-racing text-2xl leading-none">{service.estimated_duration_min}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="heading-racing text-3xl text-amber-500 font-bold text-glow-amber italic">
                      ${Number(service.price).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${service.is_active
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-600 border border-zinc-700'
                      }`}>
                      {service.is_active ? 'OPERATIVO' : 'EN ESPERA'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEditModal(service)}
                        className="p-3 bg-zinc-900 rounded-xl text-zinc-500 hover:text-blue-500 border border-zinc-800 transition-all"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="p-3 bg-zinc-900 rounded-xl text-zinc-500 hover:text-red-500 border border-zinc-800 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: FORMULARIO DE SERVICIO */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !submitting && setShowModal(false)} />
          <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] border border-white/5 relative z-10 animate-in zoom-in duration-300 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-zinc-900 to-black">
              <div>
                <h3 className="heading-racing text-4xl text-zinc-100 italic">{editingService ? 'Ajustar' : 'Nuevo'} Parámetro de Servicio</h3>
                <p className="text-[10px] uppercase font-black text-amber-500 tracking-[0.3em]">Gestión de Mano de Obra MOTOCADENA</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Nombre del Servicio</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:border-amber-500/50 outline-none transition-all text-xl font-bold"
                  placeholder="Ej. Sincronización de Motor"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Detalles Técnicos</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:border-amber-500/50 outline-none transition-all resize-none h-24 text-sm"
                  placeholder="Explica qué incluye este trabajo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Tarifa Sugerida (USD)</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-5 text-zinc-100 text-3xl heading-racing focus:border-amber-500/50 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Tiempo en Boxes (Minutos)</label>
                  <div className="relative group">
                    <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                    <input
                      required
                      type="number"
                      value={formData.estimated_duration_min}
                      onChange={e => setFormData({ ...formData, estimated_duration_min: parseInt(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-5 text-zinc-100 text-3xl heading-racing focus:border-amber-500/50 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                <div className={`w-6 h-6 rounded flex items-center justify-center border ${formData.is_active ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700'}`}>
                  {formData.is_active && <CheckCircle2 size={16} />}
                </div>
                <span className="text-xs font-black text-zinc-300 uppercase tracking-widest">Servicio Disponible Inmediatamente</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-6 bg-amber-500 text-black rounded-2xl font-bold heading-racing text-3xl hover:bg-amber-400 shadow-[0_15px_40px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
              >
                {submitting ? <Loader2 size={32} className="animate-spin" /> : <>{editingService ? 'GUARDAR CAMBIOS' : 'REGISTRAR SERVICIO'} <ChevronRight size={32} /></>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;