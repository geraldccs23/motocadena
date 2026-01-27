import { useState, useMemo } from 'react';
import { Truck, Search, Edit2, Trash2, Phone, Mail, UserPlus } from 'lucide-react';
import { useSuppliers } from '../hooks/useSuppliers';
import { Supplier } from '../types';
import Button from './ui/Button';
import Card, { CardContent } from './ui/Card';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Modal from './ui/Modal';

export default function SuppliersManager() {
  const { suppliers, loading, saveSupplier, deleteSupplier } = useSuppliers();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [isSaving, setIsSaving] = useState(false);

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        status: supplier.status || 'active'
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await saveSupplier(formData, editingSupplier?.id);
    if (result.success) {
      setIsModalOpen(false);
    } else {
      alert('Error al guardar: ' + result.error);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este proveedor?')) return;
    const result = await deleteSupplier(id);
    if (!result.success) {
      if (result.conflict) {
        if (confirm('Este proveedor tiene facturas asociadas. ¿Inactivar en su lugar?')) {
          await saveSupplier({ status: 'inactive' }, id);
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
          <Badge variant="warning" className="mb-2">ADMINISTRACIÓN</Badge>
          <h2 className="text-4xl font-black heading-racing text-white tracking-tight uppercase">Proveedores</h2>
          <p className="text-zinc-500 text-sm mt-1">Directorio de socios comerciales y fuentes de suministro</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 h-12 px-6">
          <UserPlus className="w-5 h-5" />
          NUEVO PROVEEDOR
        </Button>
      </div>

      {/* Quick Filter */}
      <Card className="border-zinc-800 bg-zinc-900/20">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o email..."
              className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-amber-500 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="overflow-hidden border-zinc-800 bg-zinc-950/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Proveedor</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Información de Contacto</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Estado</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="p-8"><div className="h-10 bg-zinc-900 rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-zinc-500">
                    <Truck className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No se encontraron proveedores
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-bold text-white uppercase italic group-hover:text-amber-500 transition-colors">{s.name}</p>
                      <p className="text-[10px] font-black text-zinc-500 tracking-widest mt-0.5">ID: {s.id?.slice(0, 8)}</p>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {s.phone && (
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Phone className="w-3 h-3 text-amber-500/50" />
                            {s.phone}
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Mail className="w-3 h-3 text-amber-500/50" />
                            {s.email}
                          </div>
                        )}
                        {!s.phone && !s.email && <span className="text-zinc-600 italic text-[10px]">Sin contacto</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      {s.status === 'active' ? (
                        <Badge variant="success">ACTIVO</Badge>
                      ) : (
                        <Badge variant="outline" className="opacity-50">INACTIVO</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(s)}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id!)}
                          className="p-1.5 rounded bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSupplier ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'}>
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <Input label="Nombre o Razón Social *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Teléfono / Contacto" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input type="email" label="Email Corporativo" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Estado</label>
            <select
              className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-lg px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-bold"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="active" className="text-black">ACTIVO</option>
              <option value="inactive" className="text-black">INACTIVO</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="flex-1 h-14 font-black tracking-widest" isLoading={isSaving}>
              {editingSupplier ? 'ACTUALIZAR DATOS' : 'CREAR PROVEEDOR'}
            </Button>
            <Button type="button" variant="outline" className="flex-1 h-14 font-black tracking-widest" onClick={() => setIsModalOpen(false)}>
              CANCELAR
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

