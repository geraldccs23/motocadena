import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ShoppingCart, Trash2, Banknote, UserPlus,
  Loader2, Package, Bike, Clock, X,
  ArrowRight, Landmark, QrCode, DollarSign, RefreshCw,
  CheckCircle2, Zap, Plus, Minus, LayoutGrid, ChevronRight,
  TrendingUp, CreditCard
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product, Service, Customer } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Tipos locales para el flujo de POS
interface CartItem {
  id: string;
  type: 'PRODUCT' | 'SERVICE';
  name: string;
  price: number;
  quantity: number;
  originalData: any;
}

interface PaymentAbono {
  method: string;
  amountUSD: number;
  amountBS: number;
  reference: string;
}

const POS: React.FC = () => {
  const { profile } = useAuthContext();

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [exchangeLoading, setExchangeLoading] = useState(true);

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog');
  const [activeCategory, setActiveCategory] = useState<'PRODUCTS' | 'SERVICES' | 'ORDERS'>('PRODUCTS');

  // Customer Modal States
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    id_number: ''
  });

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAbonos, setPaymentAbonos] = useState<PaymentAbono[]>([]);
  const [currentMethod, setCurrentMethod] = useState<string | null>(null);
  const [currentAmountInput, setCurrentAmountInput] = useState<string>('');
  const [currentRef, setCurrentRef] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchInitialData();
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    setExchangeLoading(true);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      const data = await res.json();
      setExchangeRate(data.promedio || 60.0);
    } catch (err) {
      setExchangeRate(60.0);
    } finally {
      setExchangeLoading(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, cRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('services').select('*').order('name'),
        supabase.from('customers').select('*').order('first_name')
      ]);

      setProducts(pRes.data || []);
      setServices(sRes.data || []);
      setCustomers(cRes.data || []);
      fetchPendingWorkOrders();
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingWorkOrders = async () => {
    const { data } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
      `)
      .neq('billing_status', 'PAID')
      .neq('status', 'CANCELED')
      .order('created_at', { ascending: false });
    setPendingOrders(data || []);
  };

  const subtotalUSD = useMemo(() => {
    if (selectedOrder) return selectedOrder.total_amount;
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [selectedOrder, cart]);

  const totalAbonadoUSD = useMemo(() => {
    return paymentAbonos.reduce((acc, abono) => acc + abono.amountUSD, 0);
  }, [paymentAbonos]);

  const saldoRestanteUSD = Math.max(0, subtotalUSD - totalAbonadoUSD);

  const handleSelectOrder = (order: any) => {
    if (cart.length > 0) {
      if (!confirm("Se descartará el carrito actual para procesar esta orden. ¿Continuar?")) return;
    }
    setSelectedOrder(order);
    setSelectedCustomer(order.customer);
    setCart([]);
    setActiveTab('cart');
  };

  const addToCart = (item: Product | Service, type: 'PRODUCT' | 'SERVICE') => {
    if (selectedOrder) {
      if (!confirm("Estás liquidando una Orden de Trabajo. ¿Deseas cancelar y hacer una venta directa?")) return;
      setSelectedOrder(null);
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === type);
      if (existing) {
        return prev.map(i => i.id === item.id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: item.id,
        type,
        name: item.name,
        price: item.price,
        quantity: 1,
        originalData: item
      }];
    });
  };

  const removeFromCart = (id: string, type: string) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const addAbono = () => {
    if (!currentMethod || !currentAmountInput) return;
    const amount = parseFloat(currentAmountInput);
    if (isNaN(amount) || amount <= 0) return;

    let amountUSD = 0;
    let amountBS = 0;

    if (currentMethod === 'EFECTIVO_BS' || currentMethod === 'PAGO_MOVIL' || currentMethod === 'TRANSFERENCIA_BS') {
      amountBS = amount;
      amountUSD = amount / exchangeRate;
    } else {
      amountUSD = amount;
      amountBS = amount * exchangeRate;
    }

    if (amountUSD > (saldoRestanteUSD + 0.05)) {
      alert("El monto ingresado supera el saldo pendiente.");
      return;
    }

    setPaymentAbonos([...paymentAbonos, {
      method: currentMethod,
      amountUSD: amountUSD,
      amountBS: amountBS,
      reference: currentRef
    }]);

    setCurrentAmountInput('');
    setCurrentRef('');
    setCurrentMethod(null);
  };

  const removeAbono = (index: number) => {
    setPaymentAbonos(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessPayment = async () => {
    if (saldoRestanteUSD > 0.05) {
      alert("Aún queda saldo pendiente por cubrir.");
      return;
    }

    setProcessingPayment(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const payload = {
        work_order_id: selectedOrder ? selectedOrder.id : null,
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        seller_id: profile?.id,
        items: cart,
        payments: paymentAbonos,
        total_amount: subtotalUSD
      };

      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const response = await fetch(`${backendUrl}/api/admin/pos/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Error procesando la venta');
      }

      alert("🏁 ¡CHECKERED FLAG! Transacción finalizada con éxito.");
      resetPOS();
      fetchPendingWorkOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingPayment(false);
      setShowPaymentModal(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingPayment(true);
    try {
      const { data: newCust, error: cErr } = await supabase.from('customers').insert([newCustomerData]).select().single();
      if (cErr) throw cErr;

      setCustomers(prev => [...prev, newCust as any]);
      setSelectedCustomer(newCust as any);
      setShowCustomerModal(false);
      setNewCustomerData({ first_name: '', last_name: '', phone: '', id_number: '' });
      alert("✅ Piloto registrado exitosamente.");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setSelectedOrder(null);
    setSelectedCustomer(null);
    setPaymentAbonos([]);
    setCurrentMethod(null);
    setCurrentAmountInput('');
    setCurrentRef('');
    setActiveTab('catalog');
  };

  const filteredCatalog = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (activeCategory === 'PRODUCTS') {
      return products.filter(x => x.name.toLowerCase().includes(term) || x.sku?.toLowerCase().includes(term));
    }
    if (activeCategory === 'SERVICES') {
      return services.filter(x => x.name.toLowerCase().includes(term));
    }
    if (activeCategory === 'ORDERS') {
      return pendingOrders.filter(order =>
        order.customer?.first_name?.toLowerCase().includes(term) ||
        order.customer?.last_name?.toLowerCase().includes(term) ||
        order.vehicle?.plate?.toLowerCase().includes(term)
      );
    }
    return [];
  }, [searchTerm, products, services, pendingOrders, activeCategory]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-8 animate-in fade-in duration-700 pb-10">
      
      {/* Catalog & Search Section */}
      <div className={`flex-1 flex flex-col gap-6 overflow-hidden ${activeTab === 'catalog' ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Header Visual */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-0.5 w-12 bg-blue-500 rounded-full" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500/80 italic">Pit Stop Terminal</span>
            </div>
            <h1 className="heading-racing text-5xl text-white italic tracking-tighter leading-none">
              PUNTO DE <span className="text-blue-500">VENTA</span>
            </h1>
          </div>

          <div className="flex gap-4">
            <div className="glass-card px-4 py-2 border border-white/5 flex items-center gap-3">
              <RefreshCw size={14} className={`text-amber-500 ${exchangeLoading ? 'animate-spin' : ''}`} />
              <div className="text-right">
                <p className="text-[7px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-none mb-0.5">BCV Oficial</p>
                <p className="heading-racing text-xl text-white leading-none">{exchangeRate.toFixed(2)} <span className="text-[10px] text-zinc-600">BS</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar productos, servicios u órdenes..."
              className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'PRODUCTS', label: 'Repuestos', icon: <Package size={14} />, color: 'blue' },
              { id: 'SERVICES', label: 'Servicios', icon: <Zap size={14} />, color: 'amber' },
              { id: 'ORDERS', label: 'Ordenes Activas', icon: <Bike size={14} />, color: 'emerald' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-6 py-2.5 rounded-full border font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${
                  activeCategory === cat.id
                    ? `bg-${cat.color}-500 text-black border-${cat.color}-400 shadow-lg shadow-${cat.color}-500/20`
                    : 'bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-white/10'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Results */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredCatalog.map((item: any) => (
                <motion.button
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={item.id}
                  onClick={() => {
                    if (activeCategory === 'ORDERS') handleSelectOrder(item);
                    else addToCart(item, activeCategory === 'PRODUCTS' ? 'PRODUCT' : 'SERVICE');
                  }}
                  className={`glass-card p-5 border text-left group flex flex-col justify-between h-[160px] premium-border transition-all ${
                    selectedOrder?.id === item.id ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${
                      activeCategory === 'PRODUCTS' ? 'text-blue-500 border-blue-500/20 bg-blue-500/5' :
                      activeCategory === 'SERVICES' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' :
                      'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                    }`}>
                      {activeCategory === 'PRODUCTS' ? 'Part' : activeCategory === 'SERVICES' ? 'Svc' : 'OT'}
                    </span>
                    <span className="heading-racing text-2xl text-white italic">
                      ${Number(item.price || item.total_amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-zinc-100 font-bold text-xs line-clamp-2 leading-tight uppercase italic tracking-tight">
                      {activeCategory === 'ORDERS' ? `${item.customer?.first_name} ${item.customer?.last_name}` : item.name}
                    </p>
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                      {activeCategory === 'ORDERS' ? item.vehicle?.plate : item.sku || 'N/A'}
                    </p>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-white/5">
                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 transition-all">
                      {activeCategory === 'ORDERS' ? <ChevronRight size={16} className="text-zinc-500 group-hover:text-black" /> : <Plus size={16} className="text-zinc-500 group-hover:text-black" />}
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Cart & Summary Panel */}
      <div className={`w-full md:w-[400px] lg:w-[450px] glass-card border border-white/10 flex flex-col overflow-hidden premium-border shadow-2xl ${activeTab === 'cart' ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Cart Header */}
        <div className="p-8 bg-black/40 border-b border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ShoppingCart size={24} className="text-blue-500" />
              </div>
              <div>
                <h3 className="heading-racing text-3xl text-white italic leading-none">TICKET</h3>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Terminal {profile?.full_name?.split(' ')[0]}</p>
              </div>
            </div>
            <button onClick={resetPOS} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
              <Trash2 size={20} />
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <select
                disabled={!!selectedOrder}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3.5 px-4 text-white font-bold text-xs outline-none focus:border-blue-500/50 appearance-none disabled:opacity-50"
                value={selectedCustomer?.id || ''}
                onChange={(e) => setSelectedCustomer(customers.find(x => x.id === e.target.value) || null)}
              >
                <option value="">Seleccionar Piloto...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
            {!selectedOrder && (
              <button
                onClick={() => setShowCustomerModal(true)}
                className="p-3.5 bg-blue-500 hover:bg-blue-400 text-black rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                <UserPlus size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {selectedOrder ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] space-y-4 text-center"
            >
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <Bike size={32} className="text-emerald-500" />
              </div>
              <div>
                <p className="heading-racing text-2xl text-white uppercase italic">LIQUIDACIÓN ÓRDEN</p>
                <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">Box #OT-{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                 <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                    <span>Subtotal Items</span>
                    <span>${(selectedOrder.total_amount).toFixed(2)}</span>
                 </div>
              </div>
            </motion.div>
          ) : cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <LayoutGrid size={80} className="mb-4" />
              <p className="heading-racing text-3xl italic uppercase">Terminal Vacío</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {cart.map((item) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={`${item.id}-${item.type}`} 
                  className="flex items-center justify-between p-4 bg-zinc-900/40 border border-white/5 rounded-2xl group hover:border-blue-500/30 transition-all"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-white font-bold text-xs truncate uppercase tracking-tight italic">{item.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="heading-racing text-2xl text-blue-500 italic">${item.price.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                     <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded-full border border-white/10">
                        <button onClick={() => {
                           if (item.quantity > 1) setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                           else removeFromCart(item.id, item.type);
                        }} className="text-zinc-500 hover:text-red-500 p-1"><Minus size={12} /></button>
                        <span className="text-xs font-black text-white px-2">{item.quantity}</span>
                        <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} className="text-zinc-500 hover:text-blue-500 p-1"><Plus size={12} /></button>
                     </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Cart Summary */}
        <div className="p-8 bg-zinc-950 border-t border-white/10 space-y-8">
          <div className="space-y-2">
             <div className="flex justify-between items-end">
                <span className="heading-racing text-2xl text-zinc-500 italic">TOTAL DUE</span>
                <span className="heading-racing text-6xl text-white tracking-tighter italic">${subtotalUSD.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-zinc-600 font-bold uppercase tracking-widest text-[10px]">
                <span>Tasa {exchangeRate.toFixed(2)}</span>
                <span>≈ {(subtotalUSD * exchangeRate).toLocaleString()} BS</span>
             </div>
          </div>

          <button
            disabled={(!selectedOrder && cart.length === 0) || !selectedCustomer || loading}
            onClick={() => setShowPaymentModal(true)}
            className="w-full py-6 bg-blue-500 hover:bg-blue-400 text-black font-black heading-racing text-4xl rounded-2xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-4"
          >
            CHECKOUT <ArrowRight size={32} />
          </button>
        </div>
      </div>

      {/* MULTI-PAYMENT MODAL (Optimized) */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => !processingPayment && setShowPaymentModal(false)} 
            />
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
               className="glass-card w-full max-w-5xl rounded-[3rem] border border-white/10 relative z-10 overflow-hidden flex flex-col md:flex-row max-h-[90vh] premium-border"
            >
              
              {/* Payment Select */}
              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                <div className="mb-10">
                  <h3 className="heading-racing text-5xl text-white italic tracking-tight underline decoration-blue-500/50 underline-offset-8">METODOS DE PAGO</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                  {[
                    { id: 'EFECTIVO_USD', label: 'Efectivo $', icon: <DollarSign size={24} />, color: 'emerald' },
                    { id: 'EFECTIVO_BS', label: 'Efectivo BS', icon: <Banknote size={24} />, color: 'zinc' },
                    { id: 'PAGO_MOVIL', label: 'Pago Móvil', icon: <QrCode size={24} />, color: 'amber' },
                    { id: 'TRANSFERENCIA_BS', label: 'Transferencia', icon: <Landmark size={24} />, color: 'blue' },
                    { id: 'CREDITO', label: 'Crédito / CxC', icon: <CreditCard size={24} />, color: 'red' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setCurrentMethod(m.id);
                        setCurrentAmountInput(m.id.includes('BS') || m.id === 'PAGO_MOVIL' ? (saldoRestanteUSD * exchangeRate).toFixed(2) : saldoRestanteUSD.toFixed(2));
                      }}
                      className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 font-black uppercase text-[10px] tracking-widest ${
                        currentMethod === m.id 
                        ? `bg-${m.color}-500 text-black border-${m.color}-400 shadow-xl` 
                        : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10'
                      }`}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {currentMethod && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="space-y-6 p-8 bg-white/5 rounded-[2rem] border border-white/5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Importe ({currentMethod.includes('BS') ? 'BS' : 'USD'})</label>
                           <input
                              type="number" step="0.01"
                              className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-4xl heading-racing text-white outline-none focus:border-blue-500/50"
                              value={currentAmountInput}
                              onChange={(e) => setCurrentAmountInput(e.target.value)}
                              autoFocus
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Confirmación / Referencia</label>
                           <input
                              type="text" placeholder="REF-0000"
                              className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-2xl heading-racing text-white outline-none focus:border-blue-500/50"
                              value={currentRef}
                              onChange={(e) => setCurrentRef(e.target.value)}
                           />
                        </div>
                      </div>
                      <button onClick={addAbono} className="w-full py-5 bg-white text-black rounded-2xl font-black heading-racing text-3xl hover:bg-zinc-200 transition-all">
                        AÑADIR AL TICKET
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Summary Checkout */}
              <div className="w-full md:w-[400px] bg-zinc-950 p-10 flex flex-col justify-between border-l border-white/10">
                <div className="space-y-10">
                  <h4 className="heading-racing text-4xl text-blue-500 italic">CARTAS DE PAGO</h4>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {paymentAbonos.map((abono, idx) => (
                        <div key={idx} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group">
                           <div>
                              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{abono.method.replace('_', ' ')}</p>
                              <p className="heading-racing text-2xl text-white italic">${abono.amountUSD.toFixed(2)}</p>
                           </div>
                           <button onClick={() => removeAbono(idx)} className="p-2 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                     ))}
                     {paymentAbonos.length === 0 && <div className="py-10 text-center text-zinc-700 font-bold uppercase tracking-widest text-[10px] italic">Esperando abonos...</div>}
                  </div>

                  <div className="space-y-4 pt-10 border-t border-white/10">
                     <div className="flex justify-between items-end">
                        <span className="heading-racing text-2xl text-zinc-500 italic">SALDO</span>
                        <span className={`heading-racing text-5xl italic ${saldoRestanteUSD > 0.05 ? 'text-red-500' : 'text-emerald-500'}`}>
                           ${saldoRestanteUSD.toFixed(2)}
                        </span>
                     </div>
                  </div>
                </div>

                <div className="pt-10">
                  <button
                    disabled={saldoRestanteUSD > 0.05 || processingPayment}
                    onClick={handleProcessPayment}
                    className="w-full py-7 bg-blue-500 hover:bg-blue-400 text-black font-black heading-racing text-4xl rounded-[2rem] shadow-2xl shadow-blue-500/30 transition-all disabled:opacity-20 active:scale-95"
                  >
                    {processingPayment ? <Loader2 className="animate-spin inline mr-2" /> : 'CONFIRMAR VENTA'}
                  </button>
                  <p className="text-[8px] text-zinc-600 font-black text-center mt-6 uppercase tracking-[0.2em]">Sincronización atómica con inventario y caja.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW CUSTOMER MODAL (Glass Case) */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !processingPayment && setShowCustomerModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-lg rounded-[3rem] border border-white/10 shadow-3xl relative overflow-hidden premium-border">
              <div className="p-10 border-b border-white/5 bg-white/5">
                <h3 className="heading-racing text-4xl text-white italic uppercase leading-none">NUEVO PILOTO</h3>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Ingreso Rápido a Pista</p>
              </div>
              <form onSubmit={handleCreateCustomer} className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre</label>
                    <input required type="text" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500/50" value={newCustomerData.first_name} onChange={e => setNewCustomerData({ ...newCustomerData, first_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Apellido</label>
                    <input required type="text" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500/50" value={newCustomerData.last_name} onChange={e => setNewCustomerData({ ...newCustomerData, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">WhatsApp / Contacto</label>
                  <input required type="text" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500/50" placeholder="0412..." value={newCustomerData.phone} onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })} />
                </div>
                <button type="submit" disabled={processingPayment} className="w-full py-5 bg-blue-500 hover:bg-blue-400 text-black font-black heading-racing text-3xl rounded-2xl shadow-xl transition-all disabled:opacity-50">
                  {processingPayment ? <Loader2 className="animate-spin" size={24} /> : 'REGISTRAR'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POS;
