import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Search, AlertTriangle, ArrowUpDown, Loader2, X, ChevronRight, Archive, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Upload, CheckCircle2, Trash2, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product, MovementType } from '../types';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: number, total?: number, duplicates?: number, error?: string } | null>(null);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
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
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Cargar inventario y categorías en paralelo
      await Promise.all([
        fetchInventory(),
        fetchCategories(),
        fetchMetadata()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const { data: ws } = await supabase.from('workshops').select('id').limit(1).single();
      const { data: wh } = await supabase.from('warehouses').select('id').limit(1).single();

      if (ws) setWorkshopId(ws.id);
      if (wh) setWarehouseId(wh.id);
    } catch (err) {
      console.error("Error fetching metadata:", err);
    }
  };

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones básicas
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado pesada (máximo 5MB).');
      return;
    }

    setUploadingImage(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('Abortando subida por timeout (30s)');
      controller.abort();
    }, 30000);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      console.log('--- INICIO SUBIDA ---', { filePath, size: file.size });

      const { error: uploadError } = await supabase.storage
        .from('motocadena')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearTimeout(timeoutId);

      if (uploadError) {
        console.error('Error Supabase Upload:', uploadError);
        throw uploadError;
      }

      console.log('Descargando URL pública...');
      const { data: { publicUrl } } = supabase.storage
        .from('motocadena')
        .getPublicUrl(filePath);

      console.log('Subida exitosa. URL:', publicUrl);
      setProductForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      console.error('Error capturado en handleImageUpload:', err);
      if (err.name === 'AbortError') {
        alert('TIEMPO EXCEDIDO: La subida tardó demasiado (30s). Revisa tu conexión.');
      } else if (err.message === 'Bucket not found') {
        alert('ERROR: El bucket "motocadena" no existe. Ejecuta la migración 0047.');
      } else if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
        alert('ERROR DE CONEXIÓN: Se perdió la conexión con Supabase. Revisa tu internet.');
      } else {
        alert(`Error al subir imagen: ${err.message || 'Error de red'}`);
      }
    } finally {
      clearTimeout(timeoutId);
      console.log('--- FIN SUBIDA (Estado reseteado) ---');
      setUploadingImage(false);
      if (e.target) {
        e.target.value = '';
        console.log('Input de archivo reseteado.');
      }
    }
  };

  const fetchCategories = async (retries = 3) => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      if (retries > 0) {
        console.log(`Reintentando categorías... (${retries} intentos restantes)`);
        setTimeout(() => fetchCategories(retries - 1), 2000);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) throw new Error("El archivo CSV está vacío o mal formateado.");

        const headers = rows[0].split(',').map(h => h.trim().toLowerCase());

        const rawDataRows = rows.slice(1).map(row => {
          const values = row.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, i) => obj[header] = values[i]);
          return obj;
        });

        const { data: ws } = await supabase.from('workshops').select('id').limit(1).single();
        const { data: wh } = await supabase.from('warehouses').select('id').limit(1).single();
        if (!ws || !wh) throw new Error("Configuración base de MOTOCADENA no encontrada.");

        const uniqueRowsMap = new Map();
        rawDataRows.forEach(row => {
          const sku = (row.sku || '').trim().toUpperCase();
          if (sku) {
            const mappedRow = {
              sku: sku,
              name: row.name || row.producto || 'Sin Nombre',
              brand: row.brand || row.marca || '',
              category: row.category || row.categoria || '',
              price: parseFloat((row.unit_price || row.price || '0').replace(/[^0-9.]/g, '')),
              cost: parseFloat((row.cost || '0').replace(/[^0-9.]/g, '')) || (parseFloat((row.unit_price || row.price || '0').replace(/[^0-9.]/g, '')) * 0.7),
              min_stock: parseInt(row.min_stock || '5'),
              initial_stock: parseInt(row.stock || row.initial_stock || '0')
            };
            uniqueRowsMap.set(sku, mappedRow);
          }
        });

        const deduplicatedRows = Array.from(uniqueRowsMap.values());
        const duplicatesCount = rawDataRows.length - deduplicatedRows.length;

        const productBatch = deduplicatedRows.map(row => ({
          workshop_id: ws.id,
          sku: row.sku,
          name: row.name,
          brand: row.brand,
          category: row.category,
          cost: row.cost,
          price: row.price,
          min_stock: row.min_stock
        }));

        const { data: insertedProducts, error: pError } = await supabase
          .from('products')
          .upsert(productBatch, { onConflict: 'sku' })
          .select();

        if (pError) throw pError;

        const inventoryBatch = insertedProducts.map(p => {
          const originalRow = deduplicatedRows.find(dr => dr.sku === p.sku);
          return {
            product_id: p.id,
            warehouse_id: wh.id,
            stock: originalRow?.initial_stock || 0
          };
        });

        const { error: iError } = await supabase
          .from('inventory_levels')
          .upsert(inventoryBatch, { onConflict: 'product_id,warehouse_id' });

        if (iError) throw iError;

        setImportStatus({
          success: productBatch.length,
          total: rawDataRows.length,
          duplicates: duplicatesCount
        });
        fetchInventory();
      } catch (err: any) {
        console.error("Fallo Importación:", err);
        setImportStatus({ error: err.message });
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
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
        image_url: productForm.image_url,
        workshop_id: workshopId
      };

      console.log('Intentando guardar producto:', productData);

      let result;
      if (productForm.id) {
        console.log('Realizando UPDATE para ID:', productForm.id);
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', productForm.id)
          .select()
          .single();
      } else {
        console.log('Realizando UPSERT por SKU:', productData.sku);
        result = await supabase
          .from('products')
          .upsert([productData], { onConflict: 'sku' })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error de Supabase al guardar producto:', result.error);
        throw result.error;
      }

      console.log('Producto guardado con éxito:', result.data);

      const prodId = productForm.id || result.data.id;

      if (!productForm.id) {
        await supabase.from('inventory_levels').upsert([{
          product_id: prodId,
          warehouse_id: warehouseId,
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
    if (!confirm("¿Estás seguro de eliminar este repuesto?")) return;
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
      const { data: wh } = await supabase.from('warehouses').select('id').limit(1).single();
      const currentLevel = selectedProduct.inventory_levels?.[0];
      const qtyChange = movementForm.type === 'IN' ? movementForm.quantity : -movementForm.quantity;
      const newStock = (currentLevel?.stock || 0) + qtyChange;

      if (newStock < 0) throw new Error("Stock insuficiente.");

      await supabase.from('inventory_movements').insert([{
        product_id: selectedProduct.id,
        warehouse_id: wh?.id,
        type: movementForm.type,
        quantity: movementForm.quantity,
        notes: movementForm.notes
      }]);

      await supabase.from('inventory_levels').upsert({
        product_id: selectedProduct.id,
        warehouse_id: wh?.id,
        stock: newStock
      }, { onConflict: 'product_id,warehouse_id' });

      setShowMovementModal(false);
      setSelectedProduct(null);
      setMovementForm({ type: 'IN', quantity: 1, notes: '' });
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
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

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="heading-racing text-5xl text-zinc-100 text-glow-amber italic tracking-tighter">Almacén Central</h1>
          <p className="text-zinc-500 text-sm italic">"Sin repuestos no hay podio. Control total MOTOCADENA."</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-zinc-900 text-amber-500 border border-amber-500/20 px-6 py-4 rounded-2xl font-bold heading-racing text-xl hover:bg-amber-500/10 transition-all">
            <FileSpreadsheet size={20} /> Carga Masiva
          </button>
          <button onClick={() => { resetProductForm(); setShowProductModal(true); }} className="flex items-center gap-2 bg-amber-500 text-black px-8 py-4 rounded-2xl font-bold heading-racing text-2xl hover:bg-amber-400 shadow-[0_4px_30px_rgba(245,158,11,0.3)] transition-all">
            <Plus size={24} /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Archive size={64} className="text-amber-500" /></div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Catálogo Total</span>
          <p className="heading-racing text-5xl text-zinc-100">{products.length}</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><AlertTriangle size={64} className="text-red-500" /></div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Bajo Stock</span>
          <p className="heading-racing text-5xl text-red-500 text-glow-amber">{products.filter(p => getProductStock(p) <= p.min_stock).length}</p>
        </div>
        <div className="md:col-span-2 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={24} />
          <input
            type="text" placeholder="Buscar por SKU, Nombre..."
            className="w-full h-full bg-zinc-900/50 border border-zinc-800 rounded-3xl pl-16 pr-6 text-zinc-100 focus:border-amber-500/50 outline-none backdrop-blur-md transition-all text-lg"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-8 py-6 heading-racing text-zinc-500 text-sm uppercase">Producto / SKU</th>
                <th className="px-8 py-6 heading-racing text-zinc-500 text-sm uppercase text-center">Stock</th>
                <th className="px-8 py-6 heading-racing text-zinc-500 text-sm uppercase text-right">Precio Venta</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-amber-500" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-zinc-600 italic">No hay repuestos en inventario.</td></tr>
              ) : filtered.map((product) => {
                const stock = getProductStock(product);
                const isLow = stock <= product.min_stock;
                return (
                  <tr key={product.id} className="hover:bg-amber-500/[0.02] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl bg-zinc-950 border ${isLow ? 'border-red-500/30' : 'border-zinc-800'} flex items-center justify-center text-zinc-700 group-hover:text-amber-500 overflow-hidden`}>
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={28} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-zinc-100 font-bold text-lg leading-tight">{product.name}</div>
                            {product.is_ecommerce && (
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" title="Visible en eCommerce"></div>
                            )}
                          </div>
                          <div className="flex gap-3 items-center mt-1.5">
                            <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg text-zinc-500 font-black tracking-widest uppercase">{product.sku}</span>
                            <span className="text-[10px] text-amber-500 font-black italic uppercase tracking-tighter">{product.brand}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className={`inline-flex flex-col items-center p-3 rounded-2xl border ${isLow ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-zinc-950 border-zinc-800 text-zinc-100'}`}>
                        <span className="heading-racing text-3xl leading-none">{stock}</span>
                        <span className="text-[8px] font-black uppercase mt-1 opacity-60">unidades</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="heading-racing text-3xl text-amber-500 font-bold">${product.price.toFixed(2)}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setSelectedProduct(product); setShowMovementModal(true); }} className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 hover:text-amber-500 border border-zinc-800" title="Movimiento de Stock"><ArrowUpDown size={18} /></button>
                        <button onClick={() => openEditModal(product)} className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 hover:text-blue-500 border border-zinc-800" title="Editar"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 hover:text-red-500 border border-zinc-800" title="Eliminar"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CARGA MASIVA */}
      {showImportModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !submitting && setShowImportModal(false)} />
          <div className="glass-panel w-full max-w-xl rounded-[2.5rem] border border-white/10 relative z-10 animate-in zoom-in duration-300">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div><h3 className="heading-racing text-4xl text-zinc-100 italic">Pit Stop Import</h3><p className="text-[10px] uppercase font-black text-amber-500 tracking-widest">Detección automática de precios y stock</p></div>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X size={28} /></button>
            </div>
            <div className="p-8 space-y-6">
              {importStatus?.success !== undefined ? (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
                  <h4 className="heading-racing text-3xl text-zinc-100">Sincronización Completa</h4>
                  <p className="text-zinc-500 text-sm">Cargados: {importStatus.success} | Omitidos: {importStatus.duplicates}</p>
                  <button onClick={() => { setShowImportModal(false); setImportStatus(null); }} className="w-full py-4 bg-zinc-100 text-black rounded-2xl font-bold heading-racing text-2xl">VOLVER A PISTA</button>
                </div>
              ) : importStatus?.error ? (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                  <AlertTriangle size={32} className="text-red-500 mx-auto mb-2" />
                  <p className="text-red-400 text-sm">{importStatus.error}</p>
                  <button onClick={() => setImportStatus(null)} className="mt-4 text-[10px] uppercase font-black text-zinc-500">Reintentar</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 p-10 border-2 border-dashed border-zinc-800 rounded-[2rem] bg-zinc-950/50 group hover:border-amber-500/40 transition-all relative">
                  <Upload size={64} className="text-zinc-700 group-hover:text-amber-500 transition-all" />
                  <p className="heading-racing text-2xl text-zinc-400">Suelta tu CSV aquí</p>
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={submitting} />
                  {submitting && <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-20"><Loader2 className="w-12 h-12 animate-spin text-amber-500" /><span className="heading-racing text-xl text-amber-500">IMPORTANDO...</span></div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCTO (INSERT/UPDATE) */}
      {showProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !submitting && setShowProductModal(false)} />
          <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] border border-white/5 relative z-10 animate-in zoom-in duration-300 shadow-2xl">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <div><h3 className="heading-racing text-4xl text-zinc-100 italic">{productForm.id ? 'Editar' : 'Nuevo'} Repuesto</h3><p className="text-[10px] uppercase font-black text-amber-500 tracking-widest">Gestión de Catálogo Maestro</p></div>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X size={28} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Código SKU</label>
                  <input required type="text" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 outline-none" placeholder="MOT-SKU-001" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Categoría</label>
                  <input type="text" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 outline-none" placeholder="LUBRICANTES" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Nombre Comercial</label>
                <input required type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 outline-none" placeholder="Aceite Motul..." />
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Costo</label>
                  <input required type="number" step="0.01" value={productForm.cost} onChange={e => setProductForm({ ...productForm, cost: parseFloat(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Venta</label>
                  <input required type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: parseFloat(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-amber-500 font-bold outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Min. Stock</label>
                  <input required type="number" value={productForm.min_stock} onChange={e => setProductForm({ ...productForm, min_stock: parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 outline-none" />
                </div>
              </div>

              {/* eCommerce Section */}
              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-[1.5rem] space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="heading-racing text-xl text-zinc-400 italic">Opciones de eCommerce</h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={productForm.is_ecommerce} onChange={e => setProductForm({ ...productForm, is_ecommerce: e.target.checked })} className="hidden" />
                      <div className={`w-10 h-6 rounded-full p-1 transition-all ${productForm.is_ecommerce ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                        <div className={`w-4 h-4 bg-black rounded-full transition-all ${productForm.is_ecommerce ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-zinc-300">Tienda</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={productForm.is_featured} onChange={e => setProductForm({ ...productForm, is_featured: e.target.checked })} className="hidden" />
                      <div className={`w-10 h-6 rounded-full p-1 transition-all ${productForm.is_featured ? 'bg-blue-500' : 'bg-zinc-800'}`}>
                        <div className={`w-4 h-4 bg-black rounded-full transition-all ${productForm.is_featured ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-zinc-300">Destacado</span>
                    </label>
                  </div>
                </div>

                {productForm.is_ecommerce && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Categoría Web</label>
                        <select
                          value={productForm.category_id}
                          onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none text-sm"
                        >
                          <option value="">Seleccionar...</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Slug SEO</label>
                        <input type="text" value={productForm.slug} onChange={e => setProductForm({ ...productForm, slug: e.target.value.toLowerCase().replace(/ /g, '-') })} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none text-sm" placeholder="url-amigable-producto" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1 text-glow-amber">Imagen del Producto</label>
                      <div className="flex gap-4">
                        <div
                          onClick={() => imageInputRef.current?.click()}
                          className="w-24 h-24 rounded-2xl bg-zinc-950 border-2 border-dashed border-zinc-800 flex items-center justify-center cursor-pointer hover:border-amber-500/50 group transition-all overflow-hidden relative"
                        >
                          {uploadingImage ? (
                            <div className="flex flex-col items-center gap-1">
                              <Loader2 size={24} className="animate-spin text-amber-500" />
                              <span className="text-[8px] font-black uppercase text-amber-500">Pitting...</span>
                            </div>
                          ) : productForm.image_url ? (
                            <>
                              <img src={productForm.image_url} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload size={20} className="text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-zinc-600 group-hover:text-amber-500 transition-colors">
                              <Upload size={24} />
                              <span className="text-[8px] font-black uppercase text-center">SUBIR<br />FOTO</span>
                            </div>
                          )}
                          <input
                            type="file"
                            ref={imageInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[8px] uppercase font-black text-zinc-600 tracking-widest ml-1">URL Directa (Opcional)</label>
                          <input
                            type="text"
                            value={productForm.image_url}
                            onChange={e => setProductForm({ ...productForm, image_url: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none text-xs"
                            placeholder="https://..."
                          />
                          <p className="text-[9px] text-zinc-500 italic px-1">Se recomienda subir una imagen cuadrada (1:1) de alta calidad.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || uploadingImage}
                className="w-full py-6 bg-amber-500 text-black rounded-2xl font-bold heading-racing text-3xl hover:bg-amber-400 transition-all shadow-[0_15px_40px_rgba(245,158,11,0.25)] flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={32} className="animate-spin" /> : (
                  uploadingImage ? <><Loader2 size={32} className="animate-spin" /> ESPERA...</> : <>GUARDAR EN CATÁLOGO <ChevronRight size={32} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMIENTO DE INVENTARIO */}
      {showMovementModal && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !submitting && setShowMovementModal(false)} />
          <div className="glass-panel w-full max-w-lg rounded-[2.5rem] border border-white/5 relative z-10 animate-in slide-in-from-bottom-8 duration-300 shadow-2xl">
            <div className="p-8 border-b border-zinc-800 bg-zinc-900">
              <div className="flex justify-between items-start mb-4"><div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-amber-500"><ArrowUpDown size={32} /></div><button onClick={() => setShowMovementModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X size={24} /></button></div>
              <h3 className="heading-racing text-3xl text-zinc-100">Movimiento de Stock</h3>
              <p className="text-zinc-500 text-sm italic font-medium">{selectedProduct.name}</p>
            </div>
            <form onSubmit={handleRegisterMovement} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setMovementForm({ ...movementForm, type: 'IN' })} className={`py-5 rounded-2xl font-bold heading-racing text-xl flex items-center justify-center gap-3 transition-all border ${movementForm.type === 'IN' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}><ArrowUpRight size={20} /> ENTRADA</button>
                <button type="button" onClick={() => setMovementForm({ ...movementForm, type: 'OUT' })} className={`py-5 rounded-2xl font-bold heading-racing text-xl flex items-center justify-center gap-3 transition-all border ${movementForm.type === 'OUT' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}><ArrowDownRight size={20} /> SALIDA</button>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Cantidad</label><input required type="number" min="1" value={movementForm.quantity} onChange={e => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 text-2xl heading-racing outline-none" /></div>
              <div className="space-y-1.5"><label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Notas</label><textarea value={movementForm.notes} onChange={e => setMovementForm({ ...movementForm, notes: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 text-xs outline-none resize-none h-24" placeholder="Referencia de factura, etc..." /></div>
              <button type="submit" disabled={submitting} className="w-full py-5 bg-zinc-100 text-black rounded-2xl font-bold heading-racing text-2xl hover:bg-white transition-all flex items-center justify-center gap-3">{submitting ? <Loader2 size={24} className="animate-spin" /> : <>APLICAR MOVIMIENTO <ChevronRight size={24} /></>}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;