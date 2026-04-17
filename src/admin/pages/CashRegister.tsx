import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { Landmark, Loader2, ArrowRight, DollarSign, Wallet2, CheckCircle2, AlertTriangle, TrendingUp, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const USD_DENOMINATIONS = [1, 5, 10, 20, 50, 100];

const CashRegister: React.FC = () => {
  const { profile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [exchangeLoading, setExchangeLoading] = useState(true);

  // Formularios
  const [openForm, setOpenForm] = useState({ usd: 0, bs: 0 });

  const [closeForm, setCloseForm] = useState({
    usdNotes: { 1: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0 } as Record<number, number>,
    efectivoBs: 0,
    pagoMovil: 0,
    transferenciaBs: 0,
    notes: ''
  });

  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    fetchSession();
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      const data = await res.json();
      setExchangeRate(data.promedio || 60.0);
    } catch {
      setExchangeRate(60.0); // Fallback
    } finally {
      setExchangeLoading(false);
    }
  };

  const fetchSession = async () => {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const res = await fetch(`${backendUrl}/api/admin/cash-sessions/current`, {
        headers: { 'Authorization': `Bearer ${authSession?.access_token}` }
      });
      const data = await res.json();
      
      if (data.is_open) {
        setSession(data.session);
      } else {
        setSession(null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const res = await fetch(`${backendUrl}/api/admin/cash-sessions/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`
        },
        body: JSON.stringify({
          opened_by: profile?.id,
          opening_balance_usd: openForm.usd,
          opening_balance_bs: openForm.bs
        })
      });
      
      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error?.message || 'Error abriendo caja');
      }
      
      await fetchSession();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Cálculos dinámicos de cierre
  const totalEfectivoUsdDeclarado = USD_DENOMINATIONS.reduce((acc, val) => acc + (closeForm.usdNotes[val] * val), 0);
  const d_efectivoBSenUSD = closeForm.efectivoBs / exchangeRate;
  const d_pagoMovilUSD = closeForm.pagoMovil / exchangeRate;
  const d_transferUSD = closeForm.transferenciaBs / exchangeRate;

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Balance Total Acumulado Declarado en USD
    const totalDeclaredUsd = totalEfectivoUsdDeclarado + d_efectivoBSenUSD + d_pagoMovilUSD + d_transferUSD;
    const expectedTotal = session.live_calculated_usd; 

    try {
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const res = await fetch(`${backendUrl}/api/admin/cash-sessions/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`
        },
        body: JSON.stringify({
          session_id: session.id,
          closed_by: profile?.id,
          calculated_usd: expectedTotal,
          calculated_bs: session.live_calculated_bs,
          declared_usd: totalDeclaredUsd,
          declared_bs: 0,
          breakdown: { ...closeForm },
          closing_notes: closeForm.notes
        })
      });
      
      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error?.message || 'Error cerrando caja');
      }
      
      setShowCloseModal(false);
      await fetchSession();
      alert("✅ Arqueo completado exitosamente.");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="animate-spin text-amber-500" />
        <p className="heading-racing text-xl animate-pulse">Sincronizando Bóveda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-12 bg-amber-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80">Finanzas & Retail</span>
          </div>
          <h1 className="heading-racing text-6xl text-white italic tracking-tighter leading-none">
            CONTROL DE <span className="text-amber-500">CAJA</span>
          </h1>
          <p className="text-zinc-500 text-sm italic font-medium mt-2">Gestión de flujo atómico y arqueo de divisas.</p>
        </div>

        <div className="flex gap-4">
          <div className="glass-card px-6 py-3 border border-white/5 flex items-center gap-4">
            <div className="bg-amber-500/10 p-2 rounded-lg">
              <TrendingUp size={20} className="text-amber-500" />
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">Tasa BCV</p>
              <p className="text-2xl heading-racing text-white leading-none">
                {exchangeLoading ? '---' : exchangeRate.toFixed(2)} <span className="text-xs text-zinc-500">BS</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {!session ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto"
        >
          <div className="glass-card p-10 relative overflow-hidden group premium-border">
            <div className="absolute -right-10 -top-10 scale-150 rotate-12 opacity-5 pointer-events-none group-hover:rotate-45 transition-transform duration-1000">
              <Wallet2 size={200} />
            </div>
            
            <h2 className="heading-racing text-4xl text-white mb-6 italic flex items-center gap-3">
              <Landmark className="text-amber-500" /> APERTURA DE TURNO
            </h2>

            <form onSubmit={handleOpenShift} className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400">Fondo Inicial USD</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                    <input 
                      type="number" step="0.01" required
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 pl-12 text-3xl heading-racing outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                      value={openForm.usd}
                      onChange={e => setOpenForm({...openForm, usd: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400">Fondo Inicial VEF (Bs)</label>
                  <input 
                    type="number" step="0.01" required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-3xl heading-racing outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all"
                    value={openForm.bs}
                    onChange={e => setOpenForm({...openForm, bs: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <button 
                disabled={submitting}
                className="w-full py-6 bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-black rounded-2xl font-black heading-racing text-3xl shadow-xl shadow-amber-950/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <>INICIAR OPERACIONES <ArrowRight size={24} /></>}
              </button>
            </form>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-8"
          >
            <div className="glass-card p-8 premium-border relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                  <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" /> Operativo
                </div>
              </div>

              <div className="mb-10">
                <h2 className="heading-racing text-4xl text-white italic mb-1">RESUMEN DEL TURNO</h2>
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  <History size={12} /> Desde {new Date(session.opened_at).toLocaleTimeString()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-black/20 border border-white/5 rounded-2xl relative overflow-hidden group">
                  <DollarSign className="absolute -right-4 -bottom-4 text-emerald-500/10 group-hover:scale-125 transition-transform duration-500" size={100} />
                  <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Base de Apertura</p>
                  <p className="heading-racing text-5xl text-emerald-500 tracking-tighter">${Number(session.opening_balance_usd).toFixed(2)}</p>
                </div>
                
                <div className="p-6 bg-black/40 border border-amber-500/20 rounded-2xl relative overflow-hidden group shadow-2xl shadow-amber-950/20">
                  <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-2">Efectivo Total Acumulado</p>
                  <p className="heading-racing text-6xl text-white tracking-tighter">
                    <span className="text-amber-500/50">$</span>{(session.live_calculated_usd).toFixed(2)}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowCloseModal(true)} 
                className="w-full py-6 mt-10 bg-white hover:bg-zinc-200 text-black font-black heading-racing text-4xl rounded-2xl transition-all flex items-center justify-center gap-4 group"
              >
                REALIZAR CIERRE <CheckCircle2 size={32} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               {Object.entries(session.breakdown_live || {}).map(([method, amount]: [any, any]) => (
                 <div key={method} className="glass-card p-4 border border-white/5">
                   <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mb-1 truncate">{method.replace('_', ' ')}</p>
                   <p className="heading-racing text-xl text-white">${Number(amount || 0).toFixed(2)}</p>
                 </div>
               ))}
            </div>
          </motion.div>

          {/* Sidebar / Stats */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="glass-card p-6 border border-white/5">
               <h3 className="heading-racing text-2xl text-white italic mb-6">POLÍTICA DE CAJA</h3>
               <div className="space-y-4">
                 <div className="flex gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                   <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                   <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                     Cada arqueo debe coincidir físicamente. Discrepancias mayores a <span className="text-amber-500">$0.50</span> requieren justificación obligatoria.
                   </p>
                 </div>
                 <div className="flex gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                   <TrendingUp className="text-emerald-500 shrink-0" size={20} />
                   <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                     Las ventas a crédito (CxC) no suman al total de efectivo hasta que se registre el abono.
                   </p>
                 </div>
               </div>
            </div>
            
            <div className="glass-card p-6 border border-white/5 bg-gradient-to-br from-zinc-900/60 to-black">
              <h3 className="heading-racing text-xl text-white mb-4 italic">RESPONSABLE</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center font-black text-black">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{profile?.full_name}</p>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{profile?.role}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL CORTE Z (Optimizado) */}
      <AnimatePresence>
        {showCloseModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-2xl" 
              onClick={() => !submitting && setShowCloseModal(false)} 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-5xl border border-white/10 relative z-10 flex flex-col lg:flex-row overflow-hidden max-h-[90vh] premium-border"
            >
              {/* Calculator Section */}
              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-black/40">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="heading-racing text-5xl text-white italic tracking-tight underline decoration-amber-500/50 underline-offset-8">ARQUEO FÍSICO</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-zinc-500 tracking-widest">SUBTOTAL FÍSICO</p>
                    <p className="heading-racing text-3xl text-emerald-500">${totalEfectivoUsdDeclarado.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {USD_DENOMINATIONS.map(den => (
                    <div key={den} className="flex items-center gap-4 bg-zinc-900/50 p-3 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                      <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center shrink-0">
                        <span className="heading-racing text-2xl text-emerald-500">${den}</span>
                      </div>
                      <div className="flex-1">
                        <input 
                          type="number" min="0" placeholder="0"
                          className="w-full bg-transparent border-b border-zinc-800 p-2 text-2xl heading-racing text-white placeholder:text-zinc-800 outline-none focus:border-emerald-500"
                          value={closeForm.usdNotes[den] || ''}
                          onChange={e => setCloseForm({...closeForm, usdNotes: {...closeForm.usdNotes, [den]: parseInt(e.target.value) || 0}})}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 space-y-6">
                  <h4 className="heading-racing text-xl text-zinc-500 italic">DECLARACIÓN BANCARIA / VEF</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Efectivo VEF (Bolívares)</label>
                      <input 
                        type="number" step="0.01" placeholder="0.00"
                        className="w-full bg-black/60 border border-white/5 rounded-xl p-4 text-white heading-racing text-2xl outline-none focus:border-amber-500/50"
                        value={closeForm.efectivoBs || ''}
                        onChange={e => setCloseForm({...closeForm, efectivoBs: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Pago Móvil (BS)</label>
                      <input 
                        type="number" step="0.01" placeholder="0.00"
                        className="w-full bg-black/60 border border-white/5 rounded-xl p-4 text-white heading-racing text-2xl outline-none focus:border-amber-500/50"
                        value={closeForm.pagoMovil || ''}
                        onChange={e => setCloseForm({...closeForm, pagoMovil: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="w-full lg:w-[400px] p-10 bg-zinc-950 flex flex-col justify-between border-l border-white/10">
                <div className="space-y-8">
                  <h3 className="heading-racing text-4xl text-amber-500 mb-8 italic">CONCILIACIÓN</h3>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Esperado (Sistema)</span>
                      <span className="heading-racing text-3xl text-white">${session.live_calculated_usd?.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase">Contabilizado Real</span>
                      <span className="heading-racing text-5xl text-amber-500 tracking-tighter">
                        ${(totalEfectivoUsdDeclarado + d_efectivoBSenUSD + d_pagoMovilUSD + d_transferUSD).toFixed(2)}
                      </span>
                    </div>

                    { Math.abs(session.live_calculated_usd - (totalEfectivoUsdDeclarado + d_efectivoBSenUSD + d_pagoMovilUSD + d_transferUSD)) > 0.50 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl"
                      >
                        <p className="text-red-500 text-[10px] font-black uppercase mb-3 flex items-center gap-2">
                          <AlertTriangle size={16}/> DISCREPANCIA DETECTADA
                        </p>
                        <textarea 
                          className="w-full bg-black/40 border border-red-500/20 rounded-xl p-4 text-sm text-white font-medium outline-none h-28 resize-none focus:border-red-500"
                          placeholder="Justificación obligatoria para continuar..."
                          value={closeForm.notes}
                          onChange={e => setCloseForm({...closeForm, notes: e.target.value})}
                        ></textarea>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="pt-10">
                  <button 
                    onClick={handleCloseShift}
                    disabled={submitting || (Math.abs(session.live_calculated_usd - (totalEfectivoUsdDeclarado + d_efectivoBSenUSD + d_pagoMovilUSD + d_transferUSD)) > 0.50 && !closeForm.notes)}
                    className="w-full py-6 bg-gradient-to-r from-emerald-600 to-emerald-400 text-black rounded-2xl font-black heading-racing text-4xl shadow-2xl shadow-emerald-950/20 disabled:opacity-50 transition-all flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95"
                  >
                    {submitting ? <Loader2 className="animate-spin" /> : <>SELLAR CORTE <CheckCircle2 size={32} /></>}
                  </button>
                  <p className="text-[8px] text-zinc-600 uppercase font-black text-center mt-4 tracking-[0.2em]">Esta acción es irreversible y genera asiento contable.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CashRegister;
