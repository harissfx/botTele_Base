# Telegram Downloader Bot

Bot Telegram buat download video/audio (YouTube, TikTok, Instagram, Facebook, Twitter/X) pakai [yt-dlp](https://github.com/yt-dlp/yt-dlp) — jalan **lokal di server/laptop kamu sendiri**, tanpa API pihak ketiga berbayar.

## ✨ Fitur

- Download video (pilih kualitas 360p/720p/1080p/terbaik) atau audio (MP3/M4A/Opus) dari link
- Auto-kompres kalau file hasil download kelebihan batas ukuran Telegram
- Download playlist YouTube (beberapa video sekaligus, dengan limit)
- Fallback ambil foto (pakai `gallery-dl`) buat postingan Instagram/X yang isinya foto, bukan video
- Convert video yang dikirim langsung ke bot jadi MP3/M4A/Opus/GIF
- Ubah foto/video pendek jadi stiker Telegram (`/sticker`)
- Antrian download (maks N proses barengan) + `/cancel` buat batalin
- Preferensi per user: kualitas video default (`/setquality`), format audio default (`/setaudio`), auto-hapus pesan hasil (`/autodelete`), caption on/off (`/caption`)
- Riwayat & statistik download (`/history`, `/stats`)
- Info server (`/status`), cek daftar format mentah (`/formats <link>`), tes cookies Instagram (`/cookiecheck`)
- Notifikasi otomatis ke owner kalau ada error infra (yt-dlp/ffmpeg gak ketemu, cookies expired, dll)
- **Mode akses**: Self (cuma owner) atau Public (siapa saja) — diatur lewat `/setbot`
- **Sistem koin** (opsional, on/off lewat `/setbot`):
  - User baru dapat koin awal
  - Setiap download memotong koin (owner gratis)
  - Referral: ajak teman lewat link, dapat bonus koin
  - Admin bisa `/addcoin` untuk menambah/mengurangi saldo user
- Rate limit download per user (anti spam)
- Auto-bersih file sementara di `downloads/` setelah N jam

## 📋 Requirements

- **Node.js** >= 18
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)** terinstall & ada di PATH
- **ffmpeg** & **ffprobe** terinstall & ada di PATH (dipakai buat convert audio/GIF, kompres video, dan bikin stiker)
- **[gallery-dl](https://github.com/mikf/gallery-dl#installation)** (opsional, cuma dipakai buat fallback ambil foto dari Instagram/X)

Cek semua sudah terinstall dengan benar:

```bash
node -v
yt-dlp --version
ffmpeg -version
gallery-dl --version   # opsional
```

## 🚀 Instalasi

```bash
git clone <url-repo-ini>
cd <nama-folder>
npm install
```

Buat file `.env` di root project (isi minimal `BOT_TOKEN` dari [@BotFather](https://t.me/BotFather)):

```env
BOT_TOKEN=isi_token_bot_disini
OWNER_ID=isi_id_telegram_kamu
MAX_FILE_SIZE_MB=48
```

Jalanin:

```bash
npm start
```

## ⚙️ Konfigurasi (.env)

| Variabel | Wajib? | Default | Keterangan |
|---|---|---|---|
| `BOT_TOKEN` | ✅ | — | Token bot dari @BotFather |
| `OWNER_ID` | sangat disarankan | kosong | ID Telegram kamu (dari [@userinfobot](https://t.me/userinfobot)). Kalau kosong + mode public, siapa saja yang tahu username bot bisa pakai |
| `MAX_FILE_SIZE_MB` | tidak | `48` | Batas ukuran file yang boleh dikirim bot (limit Bot API biasa ±50MB) |
| `GALLERY_DL_COOKIES_FILE` | tidak | kosong | Path ke file cookies (format Netscape) untuk Instagram/X lewat `gallery-dl` |
| `YTDLP_COOKIES_FILE` | tidak | sama dengan `GALLERY_DL_COOKIES_FILE` | Path cookies khusus yt-dlp (age-restricted / private video). Kosong = pakai `GALLERY_DL_COOKIES_FILE` |
| `BANNER_URL` | tidak | placeholder | URL gambar banner menu utama, dipakai kalau `src/image/banner.jpg` tidak ada |
| `PLAYLIST_LIMIT` | tidak | `5` | Maks jumlah video yang didownload sekali proses playlist |
| `AUTO_COMPRESS` | tidak | `true` | Kompres otomatis video yang kelebihan `MAX_FILE_SIZE_MB` sebelum menyerah |
| `DOWNLOAD_CLEANUP_HOURS` | tidak | `1` | Hapus file sementara di `downloads/` yang lebih tua dari N jam |
| `RATE_LIMIT_MAX` | tidak | `5` | Maks download per user dalam satu window |
| `RATE_LIMIT_WINDOW_MS` | tidak | `600000` (10 menit) | Durasi window rate limit (ms) |
| `COIN_SYSTEM` | tidak | `false` | **Default awal saja** untuk sistem koin. Setelah bot pernah jalan, nilai aktif disimpan di `data/bot_settings.json` dan diatur lewat `/setbot` (env diabaikan) |
| `COIN_START` | tidak | `30` | Koin awal user baru (kalau sistem koin ON) |
| `COIN_COST_DOWNLOAD` | tidak | `1` | Biaya koin per download |
| `COIN_REFERRAL_BONUS` | tidak | `10` | Bonus koin untuk yang berhasil mengajak teman baru |

> **Catatan `COIN_SYSTEM`**: variabel ini cuma dipakai sebagai default saat pertama kali / kalau `data/bot_settings.json` belum ada atau key `coinSystem`-nya rusak. Setelah itu, ON/OFF sistem koin **hanya** diubah lewat command `/setbot` (disimpan ke JSON).

### 🍪 Cara dapatkan file cookies (Instagram / X)

File cookies harus format **Netscape cookies.txt**. Cara paling mudah:

**Desktop (PC/laptop)**  
1. Login Instagram (atau X) di browser Chrome/Firefox.  
2. Pasang ekstensi:  
   - Chrome → [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)  
   - Firefox → [Export Cookies](https://addons.mozilla.org/en-US/firefox/addon/export-cookies-txt/)  
3. Buka instagram.com → klik ekstensi → Export → simpan sebagai `cookies.txt` (atau nama lain).  
4. Isi path file itu di `.env` → `GALLERY_DL_COOKIES_FILE=/path/ke/cookies.txt`

**HP / Mobile**  
Paling praktis: export cookies di PC, lalu kirim file ke server/HP yang menjalankan bot.  
Alternatif Android: browser yang support ekstensi (Kiwi / Firefox) + ekstensi yang sama.

Cookies bisa expired sewaktu-waktu — bot punya `/cookiecheck` dan notifikasi otomatis ke owner kalau cookies bermasalah.

> ⚠️ File cookies isinya sesi login akun kamu — anggap selevel password. **Jangan pernah commit** ke git. Project ini sudah punya `.gitignore` yang mengabaikan `*.txt`, `src/ig_cookies.txt`, folder `data/`, dan `.env`.

## 🕹️ Perintah Bot

### Umum

| Command | Keterangan |
|---|---|
| `/start` | Mulai bot & tampilkan menu utama (juga handle referral) |
| `/menu` | Tampilkan menu utama |
| `/help` | Daftar lengkap fitur & command |
| Kirim link | Download video/audio dari link (YouTube, TikTok, Instagram, dll) |
| Kirim foto | Otomatis diubah jadi stiker |
| `/sticker` | Aktifkan mode convert video pendek → stiker |
| Kirim file video | Ditawarin convert jadi MP3/M4A/Opus/GIF |
| `/setquality` | Atur kualitas video default |
| `/setaudio` | Atur format audio default |
| `/autodelete` | Atur auto-hapus pesan hasil download |
| `/caption` | Atur tampil/tidaknya caption di hasil download |
| `/history` | Riwayat download kamu |
| `/cancel` | Batalkan download yang sedang jalan/antri |
| `/status` | Info server & antrian |
| `/stats` | Statistik total download (owner) |
| `/formats <link>` | Daftar format mentah dari yt-dlp |
| `/cookiecheck` | Tes kesehatan cookies Instagram |
| `/ping` | Cek bot masih hidup + latency |

### Sistem koin (muncul kalau sistem koin ON)

| Command | Keterangan |
|---|---|
| `/koin` atau `/balance` | Cek saldo koin |
| `/referral` atau `/invite` | Dapatkan link ajak teman (+bonus koin) |

### Admin (cuma `OWNER_ID`)

| Command | Keterangan |
|---|---|
| `/admin` | Daftar command admin |
| `/setbot` | Ubah **mode akses** (Self / Public) + **sistem koin** ON/OFF |
| `/users` | Daftar user yang pernah terdata |
| `/broadcast <pesan>` | Kirim pengumuman ke semua user |
| `/addcoin <userId> <jumlah>` | Tambah/kurangi koin user (bisa negatif) |

## 🔒 Keamanan & Mode Akses

- Isi `OWNER_ID` di `.env`. Tanpa ini + mode public, siapa saja yang tahu username bot bisa memakai resource server kamu.
- Mode default:
  - Ada `OWNER_ID` → default **self** (cuma owner)
  - Tidak ada `OWNER_ID` → default **public**
- Mode bisa diganti kapan saja lewat `/setbot` (disimpan di `data/bot_settings.json`).
- Sistem koin juga on/off lewat `/setbot` yang sama.

## 📁 Struktur Project (ringkas)

```
.
├── index.js                 # Entry point
├── package.json
├── .env                     # Jangan di-commit
├── .gitignore
├── data/                    # Runtime (diabaikan git): bot_settings, coins, history, prefs
├── lib/
│   ├── botsettings.js       # Mode self/public + coinSystem (JSON)
│   ├── coins.js             # Sistem koin & referral
│   ├── guard.js             # Middleware mode self/public
│   ├── ratelimit.js
│   ├── ytdlp.js / gallery.js / ffmpeg.js
│   └── ...
└── src/
    ├── config.js            # Baca .env
    ├── commands/            # basic, setbot, admin, settings, status, cancel
    ├── handlers/            # text (link), menu
    ├── download/
    ├── convert/             # sticker, file
    ├── core/                # state, queue, notify, helpers, keyboards
    ├── image/banner.jpg
    └── ig_cookies.txt       # Contoh/placeholder — jangan commit isi asli
```

## 🔒 Keamanan

Selalu isi `OWNER_ID` di `.env` supaya bot cuma bisa dipakai kamu sendiri — tanpa ini, siapapun yang tau username bot bisa mengendalikannya (download atas nama kuota/server kamu).
