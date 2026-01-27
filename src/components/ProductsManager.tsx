import { useState, useMemo, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Search, Tag, Minus } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../types';
import { getCurrentUser } from '../lib/auth';
import Button from './ui/Button';
import Input from './ui/Input';
import Card, { CardContent } from './ui/Card';
import Badge from './ui/Badge';
import Modal from './ui/Modal';

const ProductsManager: React.FC = () => {
  const { products, loading, saveProduct, deleteProduct, adjustStock } = useProducts();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    brand: '',
    unit_price: '',
    unit_cost: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    getCurrentUser().then(user => setUserRole(user?.role || ''));
  }, []);

  const isUserAdmin = userRole === 'admin';

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.oem_code?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        brand: product.brand || '',
        unit_price: product.unit_price.toString(),
        unit_cost: product.unit_cost.toString(),
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: '',
        name: '',
        description: '',
        brand: '',
        unit_price: '',
        unit_cost: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleQuickStock = async (id: string, type: 'in' | 'out') => {
    const amount = prompt(`Ingrese la cantidad a ${type === 'in' ? 'Cargar (+)' : 'Descargar (-)'}:`, '1');
    if (!amount) return;
    const qty = parseFloat(amount);
    if (isNaN(qty) || qty <= 0) return alert('Cantidad inválida');

    const res = await adjustStock(id, type, qty);
    if (!res.success) alert('Error: ' + res.error);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await saveProduct({
      sku: formData.sku,
      name: formData.name,
      description: formData.description,
      brand: formData.brand,
      unit_price: parseFloat(formData.unit_price),
      unit_cost: parseFloat(formData.unit_cost),
    }, editingProduct?.id);

    if (result.success) {
      setIsModalOpen(false);
    } else {
      alert('Error al guardar: ' + result.error);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!isUserAdmin) return alert('Solo administradores pueden eliminar');
    if (!confirm('¿Seguro que desea eliminar?')) return;
    const result = await deleteProduct(id);
    if (!result.success) {
      if (result.conflict) {
        if (confirm('Producto con registros. ¿Inactivar en su lugar?')) {
          await saveProduct({ status: 'inactive' }, id);
        }
      } else {
        alert('Error al eliminar: ' + result.error);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="warning" className="mb-2">CATÁLOGO Y EXISTENCIAS</Badge>
          <h2 className="text-4xl font-black heading-racing text-white tracking-tight uppercase">Control de Stock</h2>
          <p className="text-zinc-500 text-sm mt-1">Suma física total y gestión de repuestos en tiempo real</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 h-12 px-6">
          <Plus className="w-5 h-5" />
          NUEVO PRODUCTO
        </Button>
      </div>

      {/* Resumen de Existencias */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Stock Total (Unidades)</p>
              <p className="text-3xl font-black text-white">
                {products.reduce((acc, p) => acc + (p.stock || 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Tipos de Productos</p>
              <p className="text-xl font-black text-white">{filteredProducts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <Minus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Stock Crítico (≤ 2)</p>
              <p className="text-xl font-black text-white">
                {products.filter(p => (p.stock || 0) <= 2 && (p.stock || 0) > 0).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Valor de Almacén</p>
              <p className="text-xl font-black text-white">
                ${products.reduce((acc, p) => acc + ((p.stock || 0) * (p.unit_cost || 0)), 0).toFixed(0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter & Search */}
      <Card className="border-zinc-800 bg-zinc-900/20">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o marca..."
              className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-amber-500 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Table */}
      <Card className="overflow-hidden border-zinc-800 bg-zinc-950/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Producto / SKU</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Disponible</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Precio</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Stock</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-8"><div className="h-10 bg-zinc-900 rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-zinc-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stock = p.stock ?? 0;
                  return (
                    <tr key={p.id} className="group hover:bg-white/[0.01] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase italic group-hover:text-amber-500 transition-colors">{p.name}</p>
                            <p className="text-[10px] font-black text-zinc-500 tracking-widest">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <div className={`px-3 py-1 rounded-md border font-black text-sm heading-racing ${stock === 0 ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                            stock <= 2 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                              'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            }`}>
                            {stock}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-sm font-black text-white">${Number(p.unit_price).toFixed(2)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleQuickStock(p.id!, 'in')}
                            className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center transition-colors shadow-sm border border-emerald-500/10"
                            title="Cargar Stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleQuickStock(p.id!, 'out')}
                            className="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors shadow-sm border border-red-500/10"
                            title="Descargar Stock"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenModal(p)}
                            className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isUserAdmin && (
                            <button
                              onClick={() => handleDelete(p.id!)}
                              className="p-1.5 rounded bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}>
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nombre del Producto *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="SKU / Código *" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Descripción</label>
            <textarea
              className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Marca" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
            <Input type="number" step="0.01" label="Costo ($)" value={formData.unit_cost} onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })} required />
            <Input type="number" step="0.01" label="Precio Venta ($)" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} required />
          </div>
          <div className="flex gap-4 pt-6">
            <Button type="submit" className="flex-1 h-12" isLoading={isSaving}>{editingProduct ? 'ACTUALIZAR' : 'CREAR'}</Button>
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setIsModalOpen(false)}>CANCELAR</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductsManager;
