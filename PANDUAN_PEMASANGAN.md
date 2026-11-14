# Panduan Pemasangan GURU GAMES 2026 — Premium v2.0

**Pendaftaran ranting · Pembayaran gabungan · Undian TM · Bagan pertandingan**

Penyelenggara: **PGRI Cabang Kecamatan Sekotong**. Pelaksanaan lomba: **18–19 November 2026**.

> Aplikasi ini belum dipublikasikan ke akun Anda. Untuk mengumpulkan data dari banyak HP secara bersama-sama diperlukan Cloudflare Pages **dan** database D1. Demo mandiri hanya untuk mencoba fitur, bukan untuk mendaftar peserta sungguhan.

## 1. Coba demo dahulu

1. Ekstrak berkas ZIP. Buka `DEMO_OFFLINE.html` dengan Chrome/Edge pada laptop, atau gunakan tautan demo yang diberikan terpisah.
2. Pada menu **Pendaftaran**, tulis contoh nama ranting yang **belum ada**, misalnya `Ranting Uji Saya`.
3. Centang pilihan **Futsal Putra**, **Gobak Sodor Putri**, dan **Tarik Tambang**. Perhatikan empat bagian nama pemain: futsal, gobak sodor, tarik tambang putra, tarik tambang putri.
4. Isi paling sedikit satu nama percobaan pada **setiap tim**. Untuk menambah anggota, tekan **Tambah anggota** pada bagian tim terkait. Jumlah sebenarnya mengikuti juknis panitia, maksimal 30 nama per tim dalam aplikasi.
5. Periksa **Ringkasan Pendaftaran**. Ketiga cabang menghasilkan **Rp400.000** (150.000 + 100.000 + paket 150.000). Pilih bayar langsung atau transfer.
6. Tekan **Daftarkan semua tim**. Simpan kode pendaftaran dari layar berhasil. Lihat **Daftar Tim**; keempat tim telah muncul dengan status **Belum lunas**.
7. Buka menu **Panitia**. Kata sandi khusus demo adalah **`demo81`**. Lihat tab **Data & Pembayaran**: satu baris ranting berisi semua kategori dan satu tagihan.
8. Tandai status **Lunas**. Lihat Daftar Tim; status empat tim dari ranting yang sama akan ikut berubah.
9. Buka **Undian TM**. Pilih kategori, tekan **Mulai sesi undian**, kemudian tekan **Undi nama berikutnya** sampai semua tim mendapat nomor.
10. Buka **Bagan Lomba**. Ubah jam/lapangan/skor melalui tombol **ATUR** sebagai panitia dan tetapkan pemenang via **Pilih ✓**. Gunakan **Cetak bagan** bila perlu.
11. Buka layar undian di IFP/laptop lalu tekan **Tayangkan layar penuh**. Perwakilan ranting dapat bergantian menekan tombol pada perangkat yang sudah login panitia.
12. Gunakan **Reset Data Demo** di beranda jika ingin mengulang simulasi dari awal.

**Penting:** demo menyimpan data pada browser yang dibuka, bukan pada database online. Data contoh tidak akan pindah ke versi resmi.

## 2. Pahami struktur biaya dan kategori

| Pilihan di formulir | Nama tim yang dibentuk | Tagihan |
|---|---|---:|
| Futsal | Futsal Putra | Rp150.000 |
| Gobak Sodor | Gobak Sodor Putri | Rp100.000 |
| Tarik Tambang | Tarik Tambang Putra **dan** Tarik Tambang Putri | Rp150.000 (satu paket) |
| Pilih ketiganya | Empat tim dalam satu pendaftaran | **Rp400.000** |

Tidak ada penggandaan tarif tarik tambang. Tim putra dan putri tetap mempunyai **undian dan bagan yang berbeda**. Data yang sudah terdaftar mendapat satu kode dan satu status pembayaran. Angka ini sudah disetel sejak awal dan juga bisa diubah di **Panitia → Pengaturan**.

## 3. Buat repository baru di GitHub

