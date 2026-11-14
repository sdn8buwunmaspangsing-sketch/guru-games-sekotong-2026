# GURU GAMES 2026 · Premium v2.0
**PGRI Cabang Kecamatan Sekotong · Hari Guru Nasional dan HUT ke-81 PGRI · 18–19 November 2026**

Aplikasi web untuk pendaftaran gabungan satu ranting, verifikasi satu tagihan, pengundian langsung Technical Meeting (TM), dan bagan pertandingan empat kategori.

## Skema biaya resmi yang diterapkan

| Cabang yang dipilih | Tim dalam pendaftaran | Biaya default |
|---|---:|---:|
| Futsal putra | 1 | Rp150.000 |
| Gobak sodor putri | 1 | Rp100.000 |
| Tarik tambang (paket) | 2: putra dan putri | Rp150.000 |
| Ketiganya | 4 | **Rp400.000** |

Satu ranting dapat memilih satu, dua, atau tiga jenis lomba. Pilihan tarik tambang **selalu membuka dua tim**: putra dan putri. Jumlah orang per tim dapat diisi sendiri mengikuti juknis panitia, maksimal 30 per tim. Ranting memperoleh satu kode pendaftaran, satu total biaya, dan satu status pembayaran.

## Fitur

- Beranda ilustratif memakai materi resmi HGN/HUT ke-81, logo PGRI Cabang Sekotong & KKG PJOK
- Formulir kategori multi-pilihan, daftar anggota per tim, dan subtotal yang diperbarui otomatis
- Biaya divalidasi kembali di server Cloudflare Functions, tidak mengikuti nominal kiriman browser
- Pendaftar masuk walaupun belum bayar, dan panitia memverifikasi pembayaran manual per ranting
- Pengaturan pilihan nama ranting, rekening, bank, atas nama, biaya tiga cabang, narahubung, lokasi dan buka/tutup pendaftaran
- Undian acak yang dijalankan server, dioperasikan panitia atau perwakilan pada perangkat panitia
- Bagan sistem gugur otomatis untuk empat kategori, termasuk bye untuk jumlah peserta bukan pangkat dua
- Jadwal 18–19 November, jam, lapangan, skor, pemenang, cetak bagan, dan ekspor CSV tim/keuangan
- Dukungan HP, laptop dan IFP; layar penuh untuk TM; tombol suara undian opsional
- Data anggota lengkap hanya di panel panitia; publik hanya melihat ranting, kategori, jumlah anggota dan status
- Kode sumber frontend, backend, dan ilustrasi dipisah agar mudah diperbarui tanpa mengganti database

## Struktur paket

```text
pgri-sekotong-81/
├── public/
│   ├── index.html          # Website
│   ├── styles.css          # Tampilan
│   ├── app.js              # Logika antarmuka / demo
│   ├── _routes.json
│   └── assets/             # Ilustrasi poster, tiga panel olahraga, dan logo
├── functions/api/[[path]].js  # API Pages Functions
├── schema.sql             # Skema D1, versi baru untuk instalasi pertama
├── tests/smoke.mjs        # Pengujian backend lokal
├── scripts/build_demo.py  # Membuat demo mandiri
├── DEMO_OFFLINE.html       # Demo mandiri, data contoh hanya tersimpan pada browser
├── PANDUAN_PEMASANGAN.md
├── PANDUAN_PEMASANGAN.html
└── README.md
```

## Instalasi

Gunakan Git integration pada **Cloudflare Pages** dengan **Root directory** di akar repository, **Build command** kosong, **Build output directory** `public`. Buat D1 baru dan jalankan isi `schema.sql`; sambungkan ke Pages melalui D1 binding bernama persis `DB`. Tambahkan dua secret: `ADMIN_PASSWORD` dan `SESSION_SECRET`, kemudian redeploy.

**Belum terpasang?** Lihat `PANDUAN_PEMASANGAN.html` dalam paket untuk langkah satu per satu. Setelah online, nomor rekening dan biaya dapat diubah langsung pada menu **Panitia → Pengaturan**.

**Demo:** buka `DEMO_OFFLINE.html` menggunakan Chrome/Edge. Kata sandi demo: `demo81`. Demo tidak mengirim data ke D1. Password tersebut **bukan** password untuk produksi.

## Pembaruan dan keamanan

- Panduan ini untuk instalasi baru. Skema v2 tidak dirancang untuk menggantikan isi database versi lama secara langsung.
- Jika sudah terpasang melalui GitHub, perubahan file `public/` otomatis dapat dideploy tanpa mengganti alamat website. Data D1 tetap terpisah.
- Jangan memasukkan password atau rekening rahasia ke kode publik; rekening pembayaran memang ditampilkan secara publik setelah diisi admin.
- Tindakan admin memerlukan login berbasis cookie HttpOnly dan secret di Cloudflare. Tambahkan Cloudflare Turnstile/rate-limit untuk situs dengan trafik publik besar.
- Pendaftaran satu ranting hanya dapat dilakukan **sekali**. Jika perlu mengubah daftar pemain, panitia dapat edit. Untuk menambah kategori yang terlewat, hubungi panitia sebelum undian; versi ini belum menyediakan tombol menambah kategori ke pendaftaran yang sudah dikirim.
- Pendaftaran kategori yang undiannya sudah dimulai terkunci. Reset undian menghapus seluruh hasil kategori tersebut.
- Pembayaran adalah catatan manual, **bukan** payment gateway atau deteksi transfer otomatis.
- Perangkat peserta dapat menyaksikan hasil dari link yang sama. **Tombol undian dikendalikan dari perangkat panitia**, bukan tombol jarak jauh di HP setiap perwakilan.

## Pengujian

Backend telah diuji dengan Node 22 (`node --experimental-sqlite tests/smoke.mjs`) untuk pendaftaran 4 tim sekaligus, tagihan Rp400.000, duplikasi ranting, status lunas, tarif baru, undian, jadwal, reset, dan perubahan tagihan saat tim dihapus. **Validasi tampilan manual di HP/IFP dan Cloudflare produksi tetap diperlukan** karena lingkungan pengerjaan tidak bisa menjalankan browser untuk visual check.
