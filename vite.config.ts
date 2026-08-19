import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function readBody(req: import('node:http').IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function resendDevApi(): Plugin {
  return {
    name: 'precious-resend-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/send-order-email', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        const env = loadEnv('', process.cwd(), '');
        const apiKey = env.RESEND_API_KEY;
        const from = env.RESEND_FROM_EMAIL;
        const adminEmail = env.ORDER_NOTIFICATION_EMAIL;

        if (!apiKey || !from) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing Resend environment variables' }));
          return;
        }

        const payload = JSON.parse(await readBody(req));
        const to = payload.mode === 'new_order' ? adminEmail : payload.companyEmail;

        if (!to) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing recipient email' }));
          return;
        }

        const subject = payload.mode === 'new_order'
          ? `Nuevo pedido ${payload.orderId} - ${payload.companyName ?? 'Cliente'}`
          : `Pedido ${payload.orderId}: ${payload.mode === 'rejected' ? 'rechazado' : payload.mode === 'accepted_modified' ? 'aceptado con modificaciones' : 'aceptado'}`;

        const itemsHtml = (payload.items ?? []).map((item: any) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.sku ?? '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.brand ?? '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.name}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.unitsPerBox ?? 1}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${Number(item.unitPrice ?? 0).toFixed(2)} €</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.iva ?? 0}%</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${Number(item.subtotal ?? 0).toFixed(2)} €</td>
          </tr>
        `).join('');

        const html = `
          <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
            <h1>${subject}</h1>
            <p><strong>Empresa:</strong> ${payload.companyName ?? ''}</p>
            <p><strong>Email:</strong> ${payload.companyEmail ?? ''}</p>
            <p><strong>Dirección:</strong> ${payload.deliveryAddress ?? ''}</p>
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:#f8fafc"><th>SKU</th><th>Marca</th><th>Producto</th><th>Uds./caja</th><th>Cajas</th><th>Precio/caja</th><th>IVA</th><th>Total con IVA</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            ${payload.totalAmount != null ? `<h2>Total: ${Number(payload.totalAmount).toFixed(2)} €</h2>` : ''}
          </div>
        `;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from, to: [to], subject, html }),
        });

        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(await response.json().catch(() => ({ ok: response.ok }))));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), resendDevApi()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