1. Unduh ZIP aplikasi lengkap, kemudian ekstrak ke folder laptop.
2. Buka `github.com` dan login ke akun yang Anda pilih untuk proyek ini.
3. Buat repository baru, misalnya `guru-games-sekotong-2026` (boleh **Private** atau **Public**; password tidak disimpan di kode).
4. Unggah **isi folder** `pgri-sekotong-81/` ke akar repository. Jangan unggah satu folder pembungkus tambahan yang membuat `public/` dan `functions/` tersembunyi di dalam subfolder lain.
5. Setelah Commit, periksa bahwa pada halaman awal repository terlihat `public`, `functions`, `schema.sql`, `README.md`, dan `PANDUAN_PEMASANGAN.md`.
6. `DEMO_OFFLINE.html` bisa tetap berada di akar repository: tidak masuk ke folder `public` sehingga tidak menjadi halaman produksi.

**Struktur penting:**

```text
/                       ← akar repository
  public/index.html
  public/app.js
  public/styles.css
  public/assets/...
  public/_routes.json
  functions/api/[[path]].js
  schema.sql
```

Pastikan **bukan** `public/functions/` dan **bukan** `pgri-sekotong-81/pgri-sekotong-81/public/` jika Root directory nanti menggunakan default.

## 4. Buat database Cloudflare D1

1. Login ke `dash.cloudflare.com`.
2. Buka **Storage & Databases → D1 SQL Database**. Nama menu dapat berbeda sedikit sesuai antarmuka saat itu.
3. Pilih **Create database**. Beri nama, misalnya `guru-games-sekotong-2026`.
4. Setelah database dibuat, buka **Console** SQL-nya.
5. Buka berkas `schema.sql` dari folder ZIP, salin seluruh isi, tempelkan di console D1 dan jalankan. Jika console membatasi beberapa pernyataan sekaligus, jalankan satu blok SQL tiap kali secara berurutan.
6. Pastikan ada tabel `settings`, `registrations`, `teams`, `draw_states`, `draw_slots`, `match_winners`, dan `match_details`.
7. Tabel `draw_states` semestinya berisi empat kategori sejak awal. Tabel `registrations` dan `teams` semestinya **kosong**.

> Jangan menghapus atau membuat ulang tabel ketika peserta resmi sudah mendaftar. Skema ini khusus instalasi baru v2.0, bukan migrasi otomatis database versi 1.

## 5. Hubungkan GitHub ke Cloudflare Pages

1. Pilih **Workers & Pages → Create application → Pages → Connect to Git** (nama menu dapat berubah).
2. Berikan izin Cloudflare untuk mengakses repository GitHub yang dibuat di langkah 3, lalu pilih repository tersebut.
3. Pada konfigurasi deploy, isi:

   | Kolom | Nilai |
   |---|---|
   | Project name | `guru-games-sekotong` atau nama tersedia lainnya |
   | Framework preset | None |
   | Build command | Kosong (atau `exit 0` jika diminta) |
   | Build output directory | `public` |
   | Root directory | Kosong / default (akar repository) |
   | Production branch | `main` (atau nama branch utama sebenarnya) |

4. Jalankan deploy. Setelah berhasil, alamat publik akan tampil sebagai `https://NAMA-PROYEK.pages.dev`.
5. **Jangan langsung menyebar alamat itu.** Website visual mungkin telah terbuka, tetapi pendaftaran belum bekerja hingga DB dan password tersambung.

Gunakan **Git integration**, bukan sekadar upload file HTML. Folder `functions/` berisi backend untuk menerima data dan mengundi tim.

## 6. Sambungkan D1 ke Pages (nama wajib DB)

1. Buka **Workers & Pages → proyek Guru Games → Settings → Bindings**.
2. Klik **Add binding → D1 database**.
3. Pada Variable name, isi persis **`DB`** (huruf besar semua).
4. Pilih database yang dibuat pada langkah 4, lalu Save.
5. Jika ada lingkungan Production dan Preview, pastikan binding Production terisi. Bila ingin uji Preview, atur juga binding Preview yang sesuai.

Jika binding bukan `DB`, aplikasi akan menampilkan kesalahan database belum terhubung.

## 7. Pasang password rahasia panitia

Masih di pengaturan proyek, buka bagian **Variables and Secrets** atau **Environment variables**. Tambahkan dua **secret**:

