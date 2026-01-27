import { useState, useMemo, useEffect } from "react";
import {
  Receipt, Plus, FileText, CheckCircle2, Trash2, Search, ArrowLeft,
  Truck, ChevronRight, ShoppingCart,
  Edit2,
  X
} from "lucide-react";
import { usePurchases } from "../hooks/usePurchases";
import { useProducts } from "../hooks/useProducts";
import { useSuppliers } from "../hooks/useSuppliers";
import { PurchaseInvoice, PurchaseItem, Product } from "../types";
import Button from "./ui/Button";
import Card, { CardContent } from "./ui/Card";
import Badge from "./ui/Badge";
import Input from "./ui/Input";

export default function PurchasesManager() {
  const {
    purchases, loading, createPurchase, deletePurchase, getPurchaseDetails,
    addItem, updateItem, removeItem, receivePurchase, refresh
  } = usePurchases();

  const { products } = useProducts();
  const { suppliers } = useSuppliers();

  // Master list state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // UI state
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseInvoice | null>(null);
  const [selectedItems, setSelectedItems] = useState<PurchaseItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form state
  const [newDocType, setNewDocType] = useState<"invoice" | "delivery_note">("invoice");
  const [newDocNumber, setNewDocNumber] = useState("");
  const [newDocControl, setNewDocControl] = useState("");
  const [newDocDate, setNewDocDate] = useState("");

  const filteredPurchases = useMemo(() => {
    const q = search.toLowerCase();
    return (purchases || []).filter(p => {
      const matchesSearch =
        (p.purchase_number || "").toLowerCase().includes(q) ||
        (p.supplier?.name || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchases, search, statusFilter]);

  const handleOpenDetail = async (p: PurchaseInvoice) => {
    setIsLoadingDetails(true);
    setView('detail');
    const res = await getPurchaseDetails(p.id);
    if (res.success) {
      setSelectedPurchase(res.invoice);
      setSelectedItems(res.items);
    } else {
      alert("Error al cargar detalles: " + res.error);
      setView('list');
    }
    setIsLoadingDetails(false);
  };

  const handleCreate = async (supplierId: string) => {
    const res = await createPurchase(supplierId);
    if (res.success) {
      handleOpenDetail(res.purchase);
    } else {
      alert("Error al crear orden: " + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que desea eliminar esta orden de compra?")) return;
    const res = await deletePurchase(id);
    if (!res.success) alert("Error: " + res.error);
  };

  const handleReceive = async () => {
    if (!selectedPurchase) return;
    if (!confirm("¿Confirmar recepción? Se actualizará el stock automáticamente.")) return;

    const docs = {
      document_type: newDocType,
      invoice_number: newDocNumber,
      control_number: newDocControl,
      document_date: newDocDate
    };

    const res = await receivePurchase(selectedPurchase.id, docs);
    if (res.success) {
      alert("Compra recibida exitosamente. El stock ha sido actualizado.");
      handleOpenDetail(selectedPurchase); // Reload details to see status change
    } else {
      alert("Error al recibir: " + res.error);
    }
  };

  if (view === 'detail' && selectedPurchase) {
    return (
      <PurchaseDetail
        purchase={selectedPurchase}
        items={selectedItems}
        products={products}
        onBack={() => { setView('list'); refresh(); }}
        onAddItem={(pid, q, c) => addItem(selectedPurchase.id, { product_id: pid, quantity: q, unit_cost: c }).then(r => { if (r.success) handleOpenDetail(selectedPurchase); })}
        onRemoveItem={(itid) => removeItem(selectedPurchase.id, itid).then(r => { if (r.success) handleOpenDetail(selectedPurchase); })}
        onUpdateItem={(itid, q, c) => updateItem(selectedPurchase.id, itid, { quantity: q, unit_cost: c }).then(r => { if (r.success) handleOpenDetail(selectedPurchase); })}
        onReceive={handleReceive}
        docState={{
          type: newDocType, setType: setNewDocType,
          num: newDocNumber, setNum: setNewDocNumber,
          ctrl: newDocControl, setCtrl: setNewDocControl,
          date: newDocDate, setDate: setNewDocDate
        }}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="info" className="mb-2">ABASTECIMIENTO</Badge>
          <h2 className="text-4xl font-black heading-racing text-white tracking-tight uppercase">Compras e Insumos</h2>
          <p className="text-zinc-500 text-sm mt-1">Gestión de facturas de proveedores y reposición de stock</p>
        </div>
        <Button onClick={() => setView('create')} className="gap-2 h-12 px-6">
          <ShoppingCart className="w-5 h-5" />
          NUEVA ORDEN
        </Button>
      </div>

      {view === 'create' ? (
        <Card className="border-amber-500/20 bg-amber-500/5 animate-in zoom-in-95 duration-300">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                SELECCIONAR PROVEEDOR PARA NUEVA ORDEN
              </h3>
              <button onClick={() => setView('list')} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.filter(s => s.status === 'active').map(s => (
                <button
                  key={s.id}
                  onClick={() => handleCreate(s.id!)}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800 transition-all text-left group"
                >
                  <p className="font-bold text-white group-hover:text-amber-500 transition-colors uppercase italic">{s.name}</p>
                  <p className="text-[10px] text-zinc-500 tracking-widest mt-1">{s.phone || 'Sin teléfono'}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-zinc-800 bg-zinc-900/20">
          <CardContent className="p-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por número de orden o proveedor..."
                className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-amber-500 transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:border-amber-500 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">SISTEMA: TODOS</option>
              <option value="open">ABIERTAS (ORDEN)</option>
              <option value="received">RECIBIDAS (STOCK)</option>
              <option value="cancelled">CANCELADAS</option>
            </select>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Monto Total</p>
              <p className="text-2xl font-black text-white">
                ${filteredPurchases.reduce((acc: number, p: any) => acc + (p.total || 0), 0).toLocaleString()}
              </p>
            </div>
            <Receipt className="w-8 h-8 text-amber-500/20" />
          </CardContent>
        </Card>
      </div>

      {/* List Table */}
      <Card className="overflow-hidden border-zinc-800 bg-zinc-950/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Documento</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Proveedor</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Total</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Estado</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-8"><div className="h-10 bg-zinc-900 rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-zinc-500">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No se encontraron registros de compra
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="p-4 cursor-pointer" onClick={() => handleOpenDetail(p)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${p.status === 'received' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                            p.status === 'cancelled' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                              'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase italic group-hover:text-amber-500 transition-colors">
                            #{p.purchase_number || p.id.slice(0, 8)}
                          </p>
                          <p className="text-[10px] font-black text-zinc-500 tracking-widest mt-0.5">
                            {new Date(p.created_at!).toLocaleDateString('es-VE')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400 font-bold uppercase text-xs italic">
                      {p.supplier?.name || 'Proveedor Desconocido'}
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-sm font-black text-white">${p.total?.toFixed(2)}</p>
                    </td>
                    <td className="p-4 text-center">
                      {p.status === 'received' ? (
                        <Badge variant="success">RECIBIDA</Badge>
                      ) : p.status === 'cancelled' ? (
                        <Badge variant="danger">CANCELADA</Badge>
                      ) : (
                        <Badge variant="warning">ORDEN ABIERTA</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenDetail(p)}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {p.status === 'open' && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

interface PurchaseDetailProps {
  purchase: PurchaseInvoice;
  items: PurchaseItem[];
  products: Product[];
  onBack: () => void;
  onAddItem: (productId: string, qty: number, cost: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, qty: number, cost: number) => void;
  onReceive: () => void;
  docState: any;
}

function PurchaseDetail({
  purchase, items, products, onBack,
  onAddItem, onRemoveItem, onUpdateItem, onReceive,
  docState
}: PurchaseDetailProps) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);

  // Editing item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editCost, setEditCost] = useState(0);

  useEffect(() => {
    const p = products.find(x => x.id === selectedProduct);
    if (p) setCost(p.unit_cost || 0);
  }, [selectedProduct, products]);

  const total = useMemo(() => items.reduce((acc, it) => acc + (it.subtotal || 0), 0), [items]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">VOLVER AL LISTADO</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <Card className="lg:col-span-1 border-zinc-800 bg-zinc-950">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant={purchase.status === 'received' ? 'success' : 'warning'}>
                  {purchase.status.toUpperCase()}
                </Badge>
                <h3 className="text-2xl font-black heading-racing text-white mt-2">ORDEN #{purchase.purchase_number || purchase.id.slice(0, 8)}</h3>
              </div>
              <Receipt className="w-10 h-10 text-zinc-800" />
            </div>

            <div className="space-y-4 border-t border-zinc-900 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Proveedor</span>
                <span className="text-sm font-bold text-amber-500 uppercase italic">{purchase.supplier?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Fecha Creación</span>
                <span className="text-sm text-zinc-300">{new Date(purchase.created_at!).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] font-black text-zinc-400 uppercase">Monto Total</span>
                <span className="text-2xl font-black text-white">${total.toFixed(2)}</span>
              </div>
            </div>

            {purchase.status === 'open' ? (
              <div className="space-y-4 border-t border-zinc-900 pt-6">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">RECEPCIÓN DE MERCANCÍA</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-500 uppercase">Documento</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                      value={docState.type}
                      onChange={e => docState.setType(e.target.value)}
                    >
                      <option value="invoice">FACTURA COMERCIAL</option>
                      <option value="delivery_note">NOTA DE ENTREGA</option>
                    </select>
                  </div>
                  <Input label="Nº de Factura/Nota" value={docState.num} onChange={e => docState.setNum(e.target.value)} />
                  <Input label="Nº de Control" value={docState.ctrl} onChange={e => docState.setCtrl(e.target.value)} />
                  <Input type="date" label="Fecha Documento" value={docState.date} onChange={e => docState.setDate(e.target.value)} />

                  <Button
                    onClick={onReceive}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                    disabled={items.length === 0}
                  >
                    RECIBIR Y CARGAR STOCK
                  </Button>
                  {items.length === 0 && (
                    <p className="text-[9px] text-zinc-600 text-center italic">Debe agregar items antes de recibir</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">MERCANCÍA RECIBIDA</span>
                </div>
                <p className="text-zinc-500 text-[10px]">
                  {purchase.document_type === 'invoice' ? 'Factura' : 'Nota'} #{purchase.invoice_number} del {purchase.document_date}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card className="lg:col-span-2 border-zinc-800 bg-zinc-950/50">
          <CardContent className="p-0">
            {purchase.status === 'open' && (
              <div className="p-6 bg-zinc-900/50 border-b border-zinc-800">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">AGREGAR REPUESTOS / PRODUCTOS</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <select
                      className="w-full h-11 bg-black border border-zinc-800 rounded-lg px-4 text-xs text-white focus:border-amber-500 outline-none"
                      value={selectedProduct}
                      onChange={e => setSelectedProduct(e.target.value)}
                    >
                      <option value="">Buscar producto...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.sku} | {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    type="number"
                    label="Cantidad"
                    className="h-11"
                    value={qty}
                    onChange={e => setQty(Number(e.target.value))}
                  />
                  <div className="flex items-end">
                    <Button
                      className="w-full h-11"
                      disabled={!selectedProduct || qty <= 0}
                      onClick={() => {
                        onAddItem(selectedProduct, qty, cost);
                        setSelectedProduct("");
                        setQty(1);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/20 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-900">
                    <th className="p-4">Producto</th>
                    <th className="p-4 text-right">Cant.</th>
                    <th className="p-4 text-right">Costo Unit.</th>
                    <th className="p-4 text-right">Subtotal</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {items.map(it => {
                    const p = products.find(prod => prod.id === it.product_id);
                    const isEditing = editingItemId === it.id;

                    return (
                      <tr key={it.id} className="group hover:bg-white/[0.01]">
                        <td className="p-4">
                          <p className="text-xs font-bold text-white uppercase italic">{p?.name || '---'}</p>
                          <p className="text-[9px] font-black text-zinc-600 tracking-widest">{p?.sku || '---'}</p>
                        </td>
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              className="w-16 bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white text-right"
                              value={editQty}
                              onChange={e => setEditQty(Number(e.target.value))}
                            />
                          ) : (
                            <span className="text-xs text-zinc-400 font-bold">{it.quantity}</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              className="w-24 bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white text-right"
                              value={editCost}
                              onChange={e => setEditCost(Number(e.target.value))}
                            />
                          ) : (
                            <span className="text-xs text-zinc-500">${it.unit_cost.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-black text-white">${it.subtotal.toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-right">
                          {purchase.status === 'open' && (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => {
                                      onUpdateItem(it.id, editQty, editCost);
                                      setEditingItemId(null);
                                    }}
                                    className="p-1 rounded bg-emerald-500/20 text-emerald-500"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingItemId(null)}
                                    className="p-1 rounded bg-zinc-800 text-zinc-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingItemId(it.id);
                                      setEditQty(it.quantity);
                                      setEditCost(it.unit_cost);
                                    }}
                                    className="p-1 rounded bg-zinc-800 text-zinc-500 hover:text-white"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => onRemoveItem(it.id)}
                                    className="p-1 rounded bg-red-500/10 text-red-500/50 hover:text-red-500"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-zinc-700 italic text-xs">
                        Seleccione productos en el panel superior para comenzar la orden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
