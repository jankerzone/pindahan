import manifestJSON from '__STATIC_CONTENT_MANIFEST';

const ASSET_MANIFEST = manifestJSON ? JSON.parse(manifestJSON) : {};

// Utility: generate 4-character alphanumeric id
function generateUniqueId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function ensureSchema(env) {
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

function jsonResponse(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });
}

function getContentType(pathname) {
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

async function serveStaticAsset(request, env) {
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    await ensureSchema(env);

    // GET /api/boxes/:id
    if (path.startsWith('/api/boxes/') && method === 'GET') {
      const boxId = path.split('/')[3];
      if (!boxId) {
        return jsonResponse({ error: 'ID kardus diperlukan' }, corsHeaders, 400);
      }

      try {
        const box = await env.DB.prepare('SELECT * FROM boxes WHERE id = ?').bind(boxId).first();
        if (!box) {
          return jsonResponse({ error: 'Kardus tidak ditemukan' }, corsHeaders, 404);
        }

        return jsonResponse(
          { ...box, content: JSON.parse(box.content) },
          corsHeaders
        );
      } catch (error) {
        console.error('Fetch box error:', error);
        return jsonResponse({ error: 'Gagal mengambil data kardus' }, corsHeaders, 500);
      }
    }

    // POST /api/boxes
    if (path === '/api/boxes' && method === 'POST') {
      try {
        const { label, content } = await request.json();
        if (!label || !content) {
          return jsonResponse({ error: 'Label dan content diperlukan' }, corsHeaders, 400);
        }

        const id = generateUniqueId();
        await env.DB.prepare('INSERT INTO boxes (id, label, content) VALUES (?, ?, ?)')
          .bind(id, label, JSON.stringify(content))
          .run();

        return jsonResponse({ id, label, content }, corsHeaders, 201);
      } catch (error) {
        console.error('Create box error:', error);
        return jsonResponse({ error: 'Gagal membuat kardus baru' }, corsHeaders, 500);
      }
    }

    // PUT /api/boxes/:id
    if (path.startsWith('/api/boxes/') && method === 'PUT') {
      const boxId = path.split('/')[3];
      if (!boxId) {
        return jsonResponse({ error: 'ID kardus diperlukan' }, corsHeaders, 400);
      }

      try {
        const { content } = await request.json();
        if (!content) {
          return jsonResponse({ error: 'Content diperlukan' }, corsHeaders, 400);
        }

        const result = await env.DB.prepare('UPDATE boxes SET content = ? WHERE id = ?')
          .bind(JSON.stringify(content), boxId)
          .run();

        if (result.changes === 0) {
          return jsonResponse({ error: 'Kardus tidak ditemukan' }, corsHeaders, 404);
        }

        return jsonResponse({ id: boxId, content }, corsHeaders);
      } catch (error) {
        console.error('Update box error:', error);
        return jsonResponse({ error: 'Gagal memperbarui kardus' }, corsHeaders, 500);
      }
    }

    // GET /api/boxes
    if (path === '/api/boxes' && method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT id, label, created_at FROM boxes ORDER BY created_at DESC'
        ).all();
        return jsonResponse(results, corsHeaders);
      } catch (error) {
        console.error('List boxes error:', error);
        return jsonResponse({ error: 'Gagal mengambil daftar kardus' }, corsHeaders, 500);
      }
    }

    // Static asset fallback
    try {
      const assetResponse = await serveStaticAsset(request, env);
      if (assetResponse) {
        return assetResponse;
      }
    } catch (error) {
      console.error('Asset fetch error:', error);
    }

    return new Response('Not Found', { status: 404 });
  }
};
