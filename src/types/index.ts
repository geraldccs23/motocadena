import { Database } from '../lib/database.types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export type Appointment = Tables<'appointments'>;
export type UserProfile = Tables<'users'>;
export type Client = Tables<'clients'>;
export type Service = Tables<'services'>;
export type WorkOrder = Tables<'work_orders'>;
export type WorkOrderService = Tables<'work_order_services'>;
export type Mechanic = Tables<'mechanics'>;
export type InitialInspection = Tables<'initial_inspections'>;
export type FinalInspection = Tables<'final_inspections'>;
export type MembershipPlan = Tables<'membership_plans'>;
export type ClientMembership = Tables<'client_memberships'>;

export interface Supplier {
    id?: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    status: 'active' | 'inactive';
    created_at?: string;
}

export interface PurchaseInvoice {
    id: string;
    supplier_id: string;
    status: 'open' | 'received' | 'cancelled';
    total: number;
    notes?: string | null;
    purchase_number?: string | null;
    document_type?: 'invoice' | 'delivery_note' | null;
    invoice_number?: string | null;
    control_number?: string | null;
    document_date?: string | null;
    created_at?: string;
    supplier?: Supplier;
}

export interface PurchaseItem {
    id: string;
    purchase_id: string;
    product_id: string;
    quantity: number;
    unit_cost: number;
    subtotal: number;
    created_at?: string;
    product?: Product;
}

export interface PosSale {
    id: string;
    sale_number?: string | null;
    client_id?: string | null;
    status: 'open' | 'paid' | 'void';
    total: number;
    notes?: string | null;
    exchange_rate?: number | null;
    created_at?: string;
    client?: Client;
}

export interface PosItem {
    id: string;
    sale_id: string;
    product_id?: string | null;
    service_id?: string | null;
    work_order_id?: string | null;
    description?: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    created_at?: string;
    product?: Product;
}

export interface PosPayment {
    id: string;
    sale_id: string;
    method: string;
    amount: number;
    currency: string;
    original_amount?: number;
    bank?: string | null;
    created_at?: string;
}

export interface ProductCategory {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    image_url?: string | null;
    is_active: boolean;
}

export interface Product {
    id?: string;
    sku: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    brand?: string | null;
    supplier_code?: string | null;
    oem_code?: string | null;
    unit_price: number;
    unit_cost: number;
    status?: 'active' | 'inactive';
    is_ecommerce?: boolean;
    is_featured?: boolean;
    category_id?: string | null;
    stock?: number;
    created_at?: string;
}

export type OrderStatus = WorkOrder['status'];
export type AppointmentStatus = Appointment['status'];

export interface ServiceWithDetails extends Service {
    quantity?: number;
    unit_price?: number;
}
