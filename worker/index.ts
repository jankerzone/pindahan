import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { poweredBy } from 'hono/powered-by';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';

interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  __STATIC_CONTENT: unknown;
}

const ASSET_MANIFEST = manifestJSON ? JSON.parse(manifestJSON) : {};

const app = new Hono<{ Bindings: Env }>();

// Utility: generate 4-character alphanumeric id
function generateUniqueId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function ensureSchema(env: Env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS boxes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_boxes_id ON boxes(id)').run();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

function getContentType(pathname: string) {
  if (pathname.endsWith('.html')) return 'text/html; charset=utf-8';
  if (pathname.endsWith('.css')) return 'text/css; charset=utf-8';
  if (pathname.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (pathname.endsWith('.json')) return 'application/json; charset=utf-8';
  if (pathname.endsWith('.svg')) return 'image/svg+xml';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  if (pathname.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

async function serveStaticAsset(request: Request, env: Env) {
  if (!env.__STATIC_CONTENT) {
    return null;
  }

  const url = new URL(request.url);
  let pathname = url.pathname;

  if (pathname === '/' || pathname === '') {
    pathname = 'index.html';
  } else if (pathname.startsWith('/')) {
    pathname = pathname.slice(1);
  }

  const assetKey = ASSET_MANIFEST[pathname] || pathname;
  const asset = await env.__STATIC_CONTENT.get(assetKey, 'arrayBuffer');

  if (!asset) {
    return null;
  }

  const response = new Response(asset, {
    headers: {
      'Content-Type': getContentType(pathname),
      'Cache-Control': 'public, max-age=3600'
    }
  });

  return response;
}

// Middleware
app.use('*', poweredBy());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type']
}));

// Routes
app.get('/api/boxes/:id', async (c) => {
  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'ID kardus diperlukan' }, 400);
  }

  try {
    await ensureSchema(c.env);
    const box = await c.env.DB.prepare('SELECT * FROM boxes WHERE id = ?').bind(id).first();
    if (!box) {
      return c.json({ error: 'Kardus tidak ditemukan' }, 404);
    }

    return c.json({ ...box, content: JSON.parse(box.content) });
  } catch (error) {
    console.error('Fetch box error:', error);
    return c.json({ error: 'Gagal mengambil data kardus' }, 500);
  }
});

app.post('/api/boxes', async (c) => {
  try {
    const { label, content } = await c.req.json();
    if (!label || !content) {
      return c.json({ error: 'Label dan content diperlukan' }, 400);
    }

    await ensureSchema(c.env);
    const id = generateUniqueId();
    await c.env.DB.prepare('INSERT INTO boxes (id, label, content) VALUES (?, ?, ?)')
      .bind(id, label, JSON.stringify(content))
      .run();

    return c.json({ id, label, content }, 201);
  } catch (error) {
    console.error('Create box error:', error);
    return c.json({ error: 'Gagal membuat kardus baru' }, 500);
  }
});

app.put('/api/boxes/:id', async (c) => {
  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'ID kardus diperlukan' }, 400);
  }

  try {
    const { content } = await c.req.json();
    if (!content) {
      return c.json({ error: 'Content diperlukan' }, 400);
    }

    await ensureSchema(c.env);
    const result = await c.env.DB.prepare('UPDATE boxes SET content = ? WHERE id = ?')
      .bind(JSON.stringify(content), id)
      .run();

    if (result.changes === 0) {
      return c.json({ error: 'Kardus tidak ditemukan' }, 404);
    }

    return c.json({ id, content });
  } catch (error) {
    console.error('Update box error:', error);
    return c.json({ error: 'Gagal memperbarui kardus' }, 500);
  }
});

app.get('/api/boxes', async (c) => {
  try {
    await ensureSchema(c.env);
    const { results } = await c.env.DB.prepare(
      'SELECT id, label, created_at FROM boxes ORDER BY created_at DESC'
    ).all();
    return c.json(results);
  } catch (error) {
    console.error('List boxes error:', error);
    return c.json({ error: 'Gagal mengambil daftar kardus' }, 500);
  }
});

// Static asset fallback
app.get('*', async (c) => {
  try {
    const assetResponse = await serveStaticAsset(c.req, c.env);
    if (assetResponse) {
      return assetResponse;
    }
  } catch (error) {
    console.error('Asset fetch error:', error);
  }

  return c.text('Not Found', 404);
});

export default app;