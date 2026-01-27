import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Shield, User } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ADMIN_BASE } from "../lib/api";
import type { Database } from "../lib/database.types";

type UserData = Database["public"]["Tables"]["users"]["Row"];

export default function UsersManager() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "receptionist" as "admin" | "mechanic" | "receptionist",
    phone: "",
    email: "",
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Intento cargar desde backend (service role)
      try {
        const resp = await fetch(`${ADMIN_BASE}/admin/users`, {
          headers: { "X-Role": "admin" },
        });
        if (!resp.ok) throw new Error(`Backend GET fallo: ${resp.status}`);
        const json = await resp.json();
        setUsers(json.users || []);
      } catch (backendErr) {
        // Fallback: carga directa con RLS
        const { data, error } = await supabase
          .from("users")
          .select(
            "id, full_name, username, role, phone, email, status, created_at"
          )
          .order("created_at", { ascending: false });
        if (error) throw error;
        setUsers(data || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        const updateData: any = {
          full_name: formData.full_name,
          username: formData.username,
          role: formData.role,
          phone: formData.phone,
          email: formData.email,
          status: formData.status,
        };

        // Si hay contraseña, intenta actualizar vía backend (Auth + perfil)
        if (formData.password) {
          try {
            const resp = await fetch(`${ADMIN_BASE}/admin/users/${editingUser.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "X-Role": "admin" },
              body: JSON.stringify({
                ...updateData,
                password: formData.password,
              }),
            });
            if (!resp.ok)
              throw new Error(`Backend PATCH fallo: ${resp.status}`);
          } catch (e) {
            // Fallback: RPC hash + update directo
            const { error: hashError } = await supabase.rpc(
              "update_user_password",
              {
                user_id: editingUser.id,
                new_password: formData.password,
              }
            );
            if (hashError) throw hashError;
            const { error: updErr } = await supabase
              .from("users")
              .update(updateData)
              .eq("id", editingUser.id)
              .select("*")
              .maybeSingle();
            if (updErr) throw updErr;
          }
        } else {
          // Sin contraseña: actualización directa
          const { error } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", editingUser.id)
            .select("*")
            .maybeSingle();
          if (error) throw error;
        }
      } else {
        // Primero intento vía backend (crea Auth + perfil)
        try {
          const resp = await fetch(`${ADMIN_BASE}/admin/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Role": "admin" },
            body: JSON.stringify({
              full_name: formData.full_name,
              username: formData.username,
              password: formData.password,
              role: formData.role,
              phone: formData.phone || null,
              email: formData.email,
              status: formData.status || "active",
            }),
          });
          if (!resp.ok) throw new Error(`Backend POST fallo: ${resp.status}`);
        } catch (backendErr) {
          // Fallback: RPC create_user y luego insert directo si falta RPC
          const { error: rpcError } = await supabase.rpc("create_user", {
            p_full_name: formData.full_name,
            p_username: formData.username,
            p_password: formData.password,
            p_role: formData.role,
            p_phone: formData.phone,
            p_email: formData.email,
          });
          if (rpcError) {
            const code = (rpcError as any)?.code;
            const status = (rpcError as any)?.status;
            const msg = String(rpcError?.message || rpcError);
            const looksMissing =
              code === "PGRST202" ||
              status === 404 ||
              msg.includes("Could not find the function") ||
              msg.includes("No function matches");
            if (looksMissing) {
              const { data: inserted, error: insErr } = await supabase
                .from("users")
                .insert({
                  full_name: formData.full_name,
                  username: formData.username,
                  role: formData.role,
                  phone: formData.phone || null,
                  email: formData.email,
                  status: formData.status || "active",
                })
                .select("id")
                .maybeSingle();
              if (insErr) throw insErr;
              if (inserted?.id && formData.password) {
                const { error: passErr } = await supabase.rpc(
                  "update_user_password",
                  {
                    user_id: inserted.id,
                    new_password: formData.password,
                  }
                );
                if (passErr) throw passErr;
              }
            } else {
              throw rpcError;
            }
          }
        }
      }

      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Error al guardar el usuario");
    }
  };

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      username: user.username,
      password: "",
      role: user.role,
      phone: user.phone || "",
      email: user.email || "",
      status: user.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    try {
      // Intento borrar vía backend (perfil + Auth)
      try {
        const resp = await fetch(`${ADMIN_BASE}/admin/users/${id}`, {
          method: "DELETE",
          headers: { "X-Role": "admin" },
        });
        if (!resp.ok) throw new Error(`Backend DELETE fallo: ${resp.status}`);
      } catch (e) {
        // Fallback: borrar directo en tabla
        const { data: deletedRow, error } = await supabase
          .from("users")
          .delete()
          .eq("id", id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!deletedRow) {
          console.warn("Delete no devolvió fila; revisa RLS o filtros.");
        }
      }
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error al eliminar el usuario");
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      username: "",
      password: "",
      role: "receptionist",
      phone: "",
      email: "",
      status: "active",
    });
    setEditingUser(null);
  };

  const roleConfig = {
    admin: { label: "Administrador", color: "text-red-400", icon: Shield },
    mechanic: { label: "Mecánico", color: "text-blue-400", icon: User },
    receptionist: {
      label: "Recepcionista",
      color: "text-green-400",
      icon: User,
    },
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-bold heading-racing text-neutral-100 mb-2">
            USUARIOS
          </h2>
          <p className="text-neutral-400 text-racing">
            Gestión de usuarios del sistema
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-gold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          NUEVO USUARIO
        </button>
      </div>

      {isLoading ? (
        <div className="card-metal p-12 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="card-metal p-12 text-center">
          <p className="text-neutral-400">No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {users.map((user) => {
            const RoleIcon = roleConfig[user.role].icon;
            return (
              <div
                key={user.id}
                className="card-metal p-6 hover:brightness-110 transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <RoleIcon
                      className={`w-8 h-8 ${roleConfig[user.role].color} mt-1`}
                    />
                    <div>
                      <h3 className="text-xl font-bold text-neutral-100 mb-1">
                        {user.full_name}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        @{user.username}
                      </p>
                      <p
                        className={`text-sm font-semibold uppercase tracking-wide mt-1 ${
                          roleConfig[user.role].color
                        }`}
                      >
                        {roleConfig[user.role].label}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-neutral-400">
                  {user.email && <p>Email: {user.email}</p>}
                  {user.phone && <p>Teléfono: {user.phone}</p>}
                  <p>
                    Estado:{" "}
                    <span
                      className={
                        user.status === "active"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {user.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="card-metal p-8 max-w-2xl w-full my-8">
            <h3 className="text-2xl font-bold heading-racing text-neutral-100 mb-6">
              {editingUser ? "EDITAR USUARIO" : "NUEVO USUARIO"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="input-metal w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Usuario *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="input-metal w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                  Contraseña {editingUser ? "(dejar vacío para mantener)" : "*"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="input-metal w-full"
                  required={!editingUser}
                  autoComplete="new-password"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as any })
                    }
                    className="input-metal w-full"
                    required
                  >
                    <option value="receptionist">Recepcionista</option>
                    <option value="mechanic">Mecánico</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Estado *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                    className="input-metal w-full"
                    required
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="input-metal w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input-metal w-full"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn-gold flex-1">
                  {editingUser ? "ACTUALIZAR" : "CREAR USUARIO"}
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
