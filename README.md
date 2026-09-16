# AkunStore

Toko akun media sosial & lisensi digital. Login Google (better-auth),
stok akun disimpan di Supabase, pembayaran via DOKU Checkout, dan
kredensial akun otomatis dikirim ke email pembeli setelah pembayaran
sukses.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres) — tabel produk, stok, pesanan
- better-auth — login Google, sesi disimpan di Postgres yang sama
- DOKU Checkout — payment gateway (VA, e-wallet, kartu, dst.)
- Resend — kirim email invoice + kredensial

## 1. Setup Supabase

1. Buat project baru di https://supabase.com.
2. Buka **SQL Editor**, jalankan isi `supabase/schema.sql`.
3. Ambil `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` dari
   **Project Settings > API** (pakai **service_role**, bukan anon key).
4. Ambil connection string di **Project Settings > Database >
   Connection string > Transaction pooler** (port `6543`,
   `?pgbouncer=true`) — dipakai better-auth, WAJIB pooler kalau deploy
   ke Vercel (serverless).

## 2. Setup Google OAuth

1. Buka https://console.cloud.google.com/apis/credentials.
2. Buat OAuth Client ID tipe **Web application**.
3. Authorized redirect URI:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://domainkamu.com/api/auth/callback/google`
4. Salin Client ID & Client Secret ke `.env`.

## 3. Setup DOKU

