import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Bike, PlusCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];

export default function ClientsManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    vehicle_plate: '',
    vehicle_brand: '',
    vehicle_model: ''
  });
  const [vehiclesByClient, setVehiclesByClient] = useState<Record<string, Vehicle[]>>({});
  const [newVehicle, setNewVehicle] = useState<{ plate: string; brand: string; model: string }>({ plate: '', brand: '', model: '' });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
      const ids = (data || []).map((c) => c.id);
      if (ids.length) {
        const { data: vdata, error: verr } = await supabase
          .from('vehicles')
          .select('*')
          .in('client_id', ids)
          .order('created_at', { ascending: false });
        if (!verr) {
          const map: Record<string, Vehicle[]> = {};
          (vdata || []).forEach((v) => {
            map[v.client_id] = map[v.client_id] || [];
            map[v.client_id].push(v as Vehicle);
          });
          setVehiclesByClient(map);
        }
      } else {
        setVehiclesByClient({});
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', editingClient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error al guardar el cliente');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name,
      phone: client.phone,
      vehicle_plate: client.vehicle_plate || '',
      vehicle_brand: client.vehicle_brand || '',
      vehicle_model: client.vehicle_model || ''
    });
    setNewVehicle({ plate: '', brand: '', model: '' });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      vehicle_plate: '',
      vehicle_brand: '',
      vehicle_model: ''
    });
    setEditingClient(null);
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.vehicle_plate && client.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
    ((vehiclesByClient[client.id] || []).some((v) =>
      (v.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.model || '').toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-bold heading-racing text-neutral-100 mb-2">CLIENTES</h2>
          <p className="text-neutral-400 text-racing">Gestión de clientes del taller</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-gold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          NUEVO CLIENTE
        </button>
      </div>

      <div className="card-metal p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o placa..."
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
      ) : filteredClients.length === 0 ? (
        <div className="card-metal p-12 text-center">
          <p className="text-neutral-400">No se encontraron clientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="card-metal p-6 hover:brightness-110 transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-neutral-100 mb-2">{client.full_name}</h3>
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                  {client.vehicle_brand && (
                    <div className="flex items-center gap-2 text-amber-400">
                      <Bike className="w-4 h-4" />
                      <span>{client.vehicle_brand} {client.vehicle_model}</span>
                      {client.vehicle_plate && <span className="text-neutral-500">• {client.vehicle_plate}</span>}
                    </div>
                  )}
                  {!!(vehiclesByClient[client.id]?.length) && (
                    <div className="mt-3">
                      <div className="text-neutral-400 text-sm mb-1">Vehículos ({vehiclesByClient[client.id].length})</div>
                      <div className="flex flex-wrap gap-2">
                        {vehiclesByClient[client.id].map((v) => (
                          <div key={v.id} className="px-2 py-1 bg-neutral-900/50 rounded text-xs text-neutral-300 border border-neutral-800">
                            <span className="text-amber-300">{v.plate || '—'}</span>
                            <span className="ml-2">{v.brand || 'Marca'}</span>
                            <span className="ml-1 text-neutral-500">{v.model || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-neutral-600">
                Registrado: {new Date(client.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card-metal p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <h3 className="text-2xl font-bold heading-racing text-neutral-100 mb-6">
              {editingClient ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-metal w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-metal w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Placa
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_plate}
                    onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                    className="input-metal w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_brand}
                    onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
                    className="input-metal w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    className="input-metal w-full"
                  />
                </div>
              </div>

              {editingClient && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-neutral-100">Vehículos del cliente</h4>
                    <div className="text-xs text-neutral-500">Se cargan desde la tabla <code>vehicles</code></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(vehiclesByClient[editingClient.id] || []).map((v) => (
                        <div key={v.id} className="flex items-center gap-2 px-2 py-1 bg-neutral-900/40 rounded border border-neutral-800">
                          <Bike className="w-3 h-3 text-amber-300" />
                          <span className="text-amber-300 text-xs">{v.plate || '—'}</span>
                          <span className="text-xs text-neutral-300">{v.brand || 'Marca'} {v.model || ''}</span>
                          <button
                            type="button"
                            className="ml-2 p-1 text-red-400 hover:bg-red-900/30 rounded"
                            title="Eliminar vehículo"
                            onClick={async () => {
                              if (!confirm('¿Eliminar este vehículo?')) return;
                              const { error } = await supabase.from('vehicles').delete().eq('id', v.id);
                              if (!error) {
                                // refrescar mapa
                                const current = vehiclesByClient[editingClient.id] || [];
                                setVehiclesByClient({
                                  ...vehiclesByClient,
                                  [editingClient.id]: current.filter((vv) => vv.id !== v.id)
                                });
                              } else {
                                alert('No se pudo eliminar el vehículo');
                              }
                            }}
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Placa"
                        value={newVehicle.plate}
                        onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                        className="input-metal w-full"
                      />
                      <input
                        type="text"
                        placeholder="Marca"
                        value={newVehicle.brand}
                        onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                        className="input-metal w-full"
                      />
                      <input
                        type="text"
                        placeholder="Modelo"
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                        className="input-metal w-full"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn-gold flex items-center gap-2"
                        onClick={async () => {
                          if (!editingClient) return;
                          const payload = {
                            client_id: editingClient.id,
                            plate: newVehicle.plate || null,
                            brand: newVehicle.brand || null,
                            model: newVehicle.model || null
                          } as any;
                          const { data: inserted, error } = await supabase
                            .from('vehicles')
                            .insert(payload)
                            .select('*')
                            .maybeSingle();
                          if (error) {
                            alert('No se pudo agregar el vehículo');
                          } else if (inserted) {
                            const list = vehiclesByClient[editingClient.id] || [];
                            setVehiclesByClient({
                              ...vehiclesByClient,
                              [editingClient.id]: [inserted as Vehicle, ...list]
                            });
                            setNewVehicle({ plate: '', brand: '', model: '' });
                          }
                        }}
                      >
                        <PlusCircle className="w-4 h-4" />
                        Añadir vehículo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn-gold flex-1">
                  {editingClient ? 'ACTUALIZAR' : 'GUARDAR'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-metal flex-1"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
