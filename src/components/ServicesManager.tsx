import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, DollarSign, Search } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import { Service } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';
import Card, { CardContent } from './ui/Card';
import Badge from './ui/Badge';
import Modal from './ui/Modal';

const ServicesManager: React.FC = () => {
  const { services, loading, saveService, deleteService } = useServices();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    duration_minutes: '60'
  });
  const [isSaving, setIsSaving] = useState(false);

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        base_price: service.base_price.toString(),
        duration_minutes: service.duration_minutes?.toString() || '60'
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        base_price: '',
        duration_minutes: '60'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await saveService({
      name: formData.name,
      description: formData.description,
      base_price: parseFloat(formData.base_price),
      duration_minutes: parseInt(formData.duration_minutes)
    }, editingService?.id);

    if (result.success) {
      setIsModalOpen(false);
    } else {
      alert('Error al guardar: ' + (result as any).error);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
    const result = await deleteService(id);
    if (!result.success) {
      alert('Error al eliminar: ' + (result as any).error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="warning" className="mb-2">CATÁLOGO</Badge>
          <h2 className="text-4xl font-black heading-racing text-white tracking-tight">GESTIÓN DE SERVICIOS</h2>
          <p className="text-zinc-500 text-sm mt-1">Configura los servicios y precios de la mano de obra</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 h-12 px-6">
          <Plus className="w-5 h-5" />
          NUEVO SERVICIO
        </Button>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/20">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar servicios..."
              className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-amber-500 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse border-zinc-800 bg-zinc-900/50">
              <div className="w-full h-full" />
            </Card>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-zinc-800 bg-transparent">
          <div className="w-full">
            <p className="text-zinc-500">No se encontraron servicios</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card key={service.id} className="group hover:border-amber-500/50 transition-all">
              <CardContent className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h3 className="font-bold text-lg text-white group-hover:text-amber-500 transition-colors">
                    {service.name}
                  </h3>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(service)}
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-500/50 hover:text-red-500 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {service.description && (
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-6 flex-1 italic">
                    "{service.description}"
                  </p>
                )}

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span className="font-black text-white text-lg">${Number(service.base_price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    {service.duration_minutes} MIN
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'EDITAR SERVICIO' : 'NUEVO SERVICIO'}
      >
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <Input
            label="Nombre del Servicio *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400">Descripción</label>
            <textarea
              className="w-full h-24 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles sobre el servicio..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              step="0.01"
              label="Precio Base ($) *"
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              required
            />
            <Input
              type="number"
              label="Duración (min) *"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              required
            />
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="submit" className="flex-1 h-12" isLoading={isSaving}>
              {editingService ? 'ACTUALIZAR SERVICIO' : 'CREAR SERVICIO'}
            </Button>
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setIsModalOpen(false)}>
              CANCELAR
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ServicesManager;
