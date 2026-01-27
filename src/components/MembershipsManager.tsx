import { useEffect, useState } from 'react';
import { BadgePercent, Plus, Edit2, Trash2, Users, CalendarRange, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database, Json } from '../lib/database.types';

type Plan = Database['public']['Tables']['membership_plans']['Row'];
type ClientMembership = Database['public']['Tables']['client_memberships']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

export default function MembershipsManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<{ name: string; description: string; price: string; duration_days: string; discount_percent: string; benefits: string; active: boolean }>({
    name: '', description: '', price: '0', duration_days: '30', discount_percent: '0', benefits: '', active: true,
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<{ client_id: string; plan_id: string; start_date: string; auto_renew: boolean }>({ client_id: '', plan_id: '', start_date: new Date().toISOString().slice(0,10), auto_renew: false });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [{ data: plansData }, { data: cmData }, { data: clientsData }] = await Promise.all([
        supabase.from('membership_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('client_memberships').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('full_name'),
      ]);
      setPlans(plansData || []);
      setMemberships(cmData || []);
      setClients(clientsData || []);
    } catch (err) {
      console.error('Error loading memberships:', err);
      alert('Error cargando membresías');
    } finally { setIsLoading(false); }
  };

  const resetPlanForm = () => {
    setEditingPlan(null);
    setPlanForm({ name: '', description: '', price: '0', duration_days: '30', discount_percent: '0', benefits: '', active: true });
  };

  const openNewPlan = () => { resetPlanForm(); setShowPlanModal(true); };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const benefits: Json | null = planForm.benefits ? JSON.parse(planForm.benefits) : null;
      const payload: Database['public']['Tables']['membership_plans']['Insert'] = {
        name: planForm.name,
        description: planForm.description || null,
        price: parseFloat(planForm.price || '0'),
        duration_days: parseInt(planForm.duration_days || '30'),
        discount_percent: parseFloat(planForm.discount_percent || '0'),
        benefits,
        active: planForm.active,
      };
      if (editingPlan) {
        const { error } = await supabase.from('membership_plans').update(payload).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('membership_plans').insert([payload]);
        if (error) throw error;
      }
      setShowPlanModal(false);
      resetPlanForm();
      loadAll();
    } catch (err) {
      console.error('Error saving plan:', err);
      alert('No se pudo guardar el plan');
    }
  };

  const editPlan = (p: Plan) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price ?? 0),
      duration_days: String(p.duration_days ?? 30),
      discount_percent: String(p.discount_percent ?? 0),
      benefits: p.benefits ? JSON.stringify(p.benefits) : '',
      active: p.active,
    });
    setShowPlanModal(true);
  };

  const deletePlan = async (id: string) => {
    if (!confirm('¿Eliminar este plan?')) return;
    try {
      const { error } = await supabase.from('membership_plans').delete().eq('id', id);
      if (error) throw error;
      loadAll();
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert('No se pudo eliminar el plan');
    }
  };

  const openAssign = () => { setAssignForm({ client_id: '', plan_id: '', start_date: new Date().toISOString().slice(0,10), auto_renew: false }); setShowAssignModal(true); };

  const saveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Database['public']['Tables']['client_memberships']['Insert'] = {
        client_id: assignForm.client_id,
        plan_id: assignForm.plan_id,
        start_date: assignForm.start_date,
        auto_renew: assignForm.auto_renew,
      };
      const { error } = await supabase.from('client_memberships').insert([payload]);
      if (error) throw error;
      setShowAssignModal(false);
      loadAll();
    } catch (err) {
      console.error('Error assigning membership:', err);
      alert('No se pudo asignar la membresía');
    }
  };

  const cancelMembership = async (id: string) => {
    if (!confirm('¿Cancelar esta membresía?')) return;
    try {
      const { error } = await supabase.from('client_memberships').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      loadAll();
    } catch (err) {
      console.error('Error cancelling membership:', err);
      alert('No se pudo cancelar la membresía');
    }
  };

  const clientName = (id: string) => clients.find(c => c.id === id)?.full_name || 'Cliente';
  const planName = (id: string) => plans.find(p => p.id === id)?.name || 'Plan';

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-bold heading-racing text-neutral-100 mb-2">MEMBRESÍAS</h2>
          <p className="text-neutral-400 text-racing">Planes y membresías de clientes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNewPlan} className="btn-gold flex items-center gap-2"><Plus className="w-5 h-5" /> NUEVO PLAN</button>
          <button onClick={openAssign} className="px-4 py-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors">Asignar a Cliente</button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-metal p-12 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-metal p-6">
            <div className="flex items-center gap-2 mb-4">
              <BadgePercent className="w-5 h-5 text-amber-500" />
              <h3 className="text-xl font-bold text-neutral-100">Planes</h3>
            </div>
            {plans.length === 0 ? (
              <p className="text-neutral-400">No hay planes definidos</p>
            ) : (
              <div className="space-y-4">
                {plans.map(p => (
                  <div key={p.id} className="border border-neutral-700/50 rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BadgePercent className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-neutral-100">{p.name}</span>
                        <span className={`text-xs px-2 py-1 rounded border ${p.active ? 'bg-green-900/30 text-green-400 border-green-800/50' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700/50'}`}>{p.active ? 'ACTIVO' : 'INACTIVO'}</span>
                      </div>
                      <div className="text-neutral-400 text-sm">
                        <span>${p.price.toFixed(2)}</span> • <span>{p.duration_days} días</span> • <span>{p.discount_percent}% desc</span>
                      </div>
                      {p.description && <p className="text-neutral-500 text-sm mt-2">{p.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editPlan(p)} className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deletePlan(p.id)} className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-metal p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-amber-500" />
              <h3 className="text-xl font-bold text-neutral-100">Membresías de Clientes</h3>
            </div>
            {memberships.length === 0 ? (
              <p className="text-neutral-400">Sin membresías registradas</p>
            ) : (
              <div className="space-y-4">
                {memberships.map(m => (
                  <div key={m.id} className="border border-neutral-700/50 rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-neutral-100">{clientName(m.client_id)}</span>
                      </div>
                      <div className="text-neutral-400 text-sm flex items-center gap-2">
                        <BadgePercent className="w-4 h-4" /> <span>{planName(m.plan_id)}</span>
                        <CalendarRange className="w-4 h-4" /> <span>{m.start_date} → {m.end_date}</span>
                        <span className={`text-xs px-2 py-1 rounded border ${m.status === 'active' ? 'bg-green-900/30 text-green-400 border-green-800/50' : m.status === 'expired' ? 'bg-neutral-800/50 text-neutral-400 border-neutral-700/50' : 'bg-red-900/30 text-red-400 border-red-800/50'}`}>{m.status.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {m.status === 'active' && (
                        <button onClick={() => cancelMembership(m.id)} className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card-metal p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold heading-racing text-neutral-100">{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-neutral-400 hover:text-neutral-200">✕</button>
            </div>
            <form onSubmit={savePlan} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Nombre *</label>
                <input className="input-metal w-full" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Descripción</label>
                <textarea className="input-metal w-full" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Precio</label>
                  <input type="number" step="0.01" className="input-metal w-full" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Duración (días)</label>
                  <input type="number" className="input-metal w-full" value={planForm.duration_days} onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Descuento (%)</label>
                  <input type="number" step="0.01" className="input-metal w-full" value={planForm.discount_percent} onChange={(e) => setPlanForm({ ...planForm, discount_percent: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Beneficios (JSON)</label>
                <textarea className="input-metal w-full" placeholder='{"oil_changes":2,"priority":true}' value={planForm.benefits} onChange={(e) => setPlanForm({ ...planForm, benefits: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input id="plan-active" type="checkbox" checked={planForm.active} onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked })} />
                <label htmlFor="plan-active" className="text-neutral-400">Plan activo</label>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 bg-neutral-800/50 text-neutral-300 rounded">Cancelar</button>
                <button type="submit" className="btn-gold">{editingPlan ? 'Guardar' : 'Crear Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card-metal p-8 max-w-xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold heading-racing text-neutral-100">Asignar Membresía</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-neutral-400 hover:text-neutral-200">✕</button>
            </div>
            <form onSubmit={saveAssign} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Cliente *</label>
                <select className="input-metal w-full" value={assignForm.client_id} onChange={(e) => setAssignForm({ ...assignForm, client_id: e.target.value })} required>
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(c => (<option key={c.id} value={c.id}>{c.full_name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Plan *</label>
                <select className="input-metal w-full" value={assignForm.plan_id} onChange={(e) => setAssignForm({ ...assignForm, plan_id: e.target.value })} required>
                  <option value="">Seleccionar plan...</option>
                  {plans.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Inicio *</label>
                  <input type="date" className="input-metal w-full" value={assignForm.start_date} onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })} required />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input id="auto-renew" type="checkbox" checked={assignForm.auto_renew} onChange={(e) => setAssignForm({ ...assignForm, auto_renew: e.target.checked })} />
                  <label htmlFor="auto-renew" className="text-neutral-400">Renovación automática</label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 bg-neutral-800/50 text-neutral-300 rounded">Cancelar</button>
                <button type="submit" className="btn-gold">Asignar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}