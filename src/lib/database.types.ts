export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string
          client_id: string
          service_id: string | null
          assigned_mechanic_id: string | null
          scheduled_at: string
          duration_minutes: number
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          notes: string | null
          total: number
          created_at: string
          updated_at: string
          appointment_number: number
        }
        Insert: {
          id?: string
          client_id: string
          service_id?: string | null
          assigned_mechanic_id?: string | null
          scheduled_at: string
          duration_minutes?: number
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          notes?: string | null
          total?: number
          created_at?: string
          updated_at?: string
          appointment_number?: number
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string | null
          assigned_mechanic_id?: string | null
          scheduled_at?: string
          duration_minutes?: number
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          notes?: string | null
          total?: number
          created_at?: string
          updated_at?: string
          appointment_number?: number
        }
      }
      users: {
        Row: {
          id: string
          full_name: string
          username: string
          password: string
          role: 'admin' | 'mechanic' | 'receptionist'
          phone: string | null
          email: string | null
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          username: string
          password: string
          role: 'admin' | 'mechanic' | 'receptionist'
          phone?: string | null
          email?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          username?: string
          password?: string
          role?: 'admin' | 'mechanic' | 'receptionist'
          phone?: string | null
          email?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          full_name: string
          phone: string
          vehicle_plate: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone: string
          vehicle_plate?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          vehicle_plate?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          base_price: number
          duration_minutes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          base_price?: number
          duration_minutes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          base_price?: number
          duration_minutes?: number | null
          created_at?: string
        }
      }
      membership_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          duration_days: number
          discount_percent: number
          benefits: Json | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price?: number
          duration_days?: number
          discount_percent?: number
          benefits?: Json | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          duration_days?: number
          discount_percent?: number
          benefits?: Json | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      client_memberships: {
        Row: {
          id: string
          client_id: string
          plan_id: string
          start_date: string
          end_date: string
          status: 'active' | 'expired' | 'cancelled'
          auto_renew: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          plan_id: string
          start_date?: string
          end_date?: string
          status?: 'active' | 'expired' | 'cancelled'
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          plan_id?: string
          start_date?: string
          end_date?: string
          status?: 'active' | 'expired' | 'cancelled'
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      work_orders: {
        Row: {
          id: string
          client_id: string
          appointment_id: string | null
          mechanic_id: string | null
          assigned_mechanic_id: string | null
          service_id: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          total: number
          created_at: string
          updated_at: string
          order_number: number
        }
        Insert: {
          id?: string
          client_id: string
          appointment_id?: string | null
          mechanic_id?: string | null
          assigned_mechanic_id?: string | null
          service_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          total?: number
          created_at?: string
          updated_at?: string
          order_number?: number
        }
        Update: {
          id?: string
          client_id?: string
          appointment_id?: string | null
          mechanic_id?: string | null
          assigned_mechanic_id?: string | null
          service_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          total?: number
          created_at?: string
          updated_at?: string
          order_number?: number
        }
      }
      mechanics: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          email: string | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone?: string | null
          email?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          email?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      work_order_services: {
        Row: {
          id: string
          work_order_id: string
          service_id: string
          quantity: number
          unit_price: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          service_id: string
          quantity?: number
          unit_price?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          service_id?: string
          quantity?: number
          unit_price?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      initial_inspections: {
        Row: {
          id: string
          work_order_id: string
          inspector_name: string
          mechanic_id: string | null
          fecha_inspeccion: string
          kilometraje_actual: number | null
          combustible: 'lleno' | 'medio' | 'bajo' | null
          nivel_aceite: 'correcto' | 'bajo' | 'sucio' | null
          nivel_refrigerante: 'correcto' | 'bajo' | 'no_aplica' | null
          bateria: 'buena' | 'debil' | 'sin_carga' | null
          presion_neumaticos: 'correcta' | 'baja' | 'alta' | null
          luces_alta: boolean
          luces_baja: boolean
          direccionales: boolean
          stop: boolean
          frenos: 'firmes' | 'esponjosos' | 'requieren_ajuste' | null
          suspension_delantera: 'sin_fugas' | 'con_fugas' | 'ruidosa' | null
          cadena_y_pinon: 'buena' | 'floja' | 'desgastada' | null
          embrague: 'normal' | 'duro' | 'patina' | null
          observaciones_generales: string | null
          foto_recepcion_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          inspector_name: string
          mechanic_id?: string | null
          fecha_inspeccion?: string
          kilometraje_actual?: number | null
          combustible?: 'lleno' | 'medio' | 'bajo' | null
          nivel_aceite?: 'correcto' | 'bajo' | 'sucio' | null
          nivel_refrigerante?: 'correcto' | 'bajo' | 'no_aplica' | null
          bateria?: 'buena' | 'debil' | 'sin_carga' | null
          presion_neumaticos?: 'correcta' | 'baja' | 'alta' | null
          luces_alta?: boolean
          luces_baja?: boolean
          direccionales?: boolean
          stop?: boolean
          frenos?: 'firmes' | 'esponjosos' | 'requieren_ajuste' | null
          suspension_delantera?: 'sin_fugas' | 'con_fugas' | 'ruidosa' | null
          cadena_y_pinon?: 'buena' | 'floja' | 'desgastada' | null
          embrague?: 'normal' | 'duro' | 'patina' | null
          observaciones_generales?: string | null
          foto_recepcion_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          inspector_name?: string
          mechanic_id?: string | null
          fecha_inspeccion?: string
          kilometraje_actual?: number | null
          combustible?: 'lleno' | 'medio' | 'bajo' | null
          nivel_aceite?: 'correcto' | 'bajo' | 'sucio' | null
          nivel_refrigerante?: 'correcto' | 'bajo' | 'no_aplica' | null
          bateria?: 'buena' | 'debil' | 'sin_carga' | null
          presion_neumaticos?: 'correcta' | 'baja' | 'alta' | null
          luces_alta?: boolean
          luces_baja?: boolean
          direccionales?: boolean
          stop?: boolean
          frenos?: 'firmes' | 'esponjosos' | 'requieren_ajuste' | null
          suspension_delantera?: 'sin_fugas' | 'con_fugas' | 'ruidosa' | null
          cadena_y_pinon?: 'buena' | 'floja' | 'desgastada' | null
          embrague?: 'normal' | 'duro' | 'patina' | null
          observaciones_generales?: string | null
          foto_recepcion_url?: string | null
          created_at?: string
        }
      }
      final_inspections: {
        Row: {
          id: string
          work_order_id: string
          inspector_name: string
          mechanic_id: string | null
          fecha_revision: string
          servicios_realizados: string | null
          prueba_arranque: boolean
          ruidos_inusuales: boolean
          luces_funcionando: boolean
          frenos_operativos: boolean
          direccion_sin_juego: boolean
          nivel_aceite_correcto: boolean
          sin_fugas_visibles: boolean
          neumaticos_correctos: boolean
          comentarios_finales: string | null
          foto_entrega_url: string | null
          estado_general: 'apto' | 'observado'
          firma_mecanico: string | null
          created_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          inspector_name: string
          mechanic_id?: string | null
          fecha_revision?: string
          servicios_realizados?: string | null
          prueba_arranque?: boolean
          ruidos_inusuales?: boolean
          luces_funcionando?: boolean
          frenos_operativos?: boolean
          direccion_sin_juego?: boolean
          nivel_aceite_correcto?: boolean
          sin_fugas_visibles?: boolean
          neumaticos_correctos?: boolean
          comentarios_finales?: string | null
          foto_entrega_url?: string | null
          estado_general?: 'apto' | 'observado'
          firma_mecanico?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          inspector_name?: string
          mechanic_id?: string | null
          fecha_revision?: string
          servicios_realizados?: string | null
          prueba_arranque?: boolean
          ruidos_inusuales?: boolean
          luces_funcionando?: boolean
          frenos_operativos?: boolean
          direccion_sin_juego?: boolean
          nivel_aceite_correcto?: boolean
          sin_fugas_visibles?: boolean
          neumaticos_correctos?: boolean
          comentarios_finales?: string | null
          foto_entrega_url?: string | null
          estado_general?: 'apto' | 'observado'
          firma_mecanico?: string | null
          created_at?: string
        }
      }
      loyalty_referrals: {
        Row: {
          id: string
          referrer_id: string | null
          referrer_name: string
          referred_name: string
          referred_phone: string
          status: 'pending' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id?: string | null
          referrer_name: string
          referred_name: string
          referred_phone: string
          status?: 'pending' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string | null
          referrer_name?: string
          referred_name?: string
          referred_phone?: string
          status?: 'pending' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
