# Dokumentasi API Pindahan App

## Deskripsi
API Pindahan App adalah layanan untuk mengelola data kardus saat pindahan. API ini memungkinkan pengguna untuk membuat kardus baru dengan ID unik dan mengambil detail isi kardus berdasarkan ID tersebut.

## Base URL
```
http://localhost:8787/api
```

## Endpoint

### 1. Membuat Kardus Baru
```
POST /api/boxes
```

#### Request Body
```json
{
  "label": "string",
  "content": ["string"]
}
```

#### Response
```json
{
  "id": "string",
  "label": "string",
  "content": ["string"]
}
```

#### Contoh Request
```bash
curl -X POST http://localhost:8787/api/boxes \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Dapur - Piring Pecah Belah",
    "content": ["piring", "mangkuk", "gelas"]
  }'
```

#### Contoh Response
```json
{
  "id": "A1B2",
  "label": "Dapur - Piring Pecah Belah",
  "content": ["piring", "mangkuk", "gelas"]
}
```

### 2. Mengambil Detail Kardus
```
GET /api/boxes/{id}
```

#### Parameter
- `id` (string, required): ID unik kardus

#### Response
```json
{
  "id": "string",
  "label": "string",
  "content": ["string"],
  "created_at": "string"
}
```

#### Contoh Request
```bash
curl http://localhost:8787/api/boxes/A1B2
```

#### Contoh Response
```json
{
  "id": "A1B2",
  "label": "Dapur - Piring Pecah Belah",
  "content": ["piring", "mangkuk", "gelas"],
  "created_at": "2023-01-01T00:00:00Z"
}
```

### 3. Mengambil Daftar Semua Kardus
```
GET /api/boxes
```

#### Response
```json
[
  {
    "id": "string",
    "label": "string",
    "created_at": "string"
  }
]
```

#### Contoh Request
```bash
curl http://localhost:8787/api/boxes
```

#### Contoh Response
```json
[
  {
    "id": "A1B2",
    "label": "Dapur - Piring Pecah Belah",
    "created_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "C3D4",
    "label": "Kamar Tidur - Pakaian",
    "created_at": "2023-01-01T00:00:00Z"
  }
]
```

## Struktur Database
```sql
CREATE TABLE boxes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Cara Menjalankan API

1. Pastikan Anda telah menginstal Wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Login ke Cloudflare:
   ```bash
   wrangler login
   ```

3. Buat database D1:
   ```bash
   wrangler d1 create pindahan-db-local
   ```

4. Terapkan schema database:
   ```bash
   wrangler d1 execute pindahan-db-local --file=worker/schema.sql --env dev
   ```

5. Jalankan development server:
   ```bash
   wrangler dev --env dev
   ```

## Error Handling

| Kode | Pesan Error | Deskripsi |
|------|-------------|-----------|
| 400 | Bad Request | Data yang dikirim tidak valid |
| 404 | Not Found | Kardus dengan ID tersebut tidak ditemukan |
| 500 | Internal Server Error | Terjadi kesalahan di server |

## Contoh Penggunaan Frontend

1. Membuka aplikasi di browser:
   ```
   http://localhost:8787
   ```

2. Mengisi form dengan:
   - Label Kardus: "Dapur - Piring Pecah Belah"
   - Isi Kardus: "piring, mangkuk, gelas"

3. Setelah disubmit, akan muncul ID unik seperti "A1B2"

4. Untuk melihat isi kardus di rumah baru:
   ```
   http://localhost:8787#A1B2
   ```