| Nama variabel wajib | Isi | Catatan |
|---|---|---|
| `ADMIN_PASSWORD` | Kata sandi buatan panitia sendiri | Jangan `demo81`; gunakan kombinasi panjang dan sulit ditebak |
| `SESSION_SECRET` | Teks acak rahasia minimal 32 karakter | Harus berbeda dari password panitia |

Pastikan nilainya diperlakukan sebagai **Secret/Encrypted**. Jangan masukkan ke GitHub, HTML, JavaScript frontend, atau panduan publik. Setelah mengisi DB dan secrets, pilih **Redeploy** pada deployment Cloudflare agar binding baru aktif.

## 8. Setel biaya dan rekening dari panel panitia

1. Buka URL produksi, klik **Panitia**, dan login dengan password `ADMIN_PASSWORD`.
2. Buka tab **Pengaturan** dan lengkapi **Nama Bank**, **Nomor Rekening**, **Nama Pemilik Rekening**, **Kontak Panitia**, lokasi, informasi pembayaran tunai, dan pilihan nama ranting (opsional, satu nama per baris).
3. Pastikan nominal awal:
   - `Futsal Putra`: **150000**
   - `Gobak Sodor Putri`: **100000**
   - `Tarik Tambang Putra + Putri`: **150000**
4. Angka harus diketik **tanpa titik dan tanpa Rp**. Klik **Simpan pengaturan**.
5. Pastikan **Pendaftaran sedang dibuka** dicentang. Lihat kembali beranda/pendaftaran untuk memeriksa nominal dan nomor rekening.
6. Jika nominal diubah kemudian, perubahan berlaku untuk pendaftar **baru**. Tagihan pendaftar lama tidak dihitung ulang, kecuali terjadi perubahan tim yang dicatat panitia dan disesuaikan menurut tarif saat mereka mendaftar.

Nomor rekening bukan pembayaran otomatis. Metode transfer memberi instruksi dan tagihan; **panitia tetap memverifikasi secara manual** apakah uang sudah diterima.

## 9. Jalankan pendaftaran resmi

1. Bagikan URL Pages dari aplikasi yang **telah terhubung ke D1** kepada masing-masing perwakilan ranting.
2. Perwakilan mengetik nama ranting dan memilih satu atau beberapa cabang lomba.
3. Nama ranting bisa dipilih dari daftar saran yang diisi panitia atau diketik sendiri. Jika memilih **Tarik Tambang**, aplikasi otomatis menampilkan dua subform: **Putra** dan **Putri**, keduanya harus diisi.
4. Isi nama peserta per tim; jumlah mengikuti ketentuan panitia. Isi kontak penanggung jawab bila ada.
5. Pilih **Bayar Langsung** atau **Transfer**, periksa total tagihan, kemudian tekan **Daftarkan semua tim** satu kali.
6. Simpan kode pendaftaran yang muncul. Nama ranting dan tim akan muncul dalam **Daftar Tim** meskipun pembayaran belum lunas.
7. Panitia mengonfirmasi transfer atau pembayaran langsung, lalu ubah status ranting tersebut pada **Panel Panitia → Data & Pembayaran** menjadi **Lunas**.
8. Jika ranting sudah terdaftar, aplikasi menolak pendaftaran ganda. Panitia bisa mengedit nama anggota dan data tim sebelum undian. **Penambahan kategori yang terlupa ke pendaftaran lama belum tersedia sebagai tombol terpisah**, sehingga koordinasikan dulu dengan panitia sebelum undian.

**Catatan privasi:** tautan publik menampilkan jumlah pemain, ranting dan status; daftar lengkap nama pemain hanya dilihat petugas yang berhasil login sebagai panitia.

## 10. Pengundian TM yang terbuka

