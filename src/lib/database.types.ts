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
      workshops: {
        Row: {
          id: string
          name: string
          slug: string
          address: string | null
          phone: string | null
          config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          address?: string | null
          phone?: string | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          address?: string | null
          phone?: string | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          workshop_id: string | null
          full_name: string
          role: 'ADMINISTRADOR' | 'DIRECTOR' | 'GERENTE_GENERAL' | 'VENDEDOR' | 'CAJERO' | 'MECANICO' | 'AYUDANTE_MECANICO' | 'ASESOR'
          is_active: boolean
          created_at: string
          updated_at: string
          birth_date: string | null
          email: string | null
          phone: string | null
          commission_rate: number
        }
        Insert: {
          id: string
          workshop_id?: string | null
          full_name: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          birth_date?: string | null
          email?: string | null
          phone?: string | null
        }
        Update: {
          id?: string
          workshop_id?: string | null
          full_name?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          birth_date?: string | null
          email?: string | null
          phone?: string | null
          commission_rate?: number
        }
      }
      customers: {
        Row: {
          id: string
          workshop_id: string | null
          first_name: string
          last_name: string
          id_number: string | null
          email: string | null
          phone: string
          address: string | null
          referred_by_customer_id: string | null
          is_vip: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workshop_id?: string | null
          first_name: string
          last_name: string
          id_number?: string | null
          email?: string | null
          phone: string
          address?: string | null
          referred_by_customer_id?: string | null
          is_vip?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string | null
          first_name?: string
          last_name?: string
          id_number?: string | null
          email?: string | null
          phone?: string
          address?: string | null
          referred_by_customer_id?: string | null
          is_vip?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          customer_id: string | null
          plate: string
          brand: string
          model: string
          year: number | null
          vin: string | null
          color: string | null
          engine_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          plate: string
          brand: string
          model: string
          year?: number | null
          vin?: string | null
          color?: string | null
          engine_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          plate?: string
          brand?: string
          model?: string
          year?: number | null
          vin?: string | null
          color?: string | null
          engine_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          workshop_id: string | null
          name: string
          description: string | null
          price: number
          estimated_duration_min: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workshop_id?: string | null
          name: string
          description?: string | null
          price?: number
          estimated_duration_min?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string | null
          name?: string
          description?: string | null
          price?: number
          estimated_duration_min?: number
          is_active?: boolean
          created_at?: string
        }
      }
      work_orders: {
        Row: {
          id: string
          workshop_id: string | null
          vehicle_id: string | null
          customer_id: string | null
          advisor_id: string | null
          mechanic_id: string | null
          mileage: number | null
          fault_description: string | null
          diagnostic: string | null
          status: string
          total_labor: number
          total_parts: number
          total_amount: number
          billing_status: string
          initial_inspection: Json | null
          final_inspection: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workshop_id?: string | null
          vehicle_id?: string | null
          customer_id?: string | null
          advisor_id?: string | null
          mechanic_id?: string | null
          mileage?: number | null
          fault_description?: string | null
          diagnostic?: string | null
          status?: string
          total_labor?: number
          total_parts?: number
          total_amount?: number
          billing_status?: string
          initial_inspection?: Json | null
          final_inspection?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string | null
          vehicle_id?: string | null
          customer_id?: string | null
          advisor_id?: string | null
          mechanic_id?: string | null
          mileage?: number | null
          fault_description?: string | null
          diagnostic?: string | null
          status?: string
          total_labor?: number
          total_parts?: number
          total_amount?: number
          billing_status?: string
          initial_inspection?: Json | null
          final_inspection?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      work_order_services: {
        Row: {
          id: string
          work_order_id: string | null
          service_id: string | null
          price: number
          quantity: number
          notes: string | null
        }
        Insert: {
          id?: string
          work_order_id?: string | null
          service_id?: string | null
          price: number
          quantity?: number
          notes?: string | null
        }
        Update: {
          id?: string
          work_order_id?: string | null
          service_id?: string | null
          price?: number
          quantity?: number
          notes?: string | null
        }
      }
      work_order_parts: {
        Row: {
          id: string
          work_order_id: string | null
          product_id: string | null
          price: number
          quantity: number
        }
        Insert: {
          id?: string
          work_order_id?: string | null
          product_id?: string | null
          price: number
          quantity?: number
        }
        Update: {
          id?: string
          work_order_id?: string | null
          product_id?: string | null
          price?: number
          quantity?: number
        }
      }
      products: {
        Row: {
          id: string
          sku: string
          name: string
          description: string | null
          brand: string | null
          unit_price: number
          unit_cost: number
          status: string
          stock: number
          created_at: string
        }
        Insert: {
          id?: string
          sku: string
          name: string
          description?: string | null
          brand?: string | null
          unit_price: number
          unit_cost: number
          status?: string
          stock?: number
          created_at?: string
        }
        Update: {
          id?: string
          sku?: string
          name?: string
          description?: string | null
          brand?: string | null
          unit_price?: number
          unit_cost?: number
          status?: string
          stock?: number
          created_at?: string
        }
      }
      membership_plans: {
        Row: {
          id: string
          workshop_id: string | null
          name: string
          price: number
          duration_days: number
          benefits: Json | null
        }
        Insert: {
          id?: string
          workshop_id?: string | null
          name: string
          price: number
          duration_days: number
          benefits?: Json | null
        }
        Update: {
          id?: string
          workshop_id?: string | null
          name?: string
          price?: number
          duration_days?: number
          benefits?: Json | null
        }
      }
      memberships: {
        Row: {
          id: string
          customer_id: string | null
          plan_id: string | null
          start_date: string
          end_date: string
          is_active: boolean
        }
        Insert: {
          id?: string
          customer_id?: string | null
          plan_id?: string | null
          start_date?: string
          end_date: string
          is_active?: boolean
        }
        Update: {
          id?: string
          customer_id?: string | null
          plan_id?: string | null
          start_date?: string
          end_date?: string
          is_active?: boolean
        }
      }
      loyalty_referrals: {
        Row: {
          id: string
          referrer_id: string | null
          referrer_name: string
          referred_name: string
          referred_phone: string
          status: 'lead' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id?: string | null
          referrer_name: string
          referred_name: string
          referred_phone: string
          status?: 'lead' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string | null
          referrer_name?: string
          referred_name?: string
          referred_phone?: string
          status?: 'lead' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          budget_number: number
          workshop_id: string | null
          customer_id: string | null
          vehicle_id: string | null
          status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
          valid_until: string | null
          notes: string | null
          total_amount: number
          manual_customer_name: string | null
          manual_vehicle_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          budget_number?: number
          workshop_id?: string | null
          customer_id?: string | null
          vehicle_id?: string | null
          status?: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
          valid_until?: string | null
          notes?: string | null
          total_amount?: number
          manual_customer_name?: string | null
          manual_vehicle_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          budget_number?: number
          workshop_id?: string | null
          customer_id?: string | null
          vehicle_id?: string | null
          status?: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
          valid_until?: string | null
          notes?: string | null
          total_amount?: number
          manual_customer_name?: string | null
          manual_vehicle_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budget_items: {
        Row: {
          id: string
          budget_id: string
          service_id: string | null
          product_id: string | null
          description: string
          quantity: number
          unit_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          budget_id: string
          service_id?: string | null
          product_id?: string | null
          description: string
          quantity?: number
          unit_price?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          budget_id?: string
          service_id?: string | null
          product_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
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
      budget_status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
    }
  }
}
