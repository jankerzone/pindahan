# 📦 Pindahan App

Pindahan App adalah aplikasi web sederhana untuk membantu Anda mengelola dan melacak barang-barang saat pindahan. Buat ID unik untuk setiap kardus, catat isinya, dan temukan kembali dengan mudah di lokasi baru Anda.

Aplikasi ini dibangun di atas platform [Cloudflare Workers](https://workers.cloudflare.com/) dan [D1 Database](https://developers.cloudflare.com/d1/), membuatnya cepat, andal, dan skalabel.

## ✨ Fitur

- **Buat ID Unik**: Secara otomatis menghasilkan ID 4 karakter yang unik untuk setiap kardus.
- **Catat Isi Kardus**: Simpan daftar barang di dalam setiap kardus.
- **Lihat Detail**: Ambil dan lihat isi kardus dengan mudah menggunakan ID unik atau URL khusus.
- **Pencarian Real-time**: Cari item dalam kardus dengan cepat menggunakan fitur pencarian yang aktif saat mengetik.
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
    git clone https://github.com/jankerzone/pindahan.git
    cd pindahan-app
    ```

2.  **Install dependensi:**
    ```bash
    npm install
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

## ☁️ Deploy ke Cloudflare

Untuk mendeploy aplikasi ke Cloudflare Workers:

1.  **Pastikan konfigurasi database production di `wrangler.toml`:**
    ```bash
    # Periksa database_id di bagian [[d1_databases]] sudah benar
    ```

2.  **Deploy aplikasi:**
    ```bash
    npm run deploy
    ```

3.  **Terapkan skema database ke database production:**
    ```bash
    wrangler d1 execute pindahan-db --file=./worker/schema.sql
    ```

4.  **Akses aplikasi di URL yang diberikan oleh Cloudflare Workers**

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

## ✨ Fitur Baru: Pencarian Real-time

Aplikasi sekarang memiliki fitur pencarian yang memungkinkan Anda:

- **Pencarian Instan**: Mulai mengetik untuk langsung memfilter item
- **Highlight Hasil**: Teks yang cocok dengan pencarian akan ditandai
- **Pencarian Case-insensitive**: Tidak perlu khawatir dengan huruf besar/kecil
- **Tampilan Responsif**: Pesan "tidak ada hasil" jika pencarian tidak menemukan item

## 📂 Struktur Proyek

```
.
├── frontend/         # Berisi file statis untuk UI (HTML, CSS, JS)
│   ├── css/
│   │   └── style.css # Styling dengan tema modern + fitur pencarian
│   ├── js/
│   │   └── app.js    # Logika frontend + fungsi pencarian
│   └── index.html    # Halaman utama dengan input pencarian
├── worker/           # Kode Cloudflare Worker (backend)
│   ├── index.ts      # Logika utama API dan penyajian aset statis
│   └── schema.sql    # Skema database D1
├── API_DOCUMENTATION.md # Dokumentasi detail API
├── README.md         # File ini
└── wrangler.toml     # Konfigurasi Wrangler untuk deployment
```
