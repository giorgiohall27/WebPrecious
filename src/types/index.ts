export interface Category {
  id: string;
  name: string;
  key: string;
  icon: string;
  order: number;
  active: boolean;
  productCount?: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  key: string;
  order: number;
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  subcategoryId?: string;
  categoryName?: string;
  subcategoryName?: string;
  price: number;
  stock: number;
  description?: string;
  brand?: string;
  unitMeasure?: string;
  unitsPerBox?: number;
  imageUrl?: string | null;
  weightKg?: number;
  iva?: number;
  active: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Company {
  id: string;
  name: string;
  cif: string;
  email: string;
  phone: string;
  contactPerson: string;
  deliveryAddress: string;
}

export interface ManagedCompany extends Company {
  pin: string;
  pinHint?: string;
  active: boolean;
  createdAt: string;
  notes?: string;
}

export interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  pin?: string;
  pinHint?: string;
  active: boolean;
  createdAt: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderId: string;
  companyId: string;
  companyName: string;
  companyCif: string;
  companyEmail: string;
  companyPhone: string;
  contactPerson: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalItems: number;
  totalAmount: number;
  notes?: string;
  status: 'pending' | 'authorization_pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  estimatedDelivery: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type StockLevel = 'high' | 'low' | 'out';

export function getStockLevel(stock: number): StockLevel {
  if (stock === 0) return 'out';
  if (stock < 25) return 'low';
  return 'high';
}

export type UserRole = 'admin' | 'client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  company?: Company;
}
