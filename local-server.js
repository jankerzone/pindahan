const { createServer } = require('http');
const { Hono } = require('hono');
const { cors } = require('hono/cors');

// Create a simple mock environment for local development
const env = {
  DB: null, // We'll implement a simple in-memory store for local development
  ENVIRONMENT: 'development',
  __STATIC_CONTENT: null
};

// Simple in-memory storage for local development
const inMemoryDB = new Map();

const app = new Hono();

// Middleware
app.use('*', cors());

// Routes
app.get('/api/boxes/:id', async (c) => {
  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'ID kardus diperlukan' }, 400);
  }

  const box = inMemoryDB.get(id);
  if (!box) {
    return c.json({ error: 'Kardus tidak ditemukan' }, 404);
  }

  return c.json({ ...box, content: JSON.parse(box.content) });
});

app.post('/api/boxes', async (c) => {
  const { label, content } = await c.req.json();
  if (!label || !content) {
    return c.json({ error: 'Label dan content diperlukan' }, 400);
  }

  // Generate a simple 4-character ID
  const id = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  const newBox = {
    id,
    label,
    content: JSON.stringify(content),
    created_at: new Date().toISOString()
  };
  
  inMemoryDB.set(id, newBox);

  return c.json(newBox, 201);
});

app.put('/api/boxes/:id', async (c) => {
  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'ID kardus diperlukan' }, 400);
  }

  const { content } = await c.req.json();
  if (!content) {
    return c.json({ error: 'Content diperlukan' }, 400);
  }

  const existingBox = inMemoryDB.get(id);
  if (!existingBox) {
    return c.json({ error: 'Kardus tidak ditemukan' }, 404);
  }

  const updatedBox = {
    ...existingBox,
    content: JSON.stringify(content),
    updated_at: new Date().toISOString()
  };
  
  inMemoryDB.set(id, updatedBox);

  return c.json({ id, content });
});

app.get('/api/boxes', async (c) => {
  const results = Array.from(inMemoryDB.values()).map(box => ({
    id: box.id,
    label: box.label,
    created_at: box.created_at
  }));
  
  return c.json(results);
});

// Create HTTP server using Node's built-in http module
const server = createServer(async (req, res) => {
  // Convert Node.js request to Hono request
  const url = `http://${req.headers.host}${req.url}`;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await getBody(req) : undefined
  });

  // Process request with Hono app
  const response = await app.fetch(request, env);

  // Convert Hono response to Node.js response
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.statusCode = response.status;

  if (response.body) {
    for await (const chunk of response.body) {
      res.write(chunk);
    }
  }
  
  res.end();
});

// Helper function to read request body
function getBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
  });
}

const port = 3000;

console.log(`Server is running on port ${port}`);

// Start server
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});