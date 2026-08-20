const os = require("os");
const { escapeHtml, formatSize } = require("../lib/format");
const { listFormats } = require("../lib/ytdlp");
const { formatUptime, cpuUsagePercent, diskUsage, getYtdlpVersion } = require("../lib/sysinfo");
const { getStats } = require("../lib/history");
const { checkInstagramCookies } = require("../lib/cookiecheck");
const logger = require("../lib/logger");
const state = require("../core/state");
const { isCriticalError, createNotifyOwner } = require("../core/notify");
const { GALLERY_DL_COOKIES_FILE, MAX_CONCURRENT } = require("../config");

function register(bot) {
  const notifyOwner = createNotifyOwner(bot);
  bot.command("cookiecheck", async (ctx) => {
    if (!GALLERY_DL_COOKIES_FILE) {
      return ctx.reply("GALLERY_DL_COOKIES_FILE belum diset di .env, gak ada yang bisa dicek.");
    }
    const statusMsg = await ctx.reply("🔎 Ngetes cookies Instagram, bisa sampai 1 menit...");
    const started = Date.now();
    const result = await checkInstagramCookies(GALLERY_DL_COOKIES_FILE);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    let text;
    if (result.ok) {
      text = `✅ <b>Cookies OK</b>\nBerhasil ambil test photo dalam ${elapsed}s.`;
    } else if (result.skipped) {
      text = `⚠️ <b>Dilewati</b>\n${escapeHtml(result.reason)}`;
    } else if (result.timeout) {
      text =
        `⏱️ <b>Timeout</b> (${elapsed}s)\n` +
        "Kemungkinan koneksi lambat / Instagram rate-limit, <b>bukan berarti cookies invalid</b>.\n" +
        "Coba jalanin manual di terminal buat mastiin:\n" +
        "<code>gallery-dl -D /tmp/test --cookies &lt;path cookies&gt; https://www.instagram.com/instagram/</code>";
    } else {
      text = `❌ <b>Kemungkinan bermasalah</b>\n<i>${escapeHtml(result.reason)}</i>`;
    }

    try {
      await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, text, { parse_mode: "HTML" });
    } catch (_) {}
  });

  bot.command("status", async (ctx) => {
    const statusMsg = await ctx.reply("⏳ Mengambil info server...");
    try {
      const [cpu, disk, ytdlpVersion] = await Promise.all([
        cpuUsagePercent(),
        diskUsage(state.DOWNLOAD_DIR),
        getYtdlpVersion(),
      ]);

      const totalMemBytes = os.totalmem();
      const freeMemBytes = os.freemem();
      const usedMemBytes = totalMemBytes - freeMemBytes;
      const uptimeText = formatUptime(process.uptime());
      const diskLine = disk
        ? `${formatSize(disk.usedKB * 1024)} / ${formatSize(disk.totalKB * 1024)} (${disk.usePercent} terpakai)`
        : "tidak diketahui";

      const text =
        "📊 <b>Status Bot</b>\n\n" +
        `🕒 Uptime: ${uptimeText}\n` +
        `🧠 RAM: ${formatSize(usedMemBytes)} / ${formatSize(totalMemBytes)}\n` +
        `⚙️ CPU: ${cpu.toFixed(1)}%\n` +
        `💽 Disk: ${diskLine}\n` +
        `⬇️ Download aktif: ${state.activeDownloads}/${MAX_CONCURRENT}\n` +
        `📋 Antrian: ${state.queue.length}\n` +
        `🧩 yt-dlp: <code>${escapeHtml(ytdlpVersion)}</code>`;

      await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, text, {
        parse_mode: "HTML",
      });
    } catch (err) {
      logger.error(err);
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          undefined,
          `❌ Gagal ambil status: ${escapeHtml(err.message)}`,
          { parse_mode: "HTML" }
        );
      } catch (_) {}
    }
  });

  bot.command("stats", async (ctx) => {
    const stats = getStats();
    const typeLabels = {
      video: "🎥 Video",
      audio: "🎵 Audio",
      photo: "🖼 Foto",
      sticker: "🖼 Stiker",
      convert: "🔄 Convert (audio/GIF)",
      playlist: "📃 Playlist",
    };
    const byTypeLines =
      Object.entries(stats.byType)
        .sort((a, b) => b[1] - a[1])
        .map(([t, c]) => `  • ${typeLabels[t] || t}: <b>${c}</b>`)
        .join("\n") || "  (belum ada data)";

    const text =
      "📊 <b>Statistik Bot</b>\n\n" +
      `Total download tercatat: <b>${stats.total}</b>\n` +
      `Jumlah user unik: <b>${stats.uniqueUsers}</b>\n\n` +
      `<b>Breakdown per tipe:</b>\n${byTypeLines}\n\n` +
      (stats.topUser
        ? `👑 User paling aktif: <code>${escapeHtml(stats.topUser)}</code> (${stats.topCount}x download)`
        : "👑 Belum ada user yang tercatat.") +
      `\n\n<i>Catatan: cuma mencatat ${stats.maxEntries} entri terakhir.</i>`;

    await ctx.reply(text, { parse_mode: "HTML" });
  });

  bot.command("formats", async (ctx) => {
    const text = ctx.message.text || "";
    const url = (text.split(/\s+/)[1] || "").trim();
    if (!url || !/^https?:\/\//.test(url)) {
      return ctx.reply("Pakai format: <code>/formats &lt;link video&gt;</code>\nContoh: /formats https://youtube.com/watch?v=xxxx", {
        parse_mode: "HTML",
      });
    }

    const statusMsg = await ctx.reply("🔎 Mengambil daftar format mentah dari yt-dlp...");
    try {
      const output = await listFormats(url);
      const trimmed = output.length > 3500 ? "…(dipotong)…\n" + output.slice(-3500) : output;
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        `📋 <b>Daftar Format</b>\n<pre>${escapeHtml(trimmed)}</pre>`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      logger.error(err);
      if (isCriticalError(err)) notifyOwner(`Gagal ambil /formats (user ${ctx.from.id}, url ${url}):\n${err.message}`);
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          undefined,
          `❌ Gagal ambil daftar format: ${escapeHtml(err.message)}`,
          { parse_mode: "HTML" }
        );
      } catch (_) {}
    }
  });
}

module.exports = { register };
