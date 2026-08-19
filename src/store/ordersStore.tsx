import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Order, OrderItemAvailability } from '../types';
import { mockOrders } from '../data/mockData';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { useAuth } from './authStore';

interface OrdersContextType {
  orders: Order[];
  addOrder: (order: Order) => Promise<Order | null>;
  addAdminPreorder: (order: Order) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<Order | null>;
  updateOrderWithItemDecisions: (
    orderId: string,
    decisions: Array<{ productId: string; availabilityStatus: OrderItemAvailability; adminNote?: string }>
  ) => Promise<Order | null>;
  refreshOrders: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

function toOrder(row: any): Order {
  return {
    id: row.id,
    orderId: row.order_id,
    companyId: row.company_id ?? 'comp-demo',
    companyName: row.company_name,
    companyCif: row.company_cif ?? '',
    companyEmail: row.company_email ?? '',
    companyPhone: row.company_phone ?? '',
    contactPerson: row.contact_person ?? '',
    deliveryAddress: row.delivery_address ?? '',
    items: row.order_items?.map((i: any) => ({
      productId: i.product_id,
      sku: i.sku,
      brand: i.brand ?? undefined,
      name: i.name,
      categoryName: i.category_name ?? '',
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      subtotal: Number(i.subtotal),
      iva: i.iva != null ? Number(i.iva) : undefined,
      unitsPerBox: i.units_per_box ?? undefined,
      availabilityStatus: i.availability_status ?? undefined,
      adminNote: i.admin_note ?? undefined,
    })) ?? [],
    totalItems: row.total_items,
    totalAmount: Number(row.total_amount),
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    estimatedDelivery: row.estimated_delivery,
  };
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { companySessionToken, superAdminSessionToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>(supabaseEnabled ? [] : mockOrders);

  const refreshOrders = useCallback(async () => {
    if (!supabaseEnabled) return;
    if (!superAdminSessionToken) {
      setOrders([]);
      return;
    }

    const { data, error } = await supabase.rpc('list_admin_orders', {
      p_admin_token: superAdminSessionToken,
    });
    if (error) {
      console.error('Error loading orders:', error);
      return;
    }

    setOrders((data ?? []).map(toOrder));
  }, [superAdminSessionToken]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const addOrder = useCallback(async (order: Order) => {
    if (!supabaseEnabled) {
      setOrders(prev => [order, ...prev]);
      return order;
    }

    if (!companySessionToken) {
      console.error('Missing company session token');
      return null;
    }

    const { data, error } = await supabase.rpc('create_order', {
      p_company_token: companySessionToken,
      p_order: {
        id: order.id,
        order_id: order.orderId,
        notes: order.notes ?? null,
        estimated_delivery: order.estimatedDelivery,
      },
      p_items: order.items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });

    if (error || !data) {
      console.error('Error saving order:', error);
      return null;
    }

    const savedOrder = toOrder(data);
    setOrders(prev => [savedOrder, ...prev]);
    return savedOrder;
  }, [companySessionToken]);

  const addAdminPreorder = useCallback(async (order: Order) => {
    if (!supabaseEnabled) {
      setOrders(prev => [order, ...prev]);
      return order;
    }
    if (!superAdminSessionToken) return null;

    const { data, error } = await supabase.rpc('admin_create_preorder', {
      p_admin_token: superAdminSessionToken,
      p_company_id: order.companyId,
      p_order: {
        id: order.id,
        order_id: order.orderId,
        notes: order.notes ?? null,
        estimated_delivery: order.estimatedDelivery,
      },
      p_items: order.items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });
    if (error || !data) {
      console.error('Error saving preorder:', error);
      return null;
    }
    const savedOrder = toOrder(data);
    setOrders(prev => [savedOrder, ...prev]);
    return savedOrder;
  }, [superAdminSessionToken]);

  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    if (!supabaseEnabled) {
      let updatedOrder: Order | null = null;
      setOrders(prev => prev.map(order => {
        if (order.id !== orderId) return order;
        updatedOrder = { ...order, status };
        return updatedOrder;
      }));
      return updatedOrder;
    }

    if (!superAdminSessionToken) {
      console.error('Missing super admin session token');
      return null;
    }

    const { data, error } = await supabase.rpc('admin_update_order_status', {
      p_admin_token: superAdminSessionToken,
      p_order_id: orderId,
      p_status: status,
    });

    if (error || !data) {
      console.error('Error updating order status:', error);
      return null;
    }

    const savedOrder = toOrder(data);
    setOrders(prev => prev.map(order => order.id === savedOrder.id ? savedOrder : order));
    return savedOrder;
  }, [superAdminSessionToken]);

  const updateOrderWithItemDecisions = useCallback(async (
    orderId: string,
    decisions: Array<{ productId: string; availabilityStatus: OrderItemAvailability; adminNote?: string }>
  ) => {
    if (!supabaseEnabled) {
      let updatedOrder: Order | null = null;
      setOrders(prev => prev.map(order => {
        if (order.id !== orderId) return order;
        updatedOrder = {
          ...order,
          status: 'accepted_modified',
          items: order.items.map(item => {
            const decision = decisions.find(entry => entry.productId === item.productId);
            return decision ? { ...item, ...decision } : item;
          }),
        };
        return updatedOrder;
      }));
      return updatedOrder;
    }

    if (!superAdminSessionToken) {
      console.error('Missing super admin session token');
      return null;
    }

    const { data, error } = await supabase.rpc('admin_update_order_with_item_decisions', {
      p_admin_token: superAdminSessionToken,
      p_order_id: orderId,
      p_items: decisions.map(item => ({
        product_id: item.productId,
        availability_status: item.availabilityStatus,
        admin_note: item.adminNote ?? null,
      })),
    });

    if (error || !data) {
      console.error('Error updating order modifications:', error);
      return null;
    }

    const savedOrder = toOrder(data);
    setOrders(prev => prev.map(order => order.id === savedOrder.id ? savedOrder : order));
    return savedOrder;
  }, [superAdminSessionToken]);

  return React.createElement(OrdersContext.Provider, {
    value: { orders, addOrder, addAdminPreorder, updateOrderStatus, updateOrderWithItemDecisions, refreshOrders },
    children,
  });
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used within OrdersProvider');
  return context;
}
