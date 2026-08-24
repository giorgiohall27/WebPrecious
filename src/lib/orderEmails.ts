import { Order } from '../types';

const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

const sendOrderEmail = async (mode: 'new_order' | 'accepted' | 'accepted_modified' | 'rejected', order: Order) => {
  const body = JSON.stringify({
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
      });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
      if (response.ok) return true;
      console.error('Order email API rejected the request:', response.status, await response.text());
    } catch (error) {
      console.error('Order email could not be sent:', error);
    }
    if (attempt < 2) await wait(600 * (attempt + 1));
  }
  return false;
};

export const notifyAdminNewOrder = (order: Order) => sendOrderEmail('new_order', order);

export const notifyCustomerOrderDecision = (order: Order, mode: 'accepted' | 'accepted_modified' | 'rejected') =>
  sendOrderEmail(mode, order);
