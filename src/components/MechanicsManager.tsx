import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Mechanic = Database['public']['Tables']['mechanics']['Row'];

export default function MechanicsManager() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [formData, setFormData] = useState<{ full_name: string; phone: string; email: string; status: 'active' | 'inactive'; }>({
    full_name: '',
    phone: '',
    email: '',
    status: 'active',
  });

  useEffect(() => {
    loadMechanics();
  }, []);

  const loadMechanics = async () => {
    try {
      const { data, error } = await supabase
        .from('mechanics')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMechanics(data || []);
    } catch (error) {
      console.error('Error loading mechanics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMechanic) {
        const { error } = await supabase
          .from('mechanics')
          .update(formData)
          .eq('id', editingMechanic.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mechanics')
          .insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      resetForm();
      loadMechanics();
    } catch (error) {
      console.error('Error saving mechanic:', error);
      alert('Error al guardar el mecánico');
    }
  };

  const handleEdit = (mechanic: Mechanic) => {
    setEditingMechanic(mechanic);
    setFormData({
      full_name: mechanic.full_name,
      phone: mechanic.phone || '',
      email: mechanic.email || '',
      status: mechanic.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este mecánico?')) return;
    try {
      const { error } = await supabase
        .from('mechanics')
        .delete()
        .eq('id', id);
      if (error) throw error;
      loadMechanics();
    } catch (error) {
      console.error('Error deleting mechanic:', error);
      alert('Error al eliminar el mecánico');
    }
  };

  const resetForm = () => {
    setFormData({ full_name: '', phone: '', email: '', status: 'active' });
    setEditingMechanic(null);
  };

  const filteredMechanics = mechanics.filter((m) =>
    (m.full_name && m.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.phone && m.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-bold heading-racing text-neutral-100 mb-2">MECÁNICOS</h2>
          <p className="text-neutral-400 text-racing">Gestión de personal mecánico/operadores</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-gold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          NUEVO MECÁNICO
        </button>
      </div>

      <div className="card-metal p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-metal w-full pl-12"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="card-metal p-12 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredMechanics.length === 0 ? (
        <div className="card-metal p-12 text-center">
          <p className="text-neutral-400">No se encontraron mecánicos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredMechanics.map((m) => (
            <div key={m.id} className="card-metal p-6 hover:brightness-110 transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-neutral-100 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-500" /> {m.full_name}
                  </h3>
                  {m.phone && (
                    <div className="flex items-center gap-2 text-neutral-400 mb-1">
                      <Phone className="w-4 h-4" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                  {m.email && (
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Mail className="w-4 h-4" />
                      <span>{m.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`px-3 py-1 rounded text-xs uppercase tracking-wide border ${m.status === 'active' ? 'bg-green-900/30 text-green-400 border-green-800/50' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700/50'}`}>
                    {m.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                  <button
                    onClick={() => handleEdit(m)}
                    className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-neutral-600">
                Registrado: {new Date(m.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card-metal p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold heading-racing text-neutral-100">
                {editingMechanic ? 'Editar Mecánico' : 'Nuevo Mecánico'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-200">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  className="input-metal w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="input-metal w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className="input-metal w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}
                  className="input-metal w-full"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-metal">Cancelar</button>
                <button type="submit" className="btn-gold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}