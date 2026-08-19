type OrderEmailItem = {
  sku?: string;
  brand?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
  iva?: number;
  unitsPerBox?: number;
  availabilityStatus?: 'available' | 'unavailable';
  adminNote?: string;
};

type OrderEmailPayload = {
  mode: 'new_order' | 'accepted' | 'accepted_modified' | 'rejected';
  orderId: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  deliveryAddress?: string;
  contactPerson?: string;
  notes?: string;
  totalAmount?: number;
  items?: OrderEmailItem[];
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatMoney = (value?: number) =>
  typeof value === 'number' ? `${value.toFixed(2)} €` : '-';

const buildItemsHtml = (items: OrderEmailItem[] = [], includeAvailability = false) => {
  if (items.length === 0) return '<p>No hay productos en este pedido.</p>';

  const rows = items.map(item => {
    const availability = item.availabilityStatus === 'unavailable'
      ? '<span style="color:#b91c1c;font-weight:700">No llegará</span>'
      : '<span style="color:#047857;font-weight:700">Sí llegará</span>';

    return `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.sku || '-')}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.brand || '-')}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.name)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center">${escapeHtml(item.unitsPerBox ?? 1)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center">${escapeHtml(item.quantity)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${formatMoney(item.unitPrice)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center">${escapeHtml(item.iva ?? 0)}%</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${formatMoney(item.subtotal)}</td>
        ${includeAvailability ? `<td style="padding:10px;border-bottom:1px solid #e5e7eb">${availability}${item.adminNote ? `<br><small>${escapeHtml(item.adminNote)}</small>` : ''}</td>` : ''}
      </tr>
    `;
  }).join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:10px;text-align:left">SKU</th>
          <th style="padding:10px;text-align:left">Marca</th>
          <th style="padding:10px;text-align:left">Producto</th>
          <th style="padding:10px;text-align:center">Uds./caja</th>
          <th style="padding:10px;text-align:center">Cajas</th>
          <th style="padding:10px;text-align:right">Precio/caja</th>
          <th style="padding:10px;text-align:center">IVA</th>
          <th style="padding:10px;text-align:right">Total con IVA</th>
          ${includeAvailability ? '<th style="padding:10px;text-align:left">Disponibilidad</th>' : ''}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const layout = (title: string, content: string) => `
  <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:760px;margin:0 auto">
    <h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(title)}</h1>
    ${content}
    <p style="margin-top:24px;color:#64748b;font-size:13px">Precious Spain</p>
  </div>
`;

const buildEmail = (payload: OrderEmailPayload) => {
  const items = payload.items ?? [];

  if (payload.mode === 'new_order') {
    return {
      to: process.env.ORDER_NOTIFICATION_EMAIL,
      subject: `Nuevo pedido ${payload.orderId} - ${payload.companyName ?? 'Cliente'}`,
      html: layout(`Nuevo pedido ${payload.orderId}`, `
        <p><strong>Empresa:</strong> ${escapeHtml(payload.companyName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(payload.companyEmail)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(payload.companyPhone)}</p>
        <p><strong>Contacto:</strong> ${escapeHtml(payload.contactPerson)}</p>
        <p><strong>Dirección:</strong> ${escapeHtml(payload.deliveryAddress)}</p>
        ${payload.notes ? `<p><strong>Notas:</strong> ${escapeHtml(payload.notes)}</p>` : ''}
        ${buildItemsHtml(items)}
        <h2 style="text-align:right;font-size:20px">Total: ${formatMoney(payload.totalAmount)}</h2>
      `),
    };
  }

  if (payload.mode === 'accepted_modified') {
    return {
      to: payload.companyEmail,
      subject: `Pedido ${payload.orderId}: aceptado con modificaciones`,
      html: layout(`Tu pedido ${payload.orderId} ha sido aceptado con modificaciones`, `
        <p>Hemos revisado tu pedido. Abajo puedes ver qué productos llegarán y cuáles no estarán disponibles.</p>
        ${buildItemsHtml(items, true)}
      `),
    };
  }

  if (payload.mode === 'rejected') {
    return {
      to: payload.companyEmail,
      subject: `Pedido ${payload.orderId}: rechazado`,
      html: layout(`Tu pedido ${payload.orderId} ha sido rechazado`, `
        <p>Lo sentimos, este pedido no ha podido ser aceptado. Puedes contactar con Precious Spain para más información.</p>
      `),
    };
  }

  return {
    to: payload.companyEmail,
    subject: `Pedido ${payload.orderId}: aceptado`,
    html: layout(`Tu pedido ${payload.orderId} ha sido aceptado`, `
      <p>Tu pedido ha sido aceptado y se preparará con los productos solicitados.</p>
      ${buildItemsHtml(items)}
    `),
  };
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return res.status(500).json({ error: 'Missing Resend environment variables' });
  }

  const payload = req.body as OrderEmailPayload;
  const email = buildEmail(payload);

  if (!email.to) {
    return res.status(400).json({ error: 'Missing recipient email' });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Resend email failed', details: data });
  }

  return res.status(200).json({ ok: true, data });
}
