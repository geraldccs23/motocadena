import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Truck, Search, DollarSign, Calendar, ArrowUpRight, 
  CheckCircle2, AlertCircle, Loader2, Filter, 
  Briefcase, Building, ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SupplierDebts: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Traemos las facturas de compra y sus proveedores
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('status', 'received')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Por ahora asumimos que el total es la deuda si no hay tracking de pagos a proveedores
      // En una versión más avanzada, restaríamos pagos realizados.
      setInvoices(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedInvoice || paymentAmount <= 0) return;
    setSubmitting(true);
    try {
      // Lógica de registro de egreso por pago a proveedor
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${backendUrl}/api/admin/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          category: 'REPUESTOS',
          description: `Pago Factura #${selectedInvoice.invoice_number || selectedInvoice.purchase_number} - ${selectedInvoice.supplier?.name}`,
          amount_usd: paymentAmount,
          amount_bs: 0
        })
      });

      if (!res.ok) throw new Error('Error registrando el egreso');

      alert('✅ Pago a proveedor registrado como egreso de caja.');
      setSelectedInvoice(null);
      setPaymentAmount(0);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter(i => 
    i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebt = invoices.reduce((acc, i) => acc + Number(i.total), 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-0.5 w-20 bg-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 italic">Accounts Payable</span>
          </div>
          <h1 className="heading-racing text-8xl text-white italic tracking-tighter leading-none">
            CARTERA <span className="text-zinc-600">PROVEEDORES</span>
          </h1>
        </div>
        
        <div className="glass-card px-10 py-5 border border-amber-500/20 bg-amber-500/5 shadow-2xl shadow-amber-500/10">
           <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Deuda Total a Pagar</p>
           <p className="heading-racing text-5xl text-white italic tracking-tighter">${totalDebt.toFixed(2)}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-colors" size={28} />
        <input
          type="text"
          placeholder="Buscar factura o proveedor..."
          className="w-full bg-zinc-950/50 border border-white/5 rounded-[2.5rem] py-8 pl-20 pr-10 text-2xl text-white font-black italic tracking-tight outline-none focus:border-amber-500/50 focus:bg-zinc-950 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-2xl placeholder:text-zinc-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-40 text-center">
             <Loader2 className="w-20 h-20 animate-spin mx-auto text-amber-500/20 mb-6" />
             <p className="heading-racing text-3xl text-zinc-700 uppercase italic tracking-widest animate-pulse">Consultando Facturas...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card border-dashed border-2 border-zinc-900 opacity-20 rounded-[3rem]">
             <CheckCircle2 size={80} className="mx-auto mb-6" />
             <h3 className="heading-racing text-4xl uppercase italic">Sin cuentas por pagar</h3>
          </div>
        ) : filteredInvoices.map((inv) => (
          <motion.div 
            layout
            key={inv.id}
            whileHover={{ y: -5 }}
            className="glass-card p-10 premium-border relative overflow-hidden group transition-all"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
               <Briefcase size={120} />
            </div>

            <div className="relative z-10 space-y-6">
               <div className="flex justify-between items-start">
                  <div>
                    <h4 className="heading-racing text-3xl text-white italic uppercase tracking-tighter">DOC #{inv.invoice_number || inv.purchase_number}</h4>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Recibido el {new Date(inv.received_at || inv.created_at).toLocaleDateString()}</p>
                  </div>
                  <AlertCircle className="text-amber-500" />
               </div>

               <div className="flex items-center gap-4 py-4 border-y border-white/5">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-950 flex items-center justify-center text-amber-500/50">
                     <Building size={24} />
                  </div>
                  <div>
                     <p className="text-white font-black text-sm uppercase italic tracking-tight">{inv.supplier?.name}</p>
                     <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Proveedor Aliado</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Monto Doc.</p>
                     <p className="heading-racing text-2xl text-zinc-400 italic">${Number(inv.total).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Por Pagar</p>
                     <p className="heading-racing text-4xl text-amber-500 italic leading-none">${Number(inv.total).toFixed(2)}</p>
                  </div>
               </div>

               <button 
                onClick={() => setSelectedInvoice(inv)}
                className="w-full py-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all"
               >
                  PAGAR AHORA
               </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => !submitting && setSelectedInvoice(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card w-full max-w-lg rounded-[3.5rem] border border-white/10 relative z-10 overflow-hidden premium-border shadow-3xl">
              <div className="p-10 border-b border-white/5 bg-white/5">
                <h3 className="heading-racing text-4xl text-white italic uppercase leading-none">ABONO A PROVEEDOR</h3>
                <p className="text-[10px] font-black text-amber-500 tracking-widest mt-1 uppercase italic">Liquidación de Compra Recibida</p>
              </div>
              <div className="p-10 space-y-8">
                <div className="flex items-center justify-between p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                   <div>
                      <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">Saldo pendiente</p>
                      <p className="heading-racing text-5xl text-white italic">${Number(selectedInvoice.total).toFixed(2)}</p>
                   </div>
                   <ShoppingCart className="text-amber-500" size={32} />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Monto del Pago (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500" size={28} />
                    <input 
                      autoFocus
                      type="number" step="0.01" max={selectedInvoice.total}
                      className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-4xl heading-racing text-white outline-none focus:border-amber-500/50 transition-all shadow-inner"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <button 
                  disabled={submitting || paymentAmount <= 0}
                  onClick={handlePayment}
                  className="w-full py-8 bg-amber-500 hover:bg-amber-400 text-black rounded-[2.5rem] font-black heading-racing text-5xl shadow-2xl transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-6"
                >
                  {submitting ? <Loader2 className="animate-spin" size={40} /> : <>EJECUTAR PAGO <ArrowUpRight size={40} /></>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupplierDebts;
