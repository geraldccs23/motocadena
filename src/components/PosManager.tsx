import { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart, Plus, Search, Users,
  Trash2, CheckCircle2, ChevronRight, X, Minus,
  UserPlus, ArrowLeft
} from "lucide-react";
import { usePOS } from "../hooks/usePOS";
import { useProducts } from "../hooks/useProducts";
import { useServices } from "../hooks/useServices";
import { supabase } from "../lib/supabase";
import { ADMIN_BASE } from "../lib/api";
import { Client, Product, Service, WorkOrder, PosSale, PosItem, PosPayment } from "../types";
import Button from "./ui/Button";
import Card, { CardContent } from "./ui/Card";
import Badge from "./ui/Badge";
import Input from "./ui/Input";
import Modal from "./ui/Modal";

export default function PosManager() {
  const {
    currentSale, items, payments,
    createSale, addItem, updateItem, removeItem,
    addPayment, finalizeSale, voidSale, refreshSale
  } = usePOS();

  const { products } = useProducts();
  const { services } = useServices();

  // Local UI state
  const [view, setView] = useState<'catalog' | 'today' | 'client-selection'>('client-selection');
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<'products' | 'services' | 'orders'>('products');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientOrders, setClientOrders] = useState<WorkOrder[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  // Client Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    full_name: '',
    phone: '',
    vehicle_plate: '',
    vehicle_brand: '',
    vehicle_model: ''
  });

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState("cash_usd");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentBank, setPaymentBank] = useState("");

  // Hook states for Today
  const { todaySales } = usePOS();

  useEffect(() => {
    loadClients();
    loadRate();
    if (currentSale) {
      setView('catalog');
      if (currentSale.client_id) {
        loadOrders(currentSale.client_id);
      }
    }
  }, [currentSale]);

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('full_name');
    setClients((data || []) as Client[]);
  };

  const loadRate = async () => {
    try {
      // Try both potential endpoints
      const endpoints = [`${ADMIN_BASE}/admin/rate`, `${ADMIN_BASE}/admin/pos/rate`];
      let found = false;
      for (const url of endpoints) {
        const resp = await fetch(url, { headers: { 'X-Role': 'admin' } });
        if (resp.ok) {
          const json = await resp.json();
          setExchangeRate(Number(json.exchange_rate || 60));
          found = true;
          break;
        }
      }
      if (!found) setExchangeRate(60); // Hardcoded fallback
    } catch (e) {
      console.warn("Could not load exchange rate, using fallback");
      setExchangeRate(60);
    }
  };

  const loadOrders = async (cid: string) => {
    const { data } = await supabase
      .from('work_orders')
      .select('*')
      .eq('client_id', cid)
      .in('status', ['completed', 'in_progress'])
      .order('created_at', { ascending: false });
    setClientOrders((data || []) as WorkOrder[]);
  };

  // Filtered data
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.supplier_code || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter(s => s.name.toLowerCase().includes(q));
  }, [services, search]);

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    if (!q && view !== 'client-selection') return [];
    return clients.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [clients, search, view]);

  // Computed
  const totalPaid = useMemo(() => payments.reduce((acc: number, p: PosPayment) => acc + p.amount, 0), [payments]);
  const pendingAmount = useMemo(() => (currentSale?.total || 0) - totalPaid, [currentSale, totalPaid]);

  // Actions
  const handleStartSale = async (clientId?: string) => {
    const res = await createSale(clientId);
    if (res.success) {
      setView('catalog');
      if (clientId) loadOrders(clientId);
      setSearch("");
    } else {
      alert("Error al iniciar venta: " + res.error);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await (supabase.from('clients' as any) as any).insert([newClient]).select().single();
    if (error) {
      alert("Error al crear cliente: " + error.message);
    } else {
      const created = data as Client;
      setClients(prev => [...prev, created]);
      setIsClientModalOpen(false);
      setNewClient({ full_name: '', phone: '', vehicle_plate: '', vehicle_brand: '', vehicle_model: '' });
      handleStartSale(created.id);
    }
  };

  const handleAddProduct = async (p: Product) => {
    if (!currentSale) return alert("Haga clic en un cliente para iniciar la venta.");
    await addItem(currentSale.id, { product_id: p.id, quantity: 1, unit_price: p.unit_price });
  };

  const handleAddService = async (s: Service) => {
    if (!currentSale) return alert("Haga clic en un cliente para iniciar la venta.");
    await addItem(currentSale.id, { service_id: s.id, description: s.name, quantity: 1, unit_price: s.base_price });
  };

  const handleAddOrder = async (o: WorkOrder) => {
    if (!currentSale) return alert("Haga clic en un cliente para iniciar la venta.");
    await addItem(currentSale.id, { work_order_id: o.id, description: `Orden de Trabajo #${o.id.slice(0, 8)}`, quantity: 1, unit_price: o.total || 0 });
  };

  const handleProcessPayment = async () => {
    if (!currentSale) return;
    const bsMethods = ["cash_bs", "transfer_bs", "pos", "pagomovil_bs"];
    const currency = bsMethods.includes(paymentMethod) ? "VES" : "USD";

    const res = await addPayment(currentSale.id, {
      method: paymentMethod,
      amount: Number(paymentAmount),
      currency,
      bank: paymentBank || null
    });

    if (res.success) {
      setPaymentAmount("");
      setPaymentBank("");
    } else {
      alert("Error al procesar pago: " + res.error);
    }
  };

  const handleFinalize = async () => {
    if (!currentSale) return;
    if (Math.abs(pendingAmount) > 0.01) return alert("Debe completar el pago total");
    if (!confirm("¿Desea cerrar la venta? Esto actualizará el stock de productos.")) return;

    const res = await finalizeSale(currentSale.id);
    if (res.success) {
      alert("Venta finalizada exitosamente");
      setView('client-selection');
      setCategory('products');
      setSearch("");
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleOpenTodaySale = (saleId: string) => {
    refreshSale(saleId);
    setView('catalog');
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black heading-racing text-white uppercase italic tracking-tighter flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-amber-500" />
            Punto de Venta
          </h2>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Terminal de Salida & Inventario</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setView('client-selection')}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${view === 'client-selection' ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              INICIAR VENTA
            </button>
            <button
              onClick={() => setView('catalog')}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${view === 'catalog' ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-white'} ${!currentSale ? 'opacity-50 grayscale pointer-events-none' : ''}`}
            >
              VENTA {currentSale && <span className="ml-1 bg-white/20 px-1.5 rounded-full text-[8px]">{items.length}</span>}
            </button>
            <button
              onClick={() => setView('today')}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${view === 'today' ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              HOY
            </button>
          </div>
        </div>
      </div>

      {view === 'client-selection' ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full gap-8">
          <Card className="w-full border-zinc-800 bg-zinc-950/50 p-8">
            <CardContent className="space-y-8 p-0">
              <div className="text-center">
                <Users className="w-16 h-16 text-amber-500/20 mx-auto mb-4" />
                <h3 className="text-2xl font-black heading-racing text-white uppercase italic">Seleccionar Cliente</h3>
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mt-2">Para iniciar la cuenta, asigne un cliente</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  className="h-14 px-8 bg-zinc-800 hover:bg-zinc-700 gap-2 border border-zinc-700"
                  onClick={() => handleStartSale()}
                >
                  INVITADO
                </Button>
                <Button
                  className="h-14 px-8 bg-amber-600 hover:bg-amber-500 gap-2"
                  onClick={() => setIsClientModalOpen(true)}
                >
                  <UserPlus className="w-5 h-5" />
                  NUEVO
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[300px] overflow-y-auto scrollbar-thin pr-2">
                {filteredClients.map((c: Client) => (
                  <button
                    key={c.id}
                    onClick={() => handleStartSale(c.id)}
                    className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-left group transition-all"
                  >
                    <p className="text-white font-bold uppercase italic group-hover:text-amber-500 transition-colors">{c.full_name}</p>
                    <p className="text-[10px] text-zinc-500 tracking-widest mt-1">{c.phone || 'Sin teléfono'}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : view === 'today' ? (
        <div className="flex-1 overflow-auto scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(todaySales as PosSale[]).map(s => (
              <Card key={s.id} className={`border-zinc-800 bg-zinc-950/50 hover:border-amber-500/30 transition-all cursor-pointer group`} onClick={() => handleOpenTodaySale(s.id)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={s.status === 'paid' ? 'success' : s.status === 'void' ? 'danger' : 'warning'}>
                      {s.status.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">#{s.sale_number || s.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-white font-bold uppercase italic truncate mb-1">{s.client?.full_name || 'Cliente Ocasional'}</p>
                  <div className="flex justify-between items-end">
                    <p className="text-2xl font-black text-white">${s.total.toFixed(2)}</p>
                    <ChevronRight className="w-5 h-5 text-zinc-800 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-2">{new Date(s.created_at || '').toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left: Catalog */}
          <div className="flex-[1.5] flex flex-col gap-4">
            <Card className="border-zinc-800 bg-zinc-950/50 flex flex-col shrink-0">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 w-full md:w-auto overflow-x-auto">
                  <button
                    onClick={() => setCategory('products')}
                    className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${category === 'products' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    PRODUCTOS
                  </button>
                  <button
                    onClick={() => setCategory('services')}
                    className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${category === 'services' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    SERVICIOS
                  </button>
                  <button
                    onClick={() => setCategory('orders')}
                    className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${category === 'orders' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    ORDENES
                  </button>
                </div>
              </CardContent>
            </Card>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
              {category === 'products' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredProducts.map(p => (
                    <Card key={p.id} className="border-zinc-900 bg-zinc-950/30 hover:bg-zinc-900/40 hover:border-zinc-700 transition-all group overflow-hidden">
                      <CardContent className="p-4 flex flex-col h-full relative">
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{p.sku}</p>
                            <Badge variant={p.stock! > 0 ? 'success' : 'danger'}>{p.stock} UDS</Badge>
                          </div>
                          <h4 className="text-white font-bold uppercase italic text-sm line-clamp-2 leading-tight mb-2 group-hover:text-amber-500 transition-colors">{p.name}</h4>
                        </div>
                        <div className="flex items-end justify-between mt-4">
                          <div>
                            <p className="text-[9px] text-zinc-600 font-bold uppercase">Precio Unit.</p>
                            <p className="text-xl font-black text-white">${p.unit_price.toFixed(2)}</p>
                          </div>
                          <button
                            disabled={p.stock! <= 0}
                            onClick={() => handleAddProduct(p)}
                            className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center hover:bg-amber-500 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : category === 'services' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredServices.map(s => (
                    <Card key={s.id} className="border-zinc-900 bg-zinc-950/30 hover:bg-zinc-900/40 hover:border-zinc-700 transition-all group overflow-hidden">
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex-1">
                          <div className="mb-2">
                            <Badge variant="info">SERVICIO</Badge>
                          </div>
                          <h4 className="text-white font-bold uppercase italic text-sm leading-tight mb-2 group-hover:text-amber-500 transition-colors">{s.name}</h4>
                        </div>
                        <div className="flex items-end justify-between mt-4">
                          <div>
                            <p className="text-[9px] text-zinc-600 font-bold uppercase">Base</p>
                            <p className="text-xl font-black text-white">${s.base_price.toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => handleAddService(s)}
                            className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700 hover:scale-110 active:scale-95 transition-all"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <Card className="border-amber-500/20 bg-amber-500/5 mb-4">
                    <CardContent className="p-4 flex gap-4">
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">Cliente Actual</p>
                        <p className="text-white font-bold uppercase italic">
                          {currentSale?.client?.full_name || 'Invitado'}
                        </p>
                      </div>
                      {currentSale && (
                        <Button size="sm" onClick={() => setView('client-selection')}>CAMBIAR</Button>
                      )}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clientOrders.map(o => (
                      <Card key={o.id} className="border-zinc-900 bg-zinc-950/30 hover:bg-white/[0.02] transition-colors">
                        <CardContent className="p-4 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-bold text-white uppercase italic">Orden #{o.id.slice(0, 8)}</p>
                            <p className="text-[10px] text-zinc-500 tracking-widest uppercase mt-1">Total: ${o.total?.toFixed(2)}</p>
                          </div>
                          <Button size="sm" onClick={() => handleAddOrder(o)}>CARGAR</Button>
                        </CardContent>
                      </Card>
                    ))}
                    {clientOrders.length === 0 && (
                      <p className="p-10 text-center text-zinc-700 italic text-xs uppercase">No hay órdenes pendientes para este cliente</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart & Checkout */}
          <Card className="flex-1 border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden max-w-[450px]">
            <div className="p-6 border-b border-zinc-900 shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">VENTA #{currentSale?.sale_number || 'BORRADOR'}</p>
                  <h3 className="text-xl font-black heading-racing text-white uppercase italic">RESUMEN DE CUENTA</h3>
                </div>
                {currentSale && (
                  <button onClick={() => voidSale(currentSale.id)} className="text-red-500/50 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-0">
              {(items as PosItem[]).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-20">
                  <ShoppingCart className="w-16 h-16 text-zinc-500 mb-4" />
                  <p className="text-sm font-bold text-zinc-500 uppercase italic">El carrito está vacío</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-zinc-900">
                    {(items as PosItem[]).map(it => (
                      <tr key={it.id} className="group hover:bg-white/[0.01]">
                        <td className="p-4">
                          <p className="text-xs font-bold text-white uppercase italic leading-tight mb-0.5">{it.description}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{it.quantity} x ${(it.unit_price || 0).toFixed(2)}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => updateItem(currentSale!.id, it.id, { quantity: it.quantity - 1 })} className="p-1 rounded bg-zinc-900 text-zinc-500 hover:text-white" disabled={it.quantity <= 1}><Minus className="w-3 h-3" /></button>
                              <button onClick={() => updateItem(currentSale!.id, it.id, { quantity: it.quantity + 1 })} className="p-1 rounded bg-zinc-900 text-zinc-500 hover:text-white"><Plus className="w-3 h-3" /></button>
                              <button onClick={() => removeItem(currentSale!.id, it.id)} className="p-1 rounded bg-red-950 text-red-500 ml-1"><X className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right align-top">
                          <p className="text-sm font-black text-white tracking-tighter">${(it.subtotal || (it.quantity * it.unit_price) || 0).toFixed(2)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 bg-black/40 border-t border-zinc-900 shrink-0 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-zinc-500">
                  <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-bold">${(currentSale?.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-amber-500">
                  <span className="text-[10px] font-black uppercase tracking-widest">Equivalente Bs.</span>
                  <span className="text-sm font-black italic">Bs {((currentSale?.total || 0) * (currentSale?.exchange_rate || exchangeRate || 1)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-zinc-900 pt-3">
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">PAGADO</span>
                  <span className="text-lg font-black text-emerald-500">${totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">PENDIENTE</span>
                  <span className="text-2xl font-black text-white">${pendingAmount.toFixed(2)}</span>
                </div>
              </div>

              {pendingAmount > 0.01 && (
                <div className="space-y-4 pt-4 border-t border-zinc-900 animate-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-1">
                      <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Método</p>
                      <select
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white"
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                      >
                        <optgroup label="Divisas ($)">
                          <option value="cash_usd">EFECTIVO $</option>
                          <option value="zelle">ZELLE / PAYPAL</option>
                        </optgroup>
                        <optgroup label="Local (Bs)">
                          <option value="cash_bs">EFECTIVO BS</option>
                          <option value="pos">PUNTO / P. MOVIL</option>
                        </optgroup>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Monto</p>
                      <input
                        type="number"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white font-black"
                        value={paymentAmount}
                        placeholder={paymentMethod.includes('bs') ? 'Monto Bs' : 'Monto $'}
                        onChange={e => setPaymentAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleProcessPayment}
                    disabled={!paymentAmount || Number(paymentAmount) <= 0}
                    className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase italic tracking-widest text-[10px]"
                  >
                    REGISTRAR PAGO
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {(payments as PosPayment[]).map(p => (
                      <div key={p.id} className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded flex items-center gap-2 group">
                        <span className="text-[9px] font-black text-zinc-500 uppercase">{p.method.replace('_', ' ')}</span>
                        <span className="text-[10px] font-black text-white">${p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingAmount <= 0.01 && (items as PosItem[]).length > 0 && currentSale?.status === 'open' && (
                <div className="space-y-3 pt-4">
                  <Button
                    onClick={handleFinalize}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-black italic uppercase tracking-widest">FINALIZAR VENTA</span>
                  </Button>
                  <Button className="w-full gap-2 border border-zinc-700" onClick={() => setView('client-selection')}>
                    <ArrowLeft className="w-4 h-4" /> VOLVER
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Create Client Modal */}
      <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="REGISTRAR NUEVO CLIENTE">
        <form onSubmit={handleCreateClient} className="p-6 space-y-4">
          <Input
            label="Nombre Completo"
            required
            value={newClient.full_name}
            onChange={e => setNewClient(prev => ({ ...prev, full_name: e.target.value }))}
          />
          <Input
            label="Teléfono"
            required
            value={newClient.phone}
            onChange={e => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Placa de Vehículo"
              value={newClient.vehicle_plate}
              onChange={e => setNewClient(prev => ({ ...prev, vehicle_plate: e.target.value }))}
            />
            <Input
              label="Marca"
              value={newClient.vehicle_brand}
              onChange={e => setNewClient(prev => ({ ...prev, vehicle_brand: e.target.value }))}
            />
          </div>
          <Input
            label="Modelo de Vehículo"
            value={newClient.vehicle_model}
            onChange={e => setNewClient(prev => ({ ...prev, vehicle_model: e.target.value }))}
          />
          <div className="pt-4">
            <Button type="submit" className="w-full h-12 bg-amber-600 hover:bg-amber-500 font-black italic uppercase tracking-widest">
              CREAR E INICIAR VENTA
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
