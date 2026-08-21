const { Markup } = require("telegraf");
const { getHistory } = require("./history");
const { escapeHtml, formatDate } = require("./format");
const coins = require("./coins");

const DIVIDER = "───────────────";

const ROOT_CAPTION =
  "≡ <b>Bot Downloader</b>\n" +
  "Download & convert video/audio dari YouTube, TikTok, Instagram, Facebook, Twitter/X, dan 1800+ situs lain lewat yt-dlp.\n\n" +
  "<b>Cara pakai singkat:</b>\n" +
  "1. Kirim link video ke chat ini\n" +
  "2. Pilih mau download sebagai Video atau Audio\n" +
  "3. Tunggu, filenya otomatis dikirim ke sini\n\n" +
  `${DIVIDER}\n` +
  "<b>Command penting:</b>\n" +
  "<code>/menu</code> — buka menu ini lagi\n" +
  "<code>/help</code> — daftar lengkap semua fitur &amp; command\n" +
  "<code>/setquality</code> — atur kualitas video default\n" +
  "<code>/history</code> — riwayat download terakhir\n" +
  "<code>/cancel</code> — batalin proses yang lagi jalan\n\n" +
  "Atau pilih kategori di bawah ▼";

const ROOT_KEYBOARD = Markup.inlineKeyboard([
  [Markup.button.callback("↓ Download", "menu:download"), Markup.button.callback("↻ Convert", "menu:convert")],
  [Markup.button.callback("≡ Pengaturan", "menu:settings"), Markup.button.callback("▤ Riwayat", "menu:history")],
  [Markup.button.callback("▤ Semua Perintah", "menu:help")],
]);

function backKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback("← Kembali", "menu:root")]]);
}

function downloadCaption() {
  return (
    "↓ <b>Download</b>\n\n" +
    "Paste/kirim link video di chat ini (YouTube, TikTok, Instagram, Facebook, Twitter/X, dll).\n\n" +
    "Bot bakal ambil <b>info video dulu</b> (judul, durasi, perkiraan ukuran) sebelum kamu pilih mau download sebagai apa:\n" +
    "• <b>Video</b> — pilihan kualitas 360p / 720p / 1080p\n" +
    "• <b>Audio</b> — MP3 / M4A / Opus\n\n" +
    "Link <b>playlist YouTube</b> juga didukung — bakal muncul tombol khusus buat download beberapa video sekaligus (ada batasnya).\n\n" +
    `${DIVIDER}\n` +
    "<b>Command terkait:</b>\n" +
    "<code>/setquality</code> — biar tombol \"Video\" otomatis pakai kualitas favoritmu\n" +
    "<code>/setaudio</code> — biar tombol \"Audio\" otomatis pakai format favoritmu"
  );
}

function convertCaption() {
  return (
    "↻ <b>Convert</b>\n\n" +
    "<b>Video/Audio → MP3/M4A/Opus/GIF</b>\n" +
    "Kirim file video langsung ke chat ini (bukan link, tapi file videonya) — nanti muncul pilihan mau dijadiin MP3, M4A, Opus, atau GIF.\n\n" +
    "<b>Foto/Video → Stiker</b>\n" +
    "Kirim foto kapan aja → otomatis jadi stiker Telegram (.webp).\n" +
    "Buat video pendek jadi stiker, ketik <code>/sticker</code> dulu baru kirim videonya (biar gak ketuker sama convert MP3 di atas).\n\n" +
    "⚠ <b>Karena batas Telegram Bot API, file yang bisa diambil bot maksimal ±20MB.</b>"
  );
}

function settingsCaption() {
  return (
    "≡ <b>Pengaturan</b>\n\n" +
    "<code>/setquality</code>\n" +
    "Atur kualitas video default (360p/720p/1080p/terbaik), biar tombol \"Video\" di kartu info langsung pakai ini tanpa perlu pilih tiap kali.\n\n" +
    "<code>/setaudio</code>\n" +
    "Atur format audio default (MP3/M4A/Opus).\n\n" +
    "<code>/autodelete</code>\n" +
    "Atur auto-hapus pesan hasil download setelah sekian menit — berguna kalau chat-nya rame/mau hemat storage device kamu.\n\n" +
    "<code>/caption</code>\n" +
    "Nyala/matiin caption detail (nama akun, like/view/comment, deskripsi &amp; hashtag postingan asli) di file hasil download. Default nyala.\n\n" +
    "Semua pengaturan tersimpan per akun Telegram kamu."
  );
}

