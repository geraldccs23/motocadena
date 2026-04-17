import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { 
  Receipt, Plus, Loader2, Calendar, DollarSign, Wallet2, 
  Search, Filter, Trash2, ArrowRight, AlertCircle, ShoppingBag,
  Truck, UserCircle, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { id: 'ALQUILER', label: 'Alquiler', icon: Wallet2 },
  { id: 'NOMINA', label: 'Nómina / Staff', icon: UserCircle },
  { id: 'REPUESTOS', label: 'Compra Repuestos', icon: ShoppingBag },
  { id: 'SERVICIOS', label: 'Servicios (Luz/Agua)', icon: Settings },
  { id: 'MARKETING', label: 'Marketing/Publi', icon: TrendingUp },
  { id: 'DELIVERY', label: 'Fletes / Delivery', icon: Truck },
  { id: 'OTROS', label: 'Otros Gastos', icon: AlertCircle },
];

const Expenses: React.FC = () => {
  const { profile } = useAuthContext();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    category: 'OTROS',
    description: '',
    amount_usd: 0,
    amount_bs: 0,
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${backendUrl}/api/admin/expenses`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${backendUrl}/api/admin/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          created_by: profile?.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Error registrando gasto');
      }

      setShowModal(false);
      setFormData({ category: 'OTROS', description: '', amount_usd: 0, amount_bs: 0 });
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-0.5 w-20 bg-red-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 italic">Financial Outflow</span>
          </div>
          <h1 className="heading-racing text-8xl text-white italic tracking-tighter leading-none">
            EGRESOS <span className="text-zinc-600">GASTOS</span>
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="glass-card px-10 py-5 bg-red-600 hover:bg-red-500 text-white border border-red-700/50 shadow-xl shadow-red-500/20 transition-all active:scale-95"
        >
          <div className="flex items-center gap-4">
            <Plus size={32} />
            <span className="heading-racing text-4xl uppercase italic leading-none">Registrar</span>
          </div>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="glass-card p-8 premium-border bg-zinc-950/40">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Total Mes USD</p>
            <p className="heading-racing text-5xl text-white italic">
               ${expenses.reduce((acc, curr) => acc + Number(curr.amount_usd), 0).toFixed(2)}
            </p>
         </div>
         <div className="glass-card p-8 premium-border bg-zinc-950/40">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Transacciones</p>
            <p className="heading-racing text-5xl text-red-500 italic">{expenses.length}</p>
         </div>
         <div className="glass-card p-8 premium-border bg-zinc-950/40">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Categoría Mayor</p>
            <p className="heading-racing text-5xl text-zinc-400 italic">NOMINA</p>
         </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" size={28} />
        <input
          type="text"
          placeholder="Filtrar por descripción o categoría..."
          className="w-full bg-zinc-950/50 border border-white/5 rounded-[2.5rem] py-8 pl-20 pr-10 text-2xl text-white font-black italic tracking-tight outline-none focus:border-red-500/50 focus:bg-zinc-950 focus:ring-4 focus:ring-red-500/5 transition-all shadow-2xl placeholder:text-zinc-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="glass-card rounded-[3.5rem] overflow-hidden border border-white/5 premium-border shadow-3xl bg-zinc-950/30">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/60 border-b border-white/5">
                <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">FECHA / HORA</th>
                <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">CATEGORÍA</th>
                <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">CONCEPTO</th>
                <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-right">MONTO</th>
                <th className="px-12 py-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                     <Loader2 className="w-20 h-20 animate-spin mx-auto text-red-500/20 mb-6" />
                     <p className="heading-racing text-3xl text-zinc-700 uppercase italic tracking-widest animate-pulse">Consultando Registros...</p>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-800 heading-racing text-2xl uppercase italic opacity-20">No hay egresos registrados</td>
                </tr>
              ) : filteredExpenses.map((exp) => (
                <motion.tr 
                  key={exp.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                  className="group"
                >
                  <td className="px-12 py-10">
                    <div className="heading-racing text-xl text-white italic uppercase tracking-tighter">
                       {new Date(exp.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-black mt-1 uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={12} /> {new Date(exp.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-12 py-10">
                    <span className="px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:border-red-500/30 group-hover:text-red-500 transition-all">
                       {exp.category}
                    </span>
                  </td>
                  <td className="px-12 py-10">
                    <p className="text-zinc-300 font-bold text-sm tracking-tight">{exp.description || 'Sin descripción'}</p>
                  </td>
                  <td className="px-12 py-10 text-right">
                    <div className="heading-racing text-4xl text-red-500 italic tracking-tighter leading-none">
                      -${Number(exp.amount_usd).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-12 py-10 text-right">
                     <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-800 hover:text-red-500 transition-all cursor-pointer">
                        <Trash2 size={18} />
                     </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Creación */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => !submitting && setShowModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card w-full max-w-xl rounded-[3.5rem] border border-white/10 relative z-10 overflow-hidden premium-border shadow-3xl">
              <div className="p-12 border-b border-white/5 bg-white/5">
                <h3 className="heading-racing text-5xl text-white italic uppercase leading-none">EGRESO CAJA</h3>
                <p className="text-[10px] font-black text-red-500 tracking-widest mt-1 uppercase italic">Retiro de Capital / Gasto Administrativo</p>
              </div>
              <form onSubmit={handleSubmit} className="p-12 space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Categoría</label>
                  <select 
                    required 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-500/50 appearance-none italic"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descripción / Concepto</label>
                  <textarea 
                    required 
                    placeholder="Ej. Pago de luz Marzo 2024..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-500/50 h-32 resize-none"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Monto USD</label>
                    <div className="relative">
                       <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />
                       <input 
                        required type="number" step="0.01" 
                        className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black heading-racing text-3xl outline-none focus:border-red-500/50" 
                        placeholder="0.00"
                        value={formData.amount_usd}
                        onChange={e => setFormData({ ...formData, amount_usd: parseFloat(e.target.value) || 0 })}
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Monto BS (Equivalente)</label>
                    <input 
                      type="number" step="0.01" 
                      className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-zinc-500 font-bold outline-none italic" 
                      placeholder="Opcional"
                      value={formData.amount_bs}
                      onChange={e => setFormData({ ...formData, amount_bs: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <button disabled={submitting} type="submit" className="w-full py-8 bg-red-600 hover:bg-red-500 text-white rounded-[2.5rem] font-black heading-racing text-5xl shadow-2xl transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-6">
                  {submitting ? <Loader2 className="animate-spin" size={40} /> : <>CONFIRMAR EGRESO <ArrowRight size={40} /></>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TrendingUp = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export default Expenses;
