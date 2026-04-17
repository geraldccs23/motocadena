import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, Plus, Search, AlertTriangle, ArrowUpDown, Loader2, X, 
  ChevronRight, Archive, ArrowUpRight, ArrowDownRight, FileSpreadsheet, 
  Upload, CheckCircle2, Trash2, Edit, Activity, BarChart3, TrendingUp, Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product, MovementType, Category } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Inventory: React.FC = () => {
  const { profile } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: number, total?: number, duplicates?: number, error?: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [productForm, setProductForm] = useState({
    id: '',
    sku: '',
    name: '',
    brand: '',
    category: '',
    cost: 0,
    price: 0,
    min_stock: 5,
    is_ecommerce: false,
    is_featured: false,
    category_id: '',
    slug: '',
    image_url: ''
  });

  const [movementForm, setMovementForm] = useState({
    type: 'IN' as MovementType,
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`*, inventory_levels (*)`)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado pesada (máximo 5MB).');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const folderPath = productForm.id ? `products/${productForm.id}` : 'products/new';
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('motocadena')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('motocadena')
        .getPublicUrl(filePath);

      setProductForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      alert(`Error al subir imagen: ${err.message || 'Error desconocido'}`);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: wh } = await supabase.from('warehouses').select('id').limit(1).single();

      const productData: any = {
        sku: productForm.sku.trim().toUpperCase(),
        name: productForm.name,
        brand: productForm.brand,
        category: productForm.category,
        cost: productForm.cost,
        price: productForm.price,
        min_stock: productForm.min_stock,
        is_ecommerce: productForm.is_ecommerce,
        is_featured: productForm.is_featured,
        category_id: productForm.category_id || null,
        slug: productForm.slug || productForm.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        image_url: productForm.image_url
      };

      let result;
      if (productForm.id) {
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', productForm.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('products')
          .upsert([productData], { onConflict: 'sku' })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      const prodId = productForm.id || result.data.id;
      if (!productForm.id) {
        await supabase.from('inventory_levels').upsert([{
          product_id: prodId,
          warehouse_id: wh?.id,
          stock: 0
        }], { onConflict: 'product_id,warehouse_id' });
      }

      setShowProductModal(false);
      resetProductForm();
      fetchInventory();
    } catch (err: any) {
      alert(`ERROR: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este repuesto del catálogo maestro?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';

      const payload = {
        product_id: selectedProduct.id,
        movement_type: movementForm.type.toLowerCase(),
        quantity: movementForm.quantity,
        notes: movementForm.notes
      };

      const response = await fetch(`${backendUrl}/api/admin/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo en ajuste de stock');
      }

      setShowMovementModal(false);
      setSelectedProduct(null);
      setMovementForm({ type: 'IN', quantity: 1, notes: '' });
      fetchInventory();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      id: '', sku: '', name: '', brand: '', category: '', cost: 0, price: 0, min_stock: 5,
      is_ecommerce: false, is_featured: false, category_id: '', slug: '', image_url: ''
    });
  };

  const openEditModal = (p: Product) => {
    setProductForm({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand || '',
      category: p.category || '',
      cost: p.cost,
      price: p.price,
      min_stock: p.min_stock,
      is_ecommerce: p.is_ecommerce || false,
      is_featured: p.is_featured || false,
      category_id: p.category_id || '',
      slug: p.slug || '',
      image_url: p.image_url || ''
    });
    setShowProductModal(true);
  };

  const getProductStock = (p: Product) => p.inventory_levels?.[0]?.stock || 0;

  const totalAssets = products.reduce((acc, p) => acc + (p.cost * getProductStock(p)), 0);
  const lowStockCount = products.filter(p => getProductStock(p) <= p.min_stock).length;

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      {/* Header telemetry style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-0.5 w-20 bg-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 italic">Inventory Control</span>
          </div>
          <h1 className="heading-racing text-8xl text-white italic tracking-tighter leading-none">
            ALMACÉN <span className="text-zinc-600 text-glow-amber">MASTER</span>
          </h1>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowImportModal(true)} className="glass-card p-5 border border-white/5 hover:border-blue-500/30 text-zinc-600 hover:text-blue-500 transition-all group">
            <FileSpreadsheet size={28} className="group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={() => { resetProductForm(); setShowProductModal(true); }} className="glass-card px-10 py-5 bg-amber-500 hover:bg-amber-400 text-black border border-amber-600/50 shadow-xl shadow-amber-500/20 transition-all active:scale-95">
            <div className="flex items-center gap-4">
              <Plus size={32} />
              <span className="heading-racing text-4xl uppercase italic leading-none">Catalogar</span>
            </div>
          </button>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="glass-card p-10 premium-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Archive size={80} className="text-white" /></div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">SKUs Activos</span>
          <p className="heading-racing text-7xl text-white italic drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{products.length}</p>
        </div>
        <div className="glass-card p-10 premium-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><AlertTriangle size={80} className="text-red-500" /></div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1 italic">Alertas de Stock</span>
          <p className="heading-racing text-7xl text-red-500 italic drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">{lowStockCount}</p>
        </div>
        <div className="glass-card p-10 premium-border relative overflow-hidden group md:col-span-2">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={80} className="text-emerald-500" /></div>
           <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Valorización de Activos</span>
           <div className="flex items-baseline gap-4">
              <span className="heading-racing text-3xl text-emerald-500 italic">$</span>
              <p className="heading-racing text-7xl text-white italic drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
           </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-colors" size={28} />
        <input
          type="text"
          placeholder="Escanear catálogo por SKU o nombre..."
          className="w-full bg-zinc-950/50 border border-white/5 rounded-[2.5rem] py-8 pl-20 pr-10 text-2xl text-white font-black italic tracking-tight outline-none focus:border-amber-500/50 focus:bg-zinc-950 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-2xl placeholder:text-zinc-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Product List Table */}
      <div className="glass-card rounded-[3.5rem] overflow-hidden border border-white/5 premium-border shadow-3xl bg-zinc-950/30">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/60 border-b border-white/5">
                <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">REPRODUCTO / REFERENCIA</th>
                <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-center">NIVEL STOCK</th>
                <th className="px-12 py-10 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-right">PRECIO UNIT.</th>
                <th className="px-12 py-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                   <td colSpan={4} className="py-40 text-center">
                      <Loader2 className="w-20 h-20 animate-spin mx-auto text-amber-500/20 mb-6" />
                      <p className="heading-racing text-3xl text-zinc-700 uppercase italic tracking-widest animate-pulse">Escaneando Almacén...</p>
                   </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-zinc-600 italic">No se encontraron resultados en el cuadrante.</td></tr>
              ) : filtered.map((product) => {
                const stock = getProductStock(product);
                const isLow = stock <= product.min_stock;
                return (
                  <motion.tr 
                    key={product.id} 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    className="group"
                  >
                    <td className="px-12 py-10">
                      <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-2xl bg-black/60 border ${isLow ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/5'} flex items-center justify-center text-zinc-800 group-hover:text-amber-500 overflow-hidden shrink-0 transition-all`}>
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <Package size={32} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="text-white font-black text-3xl leading-none italic uppercase tracking-tighter group-hover:text-amber-500 transition-colors">{product.name}</div>
                            {product.is_ecommerce && (
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            )}
                          </div>
                          <div className="flex gap-4 items-center mt-2">
                             <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-zinc-500 font-black tracking-widest uppercase italic">{product.sku}</span>
                             <span className="text-[10px] text-amber-500/60 font-black italic uppercase tracking-widest">{product.brand || 'GENÉRICO'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-10 text-center">
                       <AnimatePresence mode="wait">
                          <motion.div key={stock} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`inline-flex flex-col items-center px-10 py-4 rounded-[2rem] border-2 ${isLow ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-black/40 border-white/5 text-white'}`}>
                            <span className="heading-racing text-5xl leading-none italic">{stock}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Units</span>
                          </motion.div>
                       </AnimatePresence>
                    </td>
                    <td className="px-12 py-10 text-right">
                       <div className="heading-racing text-5xl text-white italic tracking-tighter leading-none group-hover:text-amber-500 transition-all">
                          ${product.price.toFixed(2)}
                       </div>
                    </td>
                    <td className="px-12 py-10 text-right">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                          <button onClick={() => { setSelectedProduct(product); setShowMovementModal(true); }} className="p-4 bg-white/5 rounded-2xl text-zinc-500 hover:text-amber-500 border border-white/5 hover:border-amber-500/30 transition-all"><ArrowUpDown size={24} /></button>
                          <button onClick={() => openEditModal(product)} className="p-4 bg-white/5 rounded-2xl text-zinc-500 hover:text-blue-500 border border-white/5 hover:border-blue-500/30 transition-all"><Edit size={24} /></button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-4 bg-white/5 rounded-2xl text-zinc-500 hover:text-red-500 border border-white/5 hover:border-red-500/30 transition-all"><Trash2 size={24} /></button>
                       </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
         {showProductModal && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => !submitting && setShowProductModal(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card w-full max-w-3xl rounded-[3.5rem] border border-white/10 relative z-10 overflow-hidden premium-border shadow-3xl">
                 <div className="p-12 border-b border-white/5 bg-white/5">
                    <h3 className="heading-racing text-5xl text-white italic uppercase leading-none">{productForm.id ? 'EDITAR' : 'NUEVO'} COMPONENTE</h3>
                    <p className="text-[10px] font-black text-amber-500 tracking-widest mt-1 uppercase italic">Protocolo de Registro de Catálogo</p>
                 </div>
                 
                 <form onSubmit={handleSaveProduct} className="p-12 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Serial SKU / Part Number</label>
                          <input required type="text" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500/50 uppercase" placeholder="SKU-XXXX-XX" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Categoría Técnica</label>
                          <input type="text" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value.toUpperCase() })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-zinc-400 font-bold outline-none focus:border-amber-500/50 uppercase" placeholder="P.EJ. TRANSMISIÓN" />
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre Descriptivo</label>
                       <input required type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-amber-500/50" placeholder="Aceite Motul 7100 4T 10W40..." />
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Costo Neto</label>
                          <input required type="number" step="0.01" value={productForm.cost} onChange={e => setProductForm({ ...productForm, cost: parseFloat(e.target.value) })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1 italic">PVP Recomendado</label>
                          <input required type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: parseFloat(e.target.value) })} className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-amber-500 font-black text-xl outline-none" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Stock de Alerta</label>
                          <input required type="number" value={productForm.min_stock} onChange={e => setProductForm({ ...productForm, min_stock: parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none" />
                       </div>
                    </div>

                    {/* Meta eCommerce */}
                    <div className="p-8 bg-black/60 border border-white/5 rounded-[2.5rem] space-y-8">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <Layers className="text-blue-500" size={24} />
                             <h4 className="heading-racing text-2xl text-white italic uppercase tracking-tight">Capacidad Digital</h4>
                          </div>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={productForm.is_ecommerce} onChange={e => setProductForm({ ...productForm, is_ecommerce: e.target.checked })} className="hidden" />
                              <div className={`w-12 h-7 rounded-full p-1.5 transition-all ${productForm.is_ecommerce ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${productForm.is_ecommerce ? 'translate-x-5' : 'translate-x-0'}`} />
                              </div>
                              <span className="text-[10px] font-black text-zinc-500 uppercase">TIENDA</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                               <input type="checkbox" checked={productForm.is_featured} onChange={e => setProductForm({ ...productForm, is_featured: e.target.checked })} className="hidden" />
                               <div className={`w-12 h-7 rounded-full p-1.5 transition-all ${productForm.is_featured ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                                 <div className={`w-4 h-4 bg-white rounded-full transition-all ${productForm.is_featured ? 'translate-x-5' : 'translate-x-0'}`} />
                               </div>
                               <span className="text-[10px] font-black text-zinc-500 uppercase">PREMIUM</span>
                            </label>
                          </div>
                       </div>

                       {productForm.is_ecommerce && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4">
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <label className="text-[9px] font-black text-zinc-600 uppercase">Categoría Web Master</label>
                                  <select value={productForm.category_id} onChange={e => setProductForm({ ...productForm, category_id: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white font-bold outline-none text-xs">
                                     <option value="">Seleccionar canal...</option>
                                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[9px] font-black text-zinc-600 uppercase">Link Permanente (Slug)</label>
                                  <input type="text" value={productForm.slug} onChange={e => setProductForm({ ...productForm, slug: e.target.value.toLowerCase().replace(/ /g, '-') })} className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white font-bold outline-none text-xs" />
                               </div>
                            </div>
                            
                            <div className="flex flex-col">
                               <label className="text-[9px] font-black text-zinc-600 uppercase mb-2">Visual Pack (Imagen)</label>
                               <div className="flex gap-4 h-full">
                                  <div onClick={() => imageInputRef.current?.click()} className="group relative w-32 h-32 rounded-3xl bg-zinc-950 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer transition-all hover:border-amber-500 overflow-hidden">
                                     {uploadingImage ? (
                                        <Loader2 size={32} className="animate-spin text-amber-500" />
                                     ) : productForm.image_url ? (
                                        <>
                                          <img src={productForm.image_url} alt="Preview" className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="text-white" /></div>
                                        </>
                                     ) : (
                                        <Upload className="text-zinc-800 group-hover:text-amber-500 transition-colors" size={32} />
                                     )}
                                     <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                     <label className="text-[8px] font-black text-zinc-700 uppercase">URL Directa</label>
                                     <input type="text" value={productForm.image_url} onChange={e => setProductForm({ ...productForm, image_url: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-zinc-500 text-[10px] outline-none" placeholder="https://..." />
                                  </div>
                               </div>
                            </div>
                         </div>
                       )}
                    </div>

                    <button disabled={submitting} type="submit" className="w-full py-8 bg-amber-500 hover:bg-amber-400 text-black rounded-[2.5rem] font-black heading-racing text-5xl shadow-2xl transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-6 mt-8">
                       {submitting ? <Loader2 className="animate-spin" size={40} /> : <>SINCRONIZAR CATÁLOGO <ChevronRight size={40} /></>}
                    </button>
                 </form>
              </motion.div>
           </div>
         )}

         {showMovementModal && selectedProduct && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => !submitting && setShowMovementModal(false)} />
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="glass-card w-full max-w-xl rounded-[3rem] border border-white/10 relative z-10 overflow-hidden premium-border shadow-3xl">
                 <div className="p-10 border-b border-white/5 bg-white/5 flex justify-between items-start">
                    <div className="flex gap-6 items-center">
                       <div className="p-4 bg-zinc-950 border border-white/5 rounded-2xl text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                          <ArrowUpDown size={32} />
                       </div>
                       <div>
                          <h3 className="heading-racing text-4xl text-white italic tracking-tight uppercase leading-none">Ajuste de Stock</h3>
                          <p className="text-zinc-500 text-sm italic font-bold uppercase mt-1 tracking-tighter">{selectedProduct.name}</p>
                       </div>
                    </div>
                    <button onClick={() => setShowMovementModal(false)} className="p-3 text-zinc-600 hover:text-white transition-colors"><X size={32} /></button>
                 </div>
                 
                 <form onSubmit={handleRegisterMovement} className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                       <button type="button" onClick={() => setMovementForm({ ...movementForm, type: 'IN' })} className={`py-6 rounded-2xl font-black heading-racing text-3xl flex items-center justify-center gap-4 transition-all border-2 ${movementForm.type === 'IN' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-black/60 border-white/5 text-zinc-800'}`}>
                          <ArrowUpRight size={28} /> IN
                       </button>
                       <button type="button" onClick={() => setMovementForm({ ...movementForm, type: 'OUT' })} className={`py-6 rounded-2xl font-black heading-racing text-3xl flex items-center justify-center gap-4 transition-all border-2 ${movementForm.type === 'OUT' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-black/60 border-white/5 text-zinc-800'}`}>
                          <ArrowDownRight size={28} /> OUT
                       </button>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Amplitud del Ajuste (Cantidad)</label>
                       <input required type="number" min="1" value={movementForm.quantity} onChange={e => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-6 text-white text-5xl font-black heading-racing outline-none text-center italic" />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Bitácora del Ajuste (Notas)</label>
                       <textarea value={movementForm.notes} onChange={e => setMovementForm({ ...movementForm, notes: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-5 text-zinc-300 text-sm font-bold outline-none h-24 italic" placeholder="Motivo del movimiento..." />
                    </div>

                    <button disabled={submitting} type="submit" className="w-full py-8 bg-white hover:bg-zinc-100 text-black rounded-[2.5rem] font-black heading-racing text-5xl shadow-2xl transition-all disabled:opacity-20 flex items-center justify-center gap-6">
                       {submitting ? <Loader2 className="animate-spin" size={32} /> : <>PROCESAR AJUSTE <ChevronRight size={40} /></>}
                    </button>
                 </form>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;