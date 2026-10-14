declare const process: { env: Record<string, string | undefined> };

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

const DEFAULT_ORDER_NOTIFICATION_EMAIL = 'giorgiohall27@gmail.com';
const DEFAULT_FROM_EMAIL = 'Precious Spain <onboarding@resend.dev>';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatMoney = (value?: number) =>
  typeof value === 'number' ? `${value.toFixed(2)} €` : '-';

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeEmailItem = (item: OrderEmailItem): OrderEmailItem => {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const unitsPerBox = Math.max(1, Number(item.unitsPerBox) || 1);
  const iva = Math.max(0, Number(item.iva) || 0);
  const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
  return {
    ...item,
    brand: item.brand?.trim() || 'Sin marca',
    quantity,
    unitsPerBox,
    iva,
    unitPrice: roundMoney(unitPrice),
    subtotal: roundMoney(unitPrice * quantity * (1 + iva / 100)),
  };
};

const detailRow = (label: string, value?: string) => value ? `
  <tr>
    <td style="padding:7px 14px 7px 0;color:#2563eb;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;vertical-align:top">${escapeHtml(label)}</td>
    <td style="padding:7px 0;color:#111827;font-size:14px;font-weight:600">${escapeHtml(value)}</td>
  </tr>` : '';

const getPreorderDetails = (notes?: string) => {
  const match = notes?.match(/^\[PREVENTA CREADA POR:\s*([^\]]+)\]\s*/i);
  return {
    creator: match?.[1]?.trim(),
    notes: notes?.replace(/^\[PREVENTA CREADA POR:\s*([^\]]+)\]\s*/i, '').trim(),
  };
};

const buildItemsHtml = (items: OrderEmailItem[] = [], includeAvailability = false) => {
  if (items.length === 0) return '<p>No hay productos en este pedido.</p>';

  const rows = items.map(item => {
    const pricePerUnit = (item.unitPrice ?? 0) / Math.max(1, item.unitsPerBox ?? 1);
    const availability = item.availabilityStatus === 'unavailable'
      ? '<span style="color:#b91c1c;font-weight:700">No llegará</span>'
      : '<span style="color:#047857;font-weight:700">Sí llegará</span>';

    return `
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;color:#64748b;font-size:12px">${escapeHtml(item.sku || '-')}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;color:#2563eb;font-weight:700;font-size:12px;text-transform:uppercase">${escapeHtml(item.brand || '-')}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;color:#111827;font-weight:700">${escapeHtml(item.name)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;text-align:center;color:#111827">${escapeHtml(item.unitsPerBox ?? 1)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;text-align:center;color:#111827;font-weight:700">${escapeHtml(item.quantity)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;text-align:right;color:#111827;white-space:nowrap">${formatMoney(item.unitPrice)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;text-align:right;color:#111827;white-space:nowrap">${formatMoney(pricePerUnit)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;text-align:center;color:#111827">${escapeHtml(item.iva ?? 0)}%</td>
        <td style="padding:12px 10px;border-bottom:1px solid #dbeafe;text-align:right;color:#111827;font-weight:800;white-space:nowrap">${formatMoney(item.subtotal)}</td>
        ${includeAvailability ? `<td style="padding:10px;border-bottom:1px solid #e5e7eb">${availability}${item.adminNote ? `<br><small>${escapeHtml(item.adminNote)}</small>` : ''}</td>` : ''}
      </tr>
    `;
  }).join('');

  return `
    <div style="width:100%;overflow-x:auto;margin-top:20px;border:1px solid #dbeafe;border-radius:12px">
    <table role="presentation" style="width:100%;min-width:760px;border-collapse:collapse;background:#ffffff">
      <thead>
        <tr style="background:#eff6ff;color:#1d4ed8;font-size:11px;text-transform:uppercase;letter-spacing:.03em">
          <th style="padding:12px 10px;text-align:left">SKU</th>
          <th style="padding:10px;text-align:left">Marca</th>
          <th style="padding:10px;text-align:left">Producto</th>
          <th style="padding:10px;text-align:center">Uds./caja</th>
          <th style="padding:10px;text-align:center">Cajas</th>
          <th style="padding:10px;text-align:right">Precio/caja</th>
          <th style="padding:10px;text-align:right">Precio/unidad</th>
          <th style="padding:10px;text-align:center">IVA</th>
          <th style="padding:10px;text-align:right">Total con IVA</th>
          ${includeAvailability ? '<th style="padding:10px;text-align:left">Disponibilidad</th>' : ''}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `;
};