function userCommandsBlock(maxFileSizeMB) {
  let text =
    "<b>Command</b>\n" +
    "<code>/menu</code> — buka menu utama\n" +
    "<code>/help</code> — pesan ini\n" +
    "<code>/setquality</code> — atur kualitas video default\n" +
    "<code>/setaudio</code> — atur format audio default\n" +
    "<code>/autodelete</code> — atur auto-hapus pesan hasil download\n" +
    "<code>/caption</code> — nyala/matiin caption detail\n" +
    "<code>/cancel</code> — batalin download yang lagi jalan/antri\n" +
    "<code>/history</code> — riwayat download terakhir\n" +
    "<code>/ping</code> — cek bot masih hidup + latency\n";

  if (coins.isEnabled()) {
    text +=
      "<code>/koin</code> — cek saldo koin\n" +
      "<code>/referral</code> — link ajak teman (+koin)\n";
  }

  text += `\n⚠ <b>Batas ukuran file kirim: ${maxFileSizeMB}MB</b> (limit Telegram Bot API)`;
  return text;
}

function adminCommandsBlock() {
  return (
    `\n${DIVIDER}\n` +
    "<b>Command admin</b>\n" +
    "<code>/admin</code> — daftar command admin (pesan ini juga)\n" +
    "<code>/setbot</code> — mode self/public + koin on/off\n" +
    "<code>/users</code> — daftar user terdata\n" +
    "<code>/broadcast</code> — kirim pengumuman ke semua user\n" +
    "<code>/addcoin</code> — tambah/kurangi koin user\n" +
    "<code>/status</code> — info server (RAM/CPU/disk/antrian)\n" +
    "<code>/uptime</code> — sejak kapan &amp; berapa lama bot nyala\n" +
    "<code>/stats</code> — statistik total download\n" +
    "<code>/formats &lt;link&gt;</code> — daftar format mentah yt-dlp\n" +
    "<code>/cookiecheck</code> — tes cookies Instagram"
  );
}

function helpCaption(maxFileSizeMB, isAdmin = false) {
  let text =
    "▤ <b>Semua Fitur &amp; Perintah</b>\n\n" +
    "<b>Download &amp; Convert</b>\n" +
    "• Kirim link video apa aja → info dulu, baru pilih download video/audio\n" +
    "• Link playlist YouTube → tombol khusus buat download beberapa video sekaligus\n" +
    "• Link X/Twitter atau Instagram yang isinya foto → otomatis diambil fotonya\n" +
    "• Kirim file video → pilihan convert ke MP3/M4A/Opus/GIF\n" +
    "• Kirim foto → otomatis jadi stiker; video pendek jadi stiker → <code>/sticker</code> dulu baru kirim videonya\n" +
    "• File hasil download nampilin caption detail (bisa dimatiin lewat /caption)\n" +
    "• Gagal download? Ada tombol \"↻ Coba lagi\" di pesan errornya\n" +
    "• File kegedean → otomatis dikompres dulu sebelum nyerah\n\n" +
    userCommandsBlock(maxFileSizeMB);

  if (isAdmin) {
    text += adminCommandsBlock();
  }
  return text;
}

function adminHelpCaption() {
  return "⚙️ <b>Panel Admin</b>\n" + adminCommandsBlock();
}

function historyCaption(userId) {
  const items = getHistory(userId, 10);
  if (items.length === 0) {
    return "▤ <b>Riwayat</b>\n\nBelum ada riwayat download.";
  }
  const lines = items.map((it, i) => {
    const typeLabel =
      it.type === "audio"
        ? "Audio"
        : it.type === "convert"
        ? "Convert"
        : it.type === "sticker"
        ? "Stiker"
        : it.type === "photo"
        ? "Foto"
        : it.type === "playlist"
        ? "Playlist"
        : "Video";
    const quality = it.quality ? ` (${it.quality})` : "";
    return `${i + 1}. <b>${typeLabel}${quality}</b> — ${escapeHtml(it.title || "tanpa judul")}\n   <i>${formatDate(it.date)}</i>`;
  });
  return "▤ <b>Riwayat Download Terakhir</b>\n\n" + lines.join("\n\n");
}

module.exports = {
  ROOT_CAPTION,
  ROOT_KEYBOARD,
  backKeyboard,
  downloadCaption,
  convertCaption,
  settingsCaption,
  helpCaption,
  adminHelpCaption,
  historyCaption,
};