1. Sebelum TM, lakukan backup daftar tim/keuangan dengan tombol **Ekspor Tim** dan **Ekspor Keuangan** di panel panitia. Bila perlu, ekspor cadangan database D1.
2. Tutup pendaftaran di **Pengaturan** agar tidak ada tim baru masuk saat undian berlangsung.
3. Sambungkan laptop panitia ke IFP atau proyektor, buka URL aplikasi, login sebagai panitia.
4. Buka **Undian TM**, pilih salah satu kategori dari empat pilihan (Futsal Putra, Gobak Sodor Putri, Tarik Tambang Putra, Tarik Tambang Putri).
5. Tekan **Tayangkan layar penuh**. Untuk suara tombol, aktifkan pengaturan **♫ Suara** di header sebelum masuk layar penuh jika perangkat mendukung audio browser.
6. Tekan **Mulai sesi undian**. Minimal perlu **2 tim** pada kategori tersebut.
7. Persilakan perwakilan ranting bergantian menekan **Undi nama berikutnya** pada layar panitia, agar terlihat adil. Server memilih satu tim secara acak dari yang belum keluar.
8. Setelah semua tim terundi, buka **Bagan Lomba** kategori itu. Bagan otomatis muncul dan menempatkan `BYE` jika jumlah peserta bukan 2, 4, 8, 16, dan seterusnya.
9. Ulangi untuk empat kategori. Perangkat penonton dapat membuka URL dan menyaksikan hasil, tetapi **tidak dapat menekan tombol undian dari HP mereka sendiri** tanpa akses panitia.

**Reset undian** akan menghilangkan semua nomor undian, skor, dan hasil pemenang di kategori tersebut. Gunakan hanya jika diputuskan bersama pada TM.

## 11. Pertandingan 18–19 November 2026

- Pada tiap bagan, panitia dapat memilih **ATUR** untuk menetapkan tanggal 18/19, jam, lapangan/lokasi, skor, dan catatan.
- Untuk setiap pertandingan yang mempunyai dua tim, klik **Pilih ✓** pada tim pemenang. Tim tersebut otomatis maju ke babak berikutnya.
- Tim yang memperoleh **BYE** maju otomatis tanpa pertandingan pada putaran pertama.
- Cetak bagan pada menu **Bagan Lomba → Cetak bagan** atau tampilkan langsung di layar.
- Hindari perubahan pemenang babak awal setelah babak berikutnya dimulai; jika harus diubah, sistem menghapus pemenang babak-babak berikutnya untuk menghindari bagan tidak konsisten.

## 12. Pembaruan, pemeliharaan, dan backup

- Untuk memperbaiki tampilan pada website yang sudah dipasang, edit atau unggah ulang file sesuai struktur ke **repository GitHub yang sama**. Cloudflare akan melakukan deployment baru; URL tidak perlu berubah selama proyek Cloudflare sama.
- Data peserta tidak ikut tersimpan di GitHub; semuanya ada di **Cloudflare D1**, sehingga memperbarui frontend tidak menghapus database.
- Jangan menjalankan `DROP TABLE`, menghapus D1, atau mengganti binding ke database baru ketika sudah ada pendaftar.
- Sebelum TM dan setelah lomba, simpan ekspor tim/keuangan dan buat backup D1 melalui fitur Cloudflare yang tersedia.
- Jika pendaftaran ramai, pertimbangkan **Cloudflare Turnstile atau rate limiting** untuk membatasi spam karena formulir masih terbuka tanpa login peserta.
- Satu ranting hanya bisa mempunyai satu pendaftaran aktif dalam versi ini.

## 13. Checklist wajib sebelum tautan disebarkan

- [ ] Website terlihat bagus di **HP, laptop, dan IFP** tanpa kolom terpotong.
- [ ] Logo, poster, dan ilustrasi cabang lomba muncul.
- [ ] Pendaftaran tes **4 tim satu ranting** menghasilkan **Rp400.000**.
- [ ] Tim muncul pada Daftar Tim walaupun belum lunas.
- [ ] Panitia dapat login; password demo **tidak dapat** login ke produksi.
- [ ] Nama rekening dan kontak sudah benar.
- [ ] Satu status lunas mengubah seluruh tim dari ranting yang sama.
- [ ] Simulasi undian dan bagan berhasil untuk tim 3, 5, atau 7 (BYE sesuai).
- [ ] Jadwal, hasil, cetak bagan dan ekspor CSV berhasil.
- [ ] Semua data **tes di produksi** dibersihkan sebelum pendaftaran resmi dibuka.
- [ ] Tautan peserta dibagikan setelah panitia menyatakan sudah siap.

**Dokumen ini untuk versi baru v2.0 yang belum pernah dipasang.** Jika kelak ingin migrasi dari database versi lama, diperlukan skrip migrasi tersendiri, bukan menjalankan skema ini di atas data lama.