const layout = (title: string, content: string) => `
  <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f1f5f9">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(title)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9"><tr><td style="padding:24px 10px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:800px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
        <tr><td style="height:7px;background:#2563eb"></td></tr>
        <tr><td style="padding:28px 28px 12px;font-family:Arial,sans-serif">
          <div style="color:#2563eb;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px">Precious Spain · Portal B2B</div>
          <h1 style="color:#111827;font-size:25px;line-height:1.25;margin:0">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:8px 28px 30px;font-family:Arial,sans-serif;color:#111827;line-height:1.55;font-size:14px">${content}</td></tr>
        <tr><td style="padding:18px 28px;background:#eff6ff;color:#1d4ed8;font-family:Arial,sans-serif;font-size:12px;font-weight:700">Precious Spain · Gracias por confiar en nosotros</td></tr>
      </table>
    </td></tr></table>
  </body></html>
`;

export const buildOrderEmail = (
  payload: OrderEmailPayload,
  adminEmail = process.env.ORDER_NOTIFICATION_EMAIL || DEFAULT_ORDER_NOTIFICATION_EMAIL,
) => {
  const items = (payload.items ?? []).map(normalizeEmailItem);
  const preorderDetails = getPreorderDetails(payload.notes);
  const subtotalBeforeTax = roundMoney(items.reduce((total, item) => total + (item.unitPrice ?? 0) * item.quantity, 0));
  const calculatedTotal = items.length > 0
    ? roundMoney(items.reduce((total, item) => total + (item.subtotal ?? 0), 0))
    : roundMoney(Number(payload.totalAmount) || 0);
  const taxTotal = roundMoney(calculatedTotal - subtotalBeforeTax);

  if (payload.mode === 'new_order') {
    return {
      to: adminEmail,
      subject: `${preorderDetails.creator ? 'Nueva preventa' : 'Nuevo pedido'} ${payload.orderId} - ${payload.companyName ?? 'Cliente'}`,
      html: layout(`${preorderDetails.creator ? 'Nueva preventa' : 'Nuevo pedido'} ${payload.orderId}`, `
        <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;margin:10px 0 18px"><tr><td style="padding:14px 18px">
          <table role="presentation" style="border-collapse:collapse">
            ${detailRow('Empresa', payload.companyName)}${detailRow('Email', payload.companyEmail)}${detailRow('Teléfono', payload.companyPhone)}${detailRow('Contacto', payload.contactPerson)}${detailRow('Dirección', payload.deliveryAddress)}${detailRow('Preventa creada por', preorderDetails.creator)}${detailRow('Notas', preorderDetails.notes)}
          </table>
        </td></tr></table>
        ${buildItemsHtml(items)}
        <table role="presentation" style="margin:20px 0 0 auto;border-collapse:collapse;min-width:260px;color:#111827">
          <tr><td style="padding:4px 12px;text-align:right;color:#64748b">Subtotal sin IVA</td><td style="padding:4px 0;text-align:right;font-weight:700">${formatMoney(subtotalBeforeTax)}</td></tr>
          <tr><td style="padding:4px 12px;text-align:right;color:#64748b">IVA total</td><td style="padding:4px 0;text-align:right;font-weight:700">${formatMoney(taxTotal)}</td></tr>
          <tr><td style="padding:9px 12px 0;text-align:right;font-weight:800">Total del pedido</td><td style="padding:9px 0 0;text-align:right;color:#2563eb;font-size:28px;font-weight:800;white-space:nowrap">${formatMoney(calculatedTotal)}</td></tr>
        </table>
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
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;

  if (!apiKey) {
    console.error('[send-order-email] RESEND_API_KEY is not configured');
    return res.status(500).json({ error: 'Email service is not configured' });
  }

  const payload = req.body as OrderEmailPayload;
  const email = buildOrderEmail(payload);

  if (!email.to) {
    return res.status(400).json({ error: 'Missing recipient email' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `precious-${payload.mode}-${payload.orderId}`.slice(0, 256),
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
      console.error('[send-order-email] Resend rejected the email', {
        status: response.status,
        orderId: payload.orderId,
        mode: payload.mode,
        details: data,
      });
      return res.status(response.status).json({ error: 'Resend email failed', details: data });
    }

    console.log('[send-order-email] Email accepted by Resend', {
      orderId: payload.orderId,
      mode: payload.mode,
      emailId: data?.id,
    });
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error('[send-order-email] Unexpected email error', {
      orderId: payload.orderId,
      mode: payload.mode,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(502).json({ error: 'Email provider unavailable' });
  }
}
