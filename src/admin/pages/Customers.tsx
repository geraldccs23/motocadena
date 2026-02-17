import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Phone, Mail, Bike, ChevronRight, Star, X, Loader2, Save, Fingerprint, AlertTriangle, RefreshCcw, MapPin, Gift, Plus, Trash2, Hash, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Customer, Vehicle } from '../types';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form State Cliente
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    email: '',
    address: '',
    referred_by_customer_id: '',
    is_vip: false
  });

  // Form State Vehículo
  const [vehicleData, setVehicleData] = useState({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    engine_number: '',
    color: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error: supabaseError } = await supabase
        .from('customers')
        .select(`
          *,
          vehicles (*)
        `)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      setCustomers((data as Customer[]) || []);
    } catch (err: any) {
      console.error("Error fetching customers:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: ws } = await supabase.from('workshops').select('id').limit(1).single();
      const payload = {
        ...formData,
        workshop_id: ws?.id,
        referred_by_customer_id: formData.referred_by_customer_id || null
      };

      const { error: insertError } = await supabase
        .from('customers')
        .insert([payload]);

      if (insertError) throw insertError;

      setShowModal(false);
      resetCustomerForm();
      fetchCustomers();
    } catch (err: any) {
      alert(`ERROR EN PITS: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      const payload = {
        ...vehicleData,
        customer_id: selectedCustomer.id,
        plate: vehicleData.plate.toUpperCase().trim()
      };

      const { error } = await supabase
        .from('vehicles')
        .insert([payload]);

      if (error) {
        if (error.code === '23505') throw new Error("La placa ya está registrada en MOTOCADENA.");
        throw error;
      }

      setShowVehicleModal(false);
      resetVehicleForm();
      fetchCustomers();
    } catch (err: any) {
      alert(`ERROR VEHÍCULO: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("¿Eliminar este vehículo del garaje del cliente?")) return;
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) throw error;
      fetchCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetCustomerForm = () => {
    setFormData({ first_name: '', last_name: '', id_number: '', phone: '', email: '', address: '', referred_by_customer_id: '', is_vip: false });
  };

  const resetVehicleForm = () => {
    setVehicleData({ plate: '', brand: '', model: '', year: new Date().getFullYear(), vin: '', engine_number: '', color: '', notes: '' });
  };

  const filteredCustomers = customers.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.vehicles?.some(v => v.plate.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="heading-racing text-5xl text-zinc-100 text-glow-amber italic tracking-tighter">Garaje Central de Clientes</h1>
          <p className="text-zinc-500 text-sm italic">"Control total de pilotos y sus máquinas MOTOCADENA."</p>
        </div>
        <button
          onClick={() => { resetCustomerForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-amber-500 text-black px-8 py-4 rounded-2xl font-bold heading-racing text-2xl hover:bg-amber-400 shadow-[0_4px_30px_rgba(245,158,11,0.3)] transition-all group"
        >
          <UserPlus size={24} className="group-hover:rotate-12 transition-transform" />
          Nuevo Cliente
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={24} />
        <input
          type="text"
          placeholder="Buscar por piloto, teléfono, placa o ID..."
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl py-6 pl-16 pr-6 text-zinc-100 focus:border-amber-500/50 outline-none backdrop-blur-md transition-all text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
          <p className="heading-racing text-2xl tracking-widest animate-pulse uppercase">Escaneando Pista de Clientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full py-32 text-center glass-panel rounded-[3rem] border-dashed border-zinc-800">
              <Users size={64} className="mx-auto text-zinc-900 mb-6" />
              <p className="text-zinc-500 heading-racing text-3xl uppercase tracking-widest italic">No hay corredores en esta sección</p>
            </div>
          ) : filteredCustomers.map((customer) => (
            <div key={customer.id} className="glass-panel p-8 rounded-[3rem] border border-white/5 hover:border-amber-500/20 transition-all group relative overflow-hidden flex flex-col h-full shadow-xl">
              {customer.is_vip && (
                <div className="absolute top-8 right-8 bg-amber-500 text-black p-2 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse">
                  <Star size={16} fill="currentColor" />
                </div>
              )}

              <div className="flex items-start gap-6 mb-8">
                <div className="w-20 h-20 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-amber-500 heading-racing text-4xl shadow-2xl group-hover:scale-105 transition-transform duration-500">
                  {customer.first_name?.[0]}{customer.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-zinc-100 font-black text-2xl leading-tight mb-1">{customer.first_name} {customer.last_name}</h3>
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest bg-zinc-900/50 px-2 py-1 rounded-lg border border-zinc-800 w-fit">
                    <Fingerprint size={12} className="text-amber-500" /> {customer.id_number || 'ID NO REGISTRADO'}
                  </div>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 text-zinc-300 text-sm font-bold bg-zinc-950/50 p-3 rounded-2xl border border-zinc-900/50">
                    <Phone size={16} className="text-amber-500" /> {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-3 text-zinc-400 text-xs bg-zinc-950/50 p-3 rounded-2xl border border-zinc-900/50 overflow-hidden">
                      <Mail size={16} className="text-zinc-600 shrink-0" /> <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4 px-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Garaje de Pista ({customer.vehicles?.length || 0})</p>
                    <button
                      onClick={() => { setSelectedCustomer(customer); resetVehicleForm(); setShowVehicleModal(true); }}
                      className="p-1.5 bg-zinc-900 text-amber-500 rounded-lg border border-zinc-800 hover:bg-amber-500 hover:text-black transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {customer.vehicles && customer.vehicles.length > 0 ? (
                      customer.vehicles.map((v) => (
                        <div key={v.id} className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 flex items-center justify-between group/v hover:border-amber-500/30 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover/v:text-amber-500 transition-colors">
                              <Bike size={20} />
                            </div>
                            <div>
                              <p className="text-xs text-zinc-100 font-bold">{v.brand} {v.model} <span className="text-zinc-600 ml-1">{v.year}</span></p>
                              <p className="text-[10px] text-amber-500 font-black tracking-widest uppercase italic">{v.plate}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="p-2 text-zinc-800 hover:text-red-500 opacity-0 group-hover/v:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-zinc-700 font-bold italic p-6 border-2 border-dashed border-zinc-900 rounded-3xl text-center">
                        Sin máquinas vinculadas
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-900/50 flex justify-between items-center">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-700">Registrado {new Date(customer.created_at!).toLocaleDateString()}</div>
                <button className="heading-racing text-2xl text-amber-500 hover:text-white transition-colors uppercase italic group-hover:translate-x-1 transition-transform">
                  FICHA <ChevronRight size={18} className="inline ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: REGISTRO CLIENTE */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !submitting && setShowModal(false)} />
          <div className="glass-panel w-full max-w-2xl rounded-[3rem] border border-white/10 relative z-10 animate-in zoom-in duration-300 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-zinc-900 to-black">
              <div>
                <h3 className="heading-racing text-5xl text-zinc-100 italic">Alta de Corredor</h3>
                <p className="text-[10px] uppercase font-black text-amber-500 tracking-[0.4em]">Sincronización de Base Central</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                <X size={32} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Nombre</label>
                  <input required type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none text-lg" placeholder="Ayrton" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Apellido</label>
                  <input required type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none text-lg" placeholder="Senna" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">ID Fiscal / Personal</label>
                  <input type="text" value={formData.id_number} onChange={e => setFormData({ ...formData, id_number: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none" placeholder="V-12345678" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Móvil de Contacto</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none" placeholder="0412-0000000" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none" placeholder="corredor@motocadena.com" />
              </div>

              <div className="flex items-center gap-4 p-6 bg-zinc-950/50 rounded-[2rem] border border-zinc-800 cursor-pointer hover:border-amber-500/40 transition-all" onClick={() => setFormData({ ...formData, is_vip: !formData.is_vip })}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${formData.is_vip ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'border-zinc-800'}`}>
                  <Star size={18} fill={formData.is_vip ? "currentColor" : "none"} />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-100 uppercase tracking-widest leading-none mb-1">Estatus VIP</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Tratamiento especial y beneficios exclusivos</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-6 bg-amber-500 text-black rounded-3xl font-bold heading-racing text-4xl hover:bg-amber-400 shadow-[0_20px_50px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-4 active:scale-95"
              >
                {submitting ? <Loader2 size={36} className="animate-spin" /> : <>CONFIRMAR PILOTO <ChevronRight size={36} /></>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO VEHÍCULO */}
      {showVehicleModal && selectedCustomer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !submitting && setShowVehicleModal(false)} />
          <div className="glass-panel w-full max-w-2xl rounded-[3rem] border border-white/10 relative z-10 animate-in slide-in-from-bottom-12 duration-300 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
                  <Bike size={32} />
                </div>
                <div>
                  <h3 className="heading-racing text-4xl text-zinc-100 italic">Nueva Máquina</h3>
                  <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Garaje de: {selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                </div>
              </div>
              <button onClick={() => setShowVehicleModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                <X size={32} />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Placa / Matrícula</label>
                  <div className="relative group">
                    <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700" size={18} />
                    <input required type="text" value={vehicleData.plate} onChange={e => setVehicleData({ ...vehicleData, plate: e.target.value.toUpperCase() })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-14 pr-5 text-zinc-100 text-2xl heading-racing focus:border-amber-500/50 outline-none" placeholder="ABC-123" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Año</label>
                  <input required type="number" min="1900" max={new Date().getFullYear() + 1} value={vehicleData.year} onChange={e => setVehicleData({ ...vehicleData, year: parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 heading-racing text-2xl focus:border-amber-500/50 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Marca</label>
                  <input required type="text" value={vehicleData.brand} onChange={e => setVehicleData({ ...vehicleData, brand: e.target.value.toUpperCase() })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none font-bold" placeholder="YAMAHA" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Modelo</label>
                  <input required type="text" value={vehicleData.model} onChange={e => setVehicleData({ ...vehicleData, model: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none font-bold" placeholder="MT-07" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">VIN / Chasis</label>
                  <input type="text" value={vehicleData.vin} onChange={e => setVehicleData({ ...vehicleData, vin: e.target.value.toUpperCase() })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none text-xs font-mono" placeholder="VIN-NUMBER-123..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Número de Motor</label>
                  <input type="text" value={vehicleData.engine_number} onChange={e => setVehicleData({ ...vehicleData, engine_number: e.target.value.toUpperCase() })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none text-xs font-mono" placeholder="ENG-SERIAL..." />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Color y Notas Visuales</label>
                <input type="text" value={vehicleData.color} onChange={e => setVehicleData({ ...vehicleData, color: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none" placeholder="Negro Mate / Gris Nardo" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Observaciones Mecánicas Previas</label>
                <textarea value={vehicleData.notes} onChange={e => setVehicleData({ ...vehicleData, notes: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none h-24 resize-none text-sm" placeholder="Detalles sobre escapes, accesorios o golpes..." />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-6 bg-amber-500 text-black rounded-3xl font-bold heading-racing text-4xl hover:bg-amber-400 shadow-[0_20px_50px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-4 mt-6 active:scale-95"
              >
                {submitting ? <Loader2 size={36} className="animate-spin" /> : <>VINCULAR MÁQUINA <ChevronRight size={36} /></>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;