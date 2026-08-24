import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { buildOrderEmail } from './api/send-order-email'

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

        if (!apiKey || !from) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing Resend environment variables' }));
          return;
        }

        const payload = JSON.parse(await readBody(req));
        const email = buildOrderEmail(payload, env.ORDER_NOTIFICATION_EMAIL || 'giorgiohall27@gmail.com');
        if (!email.to) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing recipient email' }));
          return;
        }

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `precious-${payload.mode}-${payload.orderId}`.slice(0, 256),
          },
          body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html }),
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