1. Login ke DOKU Back Office (sandbox: https://sandbox.doku.com/bo/login).
2. Ambil `Client Id` & `Secret Key` di menu Integration.
3. Set **Notification URL** ke:
   `https://domainkamu.com/api/doku/webhook`
   (harus persis, path ini dipakai untuk verifikasi signature).
4. Isi `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY` di `.env`. `DOKU_IS_PRODUCTION=false`
   selama masih sandbox, ganti `true` setelah akun production disetujui DOKU.
5. Test pembayaran pakai simulator sandbox:
   https://sandbox.doku.com/integration/simulator/

## 4. Setup Email (pakai akun Gmail, bukan domain custom)

Email dikirim lewat SMTP Gmail biasa pakai **App Password** (bukan
password akun Gmail kamu sehari-hari).

1. Aktifkan verifikasi 2 langkah dulu di akun Gmail yang mau dipakai:
   https://myaccount.google.com/security → **Verifikasi 2 Langkah**.
   App Password cuma bisa dibuat kalau ini sudah aktif.
2. Buka https://myaccount.google.com/apppasswords
3. Buat App Password baru (nama bebas, mis. "AkunStore"), Google akan
   kasih kode 16 karakter — itu yang dipakai, bukan password Gmail asli.
4. Isi di `.env.local`:
   - `GMAIL_USER` → alamat Gmail kamu, mis. `tokokamu@gmail.com`
   - `GMAIL_APP_PASSWORD` → kode 16 karakter tadi (boleh dengan/tanpa spasi)
   - `EMAIL_FROM_NAME` → nama pengirim yang muncul di inbox pembeli

Catatan: Gmail SMTP ada limit ± 500 email/hari untuk akun biasa —
lebih dari cukup untuk toko kecil-menengah. Kalau nanti volumenya
sudah tinggi, tinggal ganti isi `src/lib/email.ts` ke provider lain
(Resend, SendGrid, dll.) tanpa mengubah bagian lain aplikasi.

## 5. Environment Variables

Salin `.env.example` ke `.env.local`, isi semua nilainya.
`BETTER_AUTH_SECRET` generate dengan: `openssl rand -base64 32`.
`ADMIN_EMAILS` diisi email Google kamu (pemisah koma) — email di daftar
ini yang bisa akses `/admin`.

## 6. Migrasi tabel better-auth

Setelah `.env.local` terisi dan `supabase/schema.sql` sudah dijalankan:

```bash
npm install
npm run auth:migrate
```

Perintah ini membuat tabel `user`, `session`, `account`, `verification`
di database Supabase yang sama (dipakai better-auth).

## 7. Jalankan lokal

```bash
npm run dev
```

Buka http://localhost:3000. Untuk test webhook DOKU secara lokal,
tunnel dulu (mis. `ngrok http 3000`) dan set Notification URL DOKU ke
URL ngrok + `/api/doku/webhook`.

## 8. Cara pakai admin

1. Login pakai email yang ada di `ADMIN_EMAILS`.
2. Buka `/admin/products` → tambah produk (nama, harga, durasi default).
3. Buka `/admin/stock` → pilih produk, isi **email, password, durasi**
   akun yang mau distok (atau tempel banyak sekaligus lewat form bulk,
   format per baris: `email;password;catatan`).
4. Stok otomatis berkurang saat ada pembayaran sukses, dan kredensial
   otomatis terkirim ke email pembeli.

## 9. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import project di https://vercel.com/new.
3. Isi semua environment variables dari `.env.example` (pakai URL
   production untuk `NEXT_PUBLIC_APP_URL` dan `BETTER_AUTH_URL`).
4. Deploy.
5. Update redirect URI Google OAuth & Notification URL DOKU ke domain
   production.
6. Jalankan `npm run auth:migrate` sekali dari lokal (dengan `DATABASE_URL`
   production) untuk membuat tabel auth di database production.

## Update database yang sudah pernah di-deploy

Kalau sebelumnya kamu sudah pernah menjalankan `supabase/schema.sql`
versi lama (sebelum ada sistem reservasi stok), jalankan file
**`supabase/migration_reserve_stock.sql`** di SQL Editor Supabase sekali
saja. Aman dijalankan berkali-kali, dan tidak menghapus data yang sudah ada.

## Cara kerja anti-tabrakan stok

Sebelumnya stok baru dijatah pas pembayaran sukses — itu artinya kalau
stok tinggal 1 dan 2 orang checkout produk yang sama nyaris bersamaan,
keduanya bisa lanjut bayar, padahal yang bisa dapat barang cuma 1.

Sekarang alurnya:

1. **Checkout dibuat** → stok langsung **direservasi** (status
   `reserved`) SEBELUM diarahkan ke halaman bayar DOKU. Begitu
   direservasi, item itu langsung hilang dari hitungan "stok tersedia"
   buat pembeli lain.
2. Kalau stok gak cukup buat direservasi (kalah cepat sama pembeli
   lain), checkout langsung ditolak dengan pesan jelas — **sebelum**
   sempat bayar, bukan sesudahnya.
3. Reservasi berlaku 60 menit (sama dengan batas waktu bayar DOKU).
   Kalau gak jadi dibayar, reservasi otomatis lepas balik ke tersedia
   begitu ada pembeli lain coba checkout produk yang sama (self-healing,
   gak butuh cron). Ada juga cron opsional (`vercel.json` +
   `/api/cron/expire-orders`) yang aktif melepas reservasi basi setiap
   15 menit + menandai order jadi `expired`, biar stok gak nyangkut
   lama walau gak ada pembeli lain yang trigger.
4. Pas pembayaran sukses (lewat webhook ATAU tombol "Tandai Lunas
   Manual"), reservasi itu **difinalisasi** jadi `sold` — bukan ambil
   stok baru — jadi pembeli pasti dapat barang yang sama persis yang
   sempat "dikunci" buat dia dari awal.

## Tombol "Tandai Lunas Manual"

Ada di `/admin/orders`, buat kasus pembeli sudah bayar tapi webhook DOKU
gagal/belum sempat diproses (mis. Notification URL belum diset dengan
benar). **Selalu cek dulu status transaksinya di dashboard DOKU**
sebelum klik tombol ini — jangan cuma percaya omongan pembeli. Tombol
ini pakai fungsi database yang sama dengan webhook, jadi tetap aman
dari tabrakan stok dan otomatis kirim email invoice + kredensial.

## Catatan penting lainnya

- Semua akses ke tabel Supabase (produk/stok/pesanan) lewat
  **service role key di server** — tidak pernah lewat browser. Jangan
  taruh `SUPABASE_SERVICE_ROLE_KEY` di kode client atau env
  `NEXT_PUBLIC_*`.
- Webhook DOKU mengabaikan status `FAILED` sesuai rekomendasi resmi
  DOKU Checkout (customer masih bisa ganti metode bayar di halaman
  checkout mereka).
- Vercel Cron di paket gratis (Hobby) punya batasan frekuensi yang
  bisa berubah sewaktu-waktu — cek dokumentasi Vercel terbaru kalau
  cron di atas ternyata tidak jalan sesuai jadwal. Sistem tetap aman
  tanpa cron ini karena reservasi basi otomatis lepas sendiri (lihat
  penjelasan di atas), cron cuma mempercepat pelepasannya.
