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
- Preferensi per user: kualitas video default (`/setquality`), auto-hapus pesan hasil download (`/autodelete`)
- Riwayat & statistik download (`/history`, `/stats`)
- Info server (`/status`), cek daftar format mentah (`/formats <link>`), tes cookies Instagram (`/cookiecheck`)
- Notifikasi otomatis ke owner kalau ada error infra (yt-dlp/ffmpeg gak ketemu, cookies expired, dll)

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
cp .env.example .env
```

Buka `.env`, isi minimal `BOT_TOKEN` (dapetin dari [@BotFather](https://t.me/BotFather) di Telegram):

```env
BOT_TOKEN=isi_token_bot_disini
MAX_FILE_SIZE_MB=48
OWNER_ID=
```

Jalanin:

```bash
npm start
```

## ⚙️ Konfigurasi (.env)

| Variabel | Wajib? | Default | Keterangan |
|---|---|---|---|
| `BOT_TOKEN` | ✅ | — | Token bot dari @BotFather |
| `OWNER_ID` | disarankan | kosong | ID Telegram kamu (dari [@userinfobot](https://t.me/userinfobot)). Kalau kosong, bot bisa dipakai **siapa aja** yang tau username-nya |
| `MAX_FILE_SIZE_MB` | tidak | `48` | Batas ukuran file yang boleh dikirim bot (limit Bot API biasa ±50MB) |
| `GALLERY_DL_COOKIES_FILE` | tidak | kosong | Path ke file cookies (format Netscape) buat akses Instagram yang butuh login lewat `gallery-dl` |
| `BANNER_URL` | tidak | placeholder | URL gambar banner menu utama, dipakai kalau `assets/banner.jpg` gak ada |
| `PLAYLIST_LIMIT` | tidak | `5` | Maks jumlah video yang didownload sekali proses playlist |
| `AUTO_COMPRESS` | tidak | `true` | Kompres otomatis video yang kelebihan `MAX_FILE_SIZE_MB` sebelum nyerah |

> ⚠️ **Soal cookies**: file cookies (`GALLERY_DL_COOKIES_FILE`) isinya sesi login akun kamu — anggap serahasia password. Jangan pernah commit/push file ini ke git (sudah ditangani di `.gitignore`).

## 📁 Struktur Proyek

```
bot.js                 # Entry point: setup bot, wiring semua handler, lifecycle
config.js               # Baca & expose semua konstanta dari .env

core/
  state.js               # State yang dishare antar modul (queue, pending, dll)
  queue.js                # Sistem antrian download (enqueue, /cancel)
  notify.js               # Notifikasi ke owner + deteksi error kritikal
  helpers.js              # Util umum (cleanup file, retry keyboard, dll)
  keyboards.js            # Kartu info video & keyboard-keyboard turunannya

download/
  index.js                 # Proses download video/audio/playlist + fallback foto

convert/
  sticker.js               # Mode /sticker + convert foto/video jadi stiker
  file.js                   # Convert video yang dikirim langsung jadi MP3/M4A/Opus/GIF

commands/
  basic.js                  # /start /menu /help /history /ping
  status.js                  # /status /stats /formats /cookiecheck
  settings.js                 # /setquality /autodelete
  cancel.js                    # /cancel

handlers/
  text.js                       # Handler link URL + semua tombol pilihan download
  menu.js                        # Navigasi menu bertingkat (inline button)

lib/                              # Modul teknis stateless (yt-dlp, ffmpeg, sticker, dll)
data/                             # Riwayat download & preferensi user (JSON, auto-generate)
downloads/                        # Folder sementara hasil download (auto-dibersihkan)
assets/                           # Banner menu (opsional)
```

## 🕹️ Perintah Bot

| Command | Keterangan |
|---|---|
| `/menu` | Tampilkan menu utama |
| `/help` | Daftar lengkap fitur & command |
| Kirim link | Download video/audio dari link (YouTube, TikTok, Instagram, dll) |
| Kirim foto | Otomatis diubah jadi stiker |
| `/sticker` | Aktifkan mode convert video pendek → stiker |
| Kirim file video | Ditawarin convert jadi MP3/M4A/Opus/GIF |
| `/setquality` | Atur kualitas video default kamu |
| `/autodelete` | Atur auto-hapus pesan hasil download |
| `/history` | Riwayat download kamu |
| `/cancel` | Batalin download yang lagi jalan/antri |
| `/status` | Info server & antrian |
| `/stats` | Statistik total download (owner) |
| `/formats <link>` | Daftar format mentah dari yt-dlp |
| `/cookiecheck` | Tes kesehatan cookies Instagram |
| `/ping` | Cek bot masih hidup |

## 🔒 Keamanan

Selalu isi `OWNER_ID` di `.env` supaya bot cuma bisa dipakai kamu sendiri — tanpa ini, siapapun yang tau username bot bisa mengendalikannya (download atas nama kuota/server kamu).
