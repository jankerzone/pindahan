import { Hono } from "hono";
import { cors } from "hono/cors";
import { poweredBy } from "hono/powered-by";

interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  __STATIC_CONTENT: KVNamespace;
}

interface AssetManifest {
  [key: string]: string;
}

// @ts-expect-error - Import the manifest
import manifest from "__STATIC_CONTENT_MANIFEST";
const ASSET_MANIFEST = manifest ? JSON.parse(manifest) : {};
console.log("Manifest loaded:", !!manifest);
console.log("Asset manifest keys:", Object.keys(ASSET_MANIFEST));

const app = new Hono<{ Bindings: Env }>();
console.log("Worker initialized");

// Utility: generate 4-character alphanumeric id
function generateUniqueId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function ensureSchema(env: Env): Promise<void> {
  try {
    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS boxes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_boxes_id ON boxes(id)",
    ).run();
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

function getContentType(pathname: string): string {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg"))
    return "image/jpeg";
  if (pathname.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

async function serveStaticAsset(
  request: Request,
  env: Env,
): Promise<Response | null> {
  if (!env.__STATIC_CONTENT) {
    console.log("No static content binding found");
    return null;
  }

  const url = new URL(request.url);
  let pathname = url.pathname;
  console.log("Requested pathname:", pathname);

  if (pathname === "/" || pathname === "") {
    pathname = "index.html";
  } else if (pathname.startsWith("/")) {
    pathname = pathname.substring(1);
  }
  console.log("Normalized pathname:", pathname);

  const assetKey = ASSET_MANIFEST[pathname] || pathname;
  console.log("Asset key:", assetKey);
  console.log("Manifest keys:", Object.keys(ASSET_MANIFEST));
  
  const asset = await env.__STATIC_CONTENT.get(assetKey, "arrayBuffer");

  if (!asset) {
    console.log("Asset not found for key:", assetKey);
    return null;
  }

  const response = new Response(asset, {
    headers: {
      "Content-Type": getContentType(pathname),
      "Cache-Control": "public, max-age=3600",
    },
  });

  return response;
}

// Middleware
app.use("*", poweredBy());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// Routes
app.get("/api/boxes/:id", async (c) => {
  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: "ID kardus diperlukan" }, 400);
  }

  try {
    await ensureSchema(c.env);
    const box = await c.env.DB.prepare("SELECT * FROM boxes WHERE id = ?")
      .bind(id)
      .first();
    if (!box) {
      return c.json({ error: "Kardus tidak ditemukan" }, 404);
    }

    return c.json({ ...box, content: JSON.parse(box.content as string) });
  } catch (error) {
    console.error("Fetch box error:", error);
    return c.json({ error: "Gagal mengambil data kardus" }, 500);
  }
});

app.post("/api/boxes", async (c) => {
  try {
    const { label, content } = await c.req.json();
    if (!label || !content) {
      return c.json({ error: "Label dan content diperlukan" }, 400);
    }

    await ensureSchema(c.env);
    const id = generateUniqueId();
    await c.env.DB.prepare(
      "INSERT INTO boxes (id, label, content) VALUES (?, ?, ?)",
    )
      .bind(id, label, JSON.stringify(content))
      .run();

    return c.json({ id, label, content }, 201);
  } catch (error) {
    console.error("Create box error:", error);
    return c.json({ error: "Gagal membuat kardus baru" }, 500);
  }
});

app.put("/api/boxes/:id", async (c) => {
  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: "ID kardus diperlukan" }, 400);
  }

  try {
    const { content } = await c.req.json();
    if (!content) {
      return c.json({ error: "Content diperlukan" }, 400);
    }

    await ensureSchema(c.env);
    const result = await c.env.DB.prepare(
      "UPDATE boxes SET content = ? WHERE id = ?",
    )
      .bind(JSON.stringify(content), id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: "Kardus tidak ditemukan" }, 404);
    }

    return c.json({ id, content });
  } catch (error) {
    console.error("Update box error:", error);
    return c.json({ error: "Gagal memperbarui kardus" }, 500);
  }
});

app.get("/api/boxes", async (c) => {
  try {
    await ensureSchema(c.env);
    const { results } = await c.env.DB.prepare(
      "SELECT id, label, created_at FROM boxes ORDER BY created_at DESC",
    ).all();
    return c.json(results);
  } catch (error) {
    console.error("List boxes error:", error);
    return c.json({ error: "Gagal mengambil daftar kardus" }, 500);
  }
});

// URL shortening service route
app.get("/b/:id", async (c) => {
  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: "ID kardus diperlukan" }, 400);
  }
  
  // Validate ID format (should be 4 characters alphanumeric)
  if (!/^[A-Z0-9]{4}$/.test(id)) {
    // Still redirect for backward compatibility with existing URLs
    return c.redirect("/", 302);
  }
  
  // Check if box exists in database
  try {
    await ensureSchema(c.env);
    const box = await c.env.DB.prepare("SELECT id FROM boxes WHERE id = ?")
      .bind(id)
      .first();
      
    if (!box) {
      // Box not found, but still redirect to frontend for better UX
      // The frontend will handle the "not found" case
      return c.redirect(`/#${id}`, 302);
    }
  } catch (error) {
    console.error("Database error:", error);
    // Continue with redirect even if we can't verify the box exists
    // This maintains backward compatibility
  }
  
  // Redirect to hash-based URL
  return c.redirect(`/#${id}`, 302);
});

// Static asset fallback - should be placed after API routes
app.get("*", async (c) => {
  console.log("Catch-all route hit:", c.req.path);
  console.log("Request URL:", c.req.url);
  
  try {
    const assetResponse = await serveStaticAsset(c.req.raw, c.env);
    if (assetResponse) {
      console.log("Serving static asset");
      return assetResponse;
    }
  } catch (error) {
    console.error("Asset fetch error:", error);
  }

  // For SPA routing, serve index.html for non-API routes
  if (!c.req.path.startsWith("/api/") && !c.req.path.startsWith("/b/")) {
    console.log("Serving SPA fallback for path:", c.req.path);
    try {
      // Create a request for the root path to serve index.html
      const url = new URL(c.req.url);
      url.pathname = "/";
      const rootRequest = new Request(url.toString(), {
        method: "GET"
      });
      const assetResponse = await serveStaticAsset(rootRequest, c.env);
      if (assetResponse) {
        console.log("Serving SPA fallback index.html");
        return assetResponse;
      }
    } catch (error) {
      console.error("SPA fallback error:", error);
    }
  }

  console.log("Returning 404 Not Found");
  return c.text("Not Found", 404);
});

export default app;
