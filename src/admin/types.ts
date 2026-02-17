
export type Role = 'DIRECTOR' | 'GERENTE_GENERAL' | 'ADMINISTRADOR' | 'CAJERO' | 'VENDEDOR' | 'MECANICO' | 'AYUDANTE_MECANICO';

export type OrderStatus = 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'READY' | 'DELIVERED' | 'CANCELED';

export type BillingStatus = 'NOT_BILLED' | 'PENDING_PAYMENT' | 'PAID';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED';

export interface UserProfile {
  id: string;
  workshop_id: string | null;
  full_name: string;
  email: string;
  phone?: string;
  role: Role;
  is_active: boolean;
  commission_rate: number;
  birth_date?: string;
  created_at?: string;
}

export interface WorkOrder {
  id: string;
  workshop_id: string;
  vehicle_id: string;
  customer_id: string;
  advisor_id?: string;
  mechanic_id?: string;
  status: OrderStatus;
  billing_status: BillingStatus;
  mileage?: number;
  fault_description?: string;
  diagnostic?: string;
  initial_inspection?: any;
  final_inspection?: any;
  total_labor: number;
  total_parts: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  vehicle?: Vehicle;
  services?: WorkOrderService[];
  parts?: WorkOrderPart[];
  mechanic?: UserProfile;
  advisor?: UserProfile;
}

export interface Invoice {
  id: string;
  workshop_id: string;
  customer_id: string;
  work_order_id?: string;
  total_amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  payment_method?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  workshop_id: string;
  customer_id: string;
  vehicle_id: string;
  service_id: string;
  mechanic_id?: string | null;
  scheduled_at: string;
  duration_min: number;
  status: AppointmentStatus;
  customer?: Customer;
  vehicle?: Vehicle;
  service?: Service;
  mechanic?: UserProfile;
  created_at: string;
}

export interface Customer {
  id: string;
  workshop_id?: string;
  first_name: string;
  last_name: string;
  id_number: string;
  phone: string;
  email?: string;
  address?: string;
  is_vip: boolean;
  created_at?: string;
  vehicles?: Vehicle[];
}

export interface Product {
  id: string;
  workshop_id?: string;
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  cost: number;
  price: number;
  min_stock: number;
  inventory_levels?: InventoryLevel[];
}

export interface Service {
  id: string;
  workshop_id: string;
  name: string;
  description?: string;
  price: number;
  estimated_duration_min: number;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
}

export interface WorkOrderService {
  id: string;
  work_order_id: string;
  service_id: string;
  price: number;
  quantity: number;
  service?: Service;
}

export interface WorkOrderPart {
  id: string;
  work_order_id: string;
  product_id: string;
  price: number;
  quantity: number;
  product?: Product;
}

export interface InventoryLevel {
  id: string;
  product_id: string;
  warehouse_id: string;
  stock: number;
}

export type BudgetStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface Budget {
  id: string;
  budget_number: number;
  workshop_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  manual_customer_name?: string;
  manual_vehicle_name?: string;
  status: BudgetStatus;
  valid_until?: string;
  notes?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  vehicle?: Vehicle;
  items?: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  service_id?: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  service?: Service;
  product?: Product;
}
