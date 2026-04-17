import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, Search, DollarSign, Calendar, ArrowUpRight, 
  CheckCircle2, AlertCircle, Loader2, Filter, 
  Receipt, User, Bike
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CreditSales: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCreditSales();
  }, []);

  const fetchCreditSales = async () => {
    setLoading(true);
    try {
      // Traemos las ventas a crédito y sus pagos asociados
      const { data, error } = await supabase
        .from('pos_sales')
        .select(`
          *,
          customer:customers(*),
          payments:payments(*)
        `)
        .eq('is_credit', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Calcular balance para cada venta
      const salesWithBalance = (data || []).map(sale => {
        const totalPaid = (sale.payments || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
        return {
          ...sale,
          paid_amount: totalPaid,
          balance: Number(sale.total_amount) - totalPaid
        };
      });

      setSales(salesWithBalance);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedSale || paymentAmount <= 0) return;
    setSubmitting(true);
    try {
      const { data: workshops } = await supabase.from('workshops').select('id').limit(1).single();
      const { data: session } = await supabase.from('cash_sessions').select('id').eq('status', 'OPEN').maybeSingle();
      
      if (!session) throw new Error('Debe abrir caja antes de registrar un abono.');

      const { error } = await supabase.from('payments').insert([{
        workshop_id: workshops?.id,
        cash_session_id: session.id,
        sale_id: selectedSale.id,
        amount: paymentAmount,
        currency: 'USD',
        method: 'DEUDA_PENDIENTE', // Marcamos como abono a deuda
        reference_code: `Abono Venta #${selectedSale.id.slice(0,8)}`
      }]);

      if (error) throw error;

      alert('✅ Abono registrado exitosamente.');
      setSelectedSale(null);
      setPaymentAmount(0);
      fetchCreditSales();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSales = sales.filter(s => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer?.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebt = sales.reduce((acc, s) => acc + s.balance, 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-0.5 w-20 bg-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 italic">Accounts Receivable</span>
          </div>
          <h1 className="heading-racing text-8xl text-white italic tracking-tighter leading-none">
            CARTERA <span className="text-zinc-600">CLIENTES</span>
          </h1>
        </div>
        
        <div className="glass-card px-10 py-5 border border-emerald-500/20 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10">
           <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Deuda Total Activa</p>
           <p className="heading-racing text-5xl text-white italic tracking-tighter">${totalDebt.toFixed(2)}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" size={28} />
        <input
          type="text"
          placeholder="Buscar deudor por nombre o folio..."
          className="w-full bg-zinc-950/50 border border-white/5 rounded-[2.5rem] py-8 pl-20 pr-10 text-2xl text-white font-black italic tracking-tight outline-none focus:border-emerald-500/50 focus:bg-zinc-950 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-2xl placeholder:text-zinc-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Credit List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-40 text-center">
             <Loader2 className="w-20 h-20 animate-spin mx-auto text-emerald-500/20 mb-6" />
             <p className="heading-racing text-3xl text-zinc-700 uppercase italic tracking-widest animate-pulse">Consultando Pagarés...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card border-dashed border-2 border-zinc-900 opacity-20 rounded-[3rem]">
             <CheckCircle2 size={80} className="mx-auto mb-6" />
             <h3 className="heading-racing text-4xl uppercase italic">No hay cuentas pendientes</h3>
          </div>
        ) : filteredSales.map((sale) => (
          <motion.div 
            layout
            key={sale.id}
            whileHover={{ y: -5 }}
            className={`glass-card p-10 premium-border relative overflow-hidden group transition-all ${sale.balance <= 0 ? 'opacity-40 grayscale' : 'border-emerald-500/20'}`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
               <Receipt size={120} />
            </div>

            <div className="relative z-10 space-y-6">
               <div className="flex justify-between items-start">
                  <div>
                    <h4 className="heading-racing text-3xl text-white italic uppercase tracking-tighter">VENTA #{sale.id.slice(0, 8)}</h4>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Registrada el {new Date(sale.created_at).toLocaleDateString()}</p>
                  </div>
                  {sale.balance > 0 ? (
                     <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  ) : (
                     <CheckCircle2 className="text-emerald-500" />
                  )}
               </div>

               <div className="flex items-center gap-4 py-4 border-y border-white/5">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-950 flex items-center justify-center text-zinc-700">
                     <User size={24} />
                  </div>
                  <div>
                     <p className="text-white font-black text-sm uppercase italic tracking-tight">{sale.customer?.first_name} {sale.customer?.last_name}</p>
                     <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Piloto Deudor</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Total Venta</p>
                     <p className="heading-racing text-2xl text-zinc-400 italic">${Number(sale.total_amount).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Pendiente</p>
                     <p className="heading-racing text-4xl text-emerald-500 italic leading-none">${sale.balance.toFixed(2)}</p>
                  </div>
               </div>

               {sale.balance > 0 && (
                  <button 
                    onClick={() => setSelectedSale(sale)}
                    className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    REGISTRAR ABONO
                  </button>
               )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => !submitting && setSelectedSale(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card w-full max-w-lg rounded-[3.5rem] border border-white/10 relative z-10 overflow-hidden premium-border shadow-3xl">
              <div className="p-10 border-b border-white/5 bg-white/5">
                <h3 className="heading-racing text-4xl text-white italic uppercase leading-none">ABONO A CUENTA</h3>
                <p className="text-[10px] font-black text-emerald-500 tracking-widest mt-1 uppercase italic">Liquidación de Crédito Otorgado</p>
              </div>
              <div className="p-10 space-y-8">
                <div className="flex items-center justify-between p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                   <div>
                      <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Saldo deudor actual</p>
                      <p className="heading-racing text-5xl text-white italic">${selectedSale.balance.toFixed(2)}</p>
                   </div>
                   <ArrowUpRight className="text-emerald-500" size={32} />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Monto del Abono (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={28} />
                    <input 
                      autoFocus
                      type="number" step="0.01" max={selectedSale.balance}
                      className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-4xl heading-racing text-white outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex gap-2">
                    {[10, 20, 50, 100].map(amt => (
                      <button 
                        key={amt} 
                        onClick={() => setPaymentAmount(amt > selectedSale.balance ? selectedSale.balance : amt)}
                        className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                      >
                         +${amt}
                      </button>
                    ))}
                    <button 
                      onClick={() => setPaymentAmount(selectedSale.balance)}
                      className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[10px] font-black text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all"
                    >
                       TOTAL
                    </button>
                  </div>
                </div>

                <button 
                  disabled={submitting || paymentAmount <= 0}
                  onClick={handlePayment}
                  className="w-full py-8 bg-emerald-500 hover:bg-emerald-400 text-black rounded-[2.5rem] font-black heading-racing text-5xl shadow-2xl transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-6"
                >
                  {submitting ? <Loader2 className="animate-spin" size={40} /> : <>CONFIRMAR PAGO <CheckCircle2 size={40} /></>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreditSales;
