import { Order } from '../types';

const sendOrderEmail = async (mode: 'new_order' | 'accepted' | 'accepted_modified' | 'rejected', order: Order) => {
  try {
    await fetch('/api/send-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        orderId: order.orderId,
        companyName: order.companyName,
        companyEmail: order.companyEmail,
        companyPhone: order.companyPhone,
        contactPerson: order.contactPerson,
        deliveryAddress: order.deliveryAddress,
        notes: order.notes,
        totalAmount: order.totalAmount,
        items: order.items,
      }),
    });
  } catch (error) {
    console.error('Order email could not be sent:', error);
  }
};

export const notifyAdminNewOrder = (order: Order) => sendOrderEmail('new_order', order);

export const notifyCustomerOrderDecision = (order: Order, mode: 'accepted' | 'accepted_modified' | 'rejected') =>
  sendOrderEmail(mode, order);
