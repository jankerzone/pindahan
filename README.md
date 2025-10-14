# 📦 Pindahan App

Pindahan App adalah aplikasi web sederhana untuk membantu Anda mengelola dan melacak barang-barang saat pindahan. Buat ID unik untuk setiap kardus, catat isinya, dan temukan kembali dengan mudah di lokasi baru Anda.

Aplikasi ini dibangun di atas platform [Cloudflare Workers](https://workers.cloudflare.com/) dan [D1 Database](https://developers.cloudflare.com/d1/), membuatnya cepat, andal, dan skalabel.

## ✨ Fitur

- **Buat ID Unik**: Secara otomatis menghasilkan ID 4 karakter yang unik untuk setiap kardus.
- **Catat Isi Kardus**: Simpan daftar barang di dalam setiap kardus.
- **Lihat Detail**: Ambil dan lihat isi kardus dengan mudah menggunakan ID unik atau URL khusus.
- **Antarmuka Sederhana**: Frontend yang bersih dan mudah digunakan untuk input data dan pencarian.
- **Pembaruan Item**: Tambahkan item baru ke dalam kardus yang sudah ada setelah dibuat.

## 🛠️ Teknologi yang Digunakan

- **Backend**: Cloudflare Workers (JavaScript)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Deployment**: Cloudflare Wrangler CLI

## 🚀 Cara Memulai

Untuk menjalankan proyek ini secara lokal, Anda memerlukan [Node.js](https://nodejs.org/) dan [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/).

1.  **Clone repositori ini:**
    ```bash
    git clone <URL_REPOSITORI_ANDA>
    cd pindahan-app
    ```

2.  **Install dependensi (jika ada, untuk proyek ini tidak ada):**
    ```bash
    # Tidak ada langkah instalasi npm untuk proyek ini
    ```

3.  **Login ke akun Cloudflare Anda:**
    ```bash
    wrangler login
    ```

4.  **Buat database D1 untuk pengembangan lokal:**
    ```bash
    wrangler d1 create pindahan-db-local
    ```
    *Catatan: Pastikan nama database (`pindahan-db-local`) sesuai dengan yang ada di `wrangler.toml` pada bagian `[env.dev]`.*

5.  **Terapkan skema database ke database lokal:**
    ```bash
    wrangler d1 execute pindahan-db-local --file=./worker/schema.sql
    ```

6.  **Jalankan server pengembangan Wrangler:**
    ```bash
    wrangler dev
    ```

7.  Buka browser dan akses `http://localhost:8787`.

## 📝 API Endpoints

API diekspos di bawah path `/api`.

| Metode | Endpoint          | Deskripsi                               |
| :----- | :---------------- | :-------------------------------------- |
| `POST` | `/api/boxes`      | Membuat kardus baru dengan label & isi. |
| `GET`  | `/api/boxes`      | Mengambil daftar semua kardus.          |
| `GET`  | `/api/boxes/{id}` | Mengambil detail satu kardus.           |
| `PUT`  | `/api/boxes/{id}` | Memperbarui isi dari kardus yang ada.   |

Untuk dokumentasi API yang lebih detail, silakan lihat file [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## 🗄️ Skema Database

Aplikasi ini menggunakan satu tabel `boxes` untuk menyimpan semua data.

```sql
CREATE TABLE IF NOT EXISTS boxes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    content TEXT NOT NULL, -- Disimpan sebagai JSON string
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boxes_id ON boxes(id);
```

## 📂 Struktur Proyek

```
.
├── frontend/         # Berisi file statis untuk UI (HTML, CSS, JS)
│   ├── css/
│   ├── js/
│   └── index.html
├── worker/           # Kode Cloudflare Worker (backend)
│   ├── index.js      # Logika utama API dan penyajian aset statis
│   └── schema.sql    # Skema database D1
├── API_DOCUMENTATION.md # Dokumentasi detail API
├── README.md         # File ini
└── wrangler.toml     # Konfigurasi Wrangler untuk deployment
```
