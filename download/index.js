const fs = require("fs");
const path = require("path");
const { escapeHtml, formatSize, progressBar } = require("../lib/format");
const {
  downloadVideoWithProgress,
  downloadAudioWithProgress,
  downloadPlaylistWithProgress,
} = require("../lib/ytdlp");
const { compressVideoToTarget } = require("../lib/ffmpeg");
const { downloadPhotos } = require("../lib/gallery");
const { addEntry } = require("../lib/history");
const { getPrefs } = require("../lib/prefs");
const logger = require("../lib/logger");
const state = require("../core/state");
const { enqueue } = require("../core/queue");
const { cleanup, findDownloadedFile, retryKeyboard, scheduleAutoDelete } = require("../core/helpers");
const { isCriticalError, createNotifyOwner } = require("../core/notify");
const { MAX_FILE_SIZE_MB, PLAYLIST_LIMIT, AUTO_COMPRESS } = require("../config");

let notifyOwner = () => {};
function initNotify(bot) {
  notifyOwner = createNotifyOwner(bot);
}

async function processDownload(ctx, id, data, type, quality, audioFormat) {
  const { url, info, userId } = data;
  const retryType = type === "video" ? "video" : "audio";
  const retryParam = type === "video" ? quality : audioFormat || "mp3";

  await enqueue(
    userId,
    async (regJobId) => {
      let lastEdit = 0;
      const editProgress = async (percent, meta) => {
        const now = Date.now();
        if (now - lastEdit < 2500 && percent < 99) return;
        lastEdit = now;
        const bar = progressBar(percent);
        const speed = meta && meta.speed ? ` • ${meta.speed}` : "";
        const eta = meta && meta.eta ? ` • ETA ${meta.eta}` : "";
        try {
          await ctx.editMessageCaption(
            `⏳ Downloading...\n<code>${bar}</code> ${percent.toFixed(0)}% ${speed}${eta}\n\nKetik /cancel buat batalin.`,
            { parse_mode: "HTML" }
          );
        } catch (_) {}
      };

      const onProcess = (proc) => {
        const job = state.jobRegistry.get(regJobId);
        if (job) job.proc = proc;
      };

      const downloadId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const outputTemplate = path.join(state.DOWNLOAD_DIR, `${downloadId}.%(ext)s`);

      try {
        await ctx.editMessageCaption("⏳ Mempersiapkan download... (Ketik /cancel buat batalin)", {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        });

        if (type === "audio") {
          await downloadAudioWithProgress(url, outputTemplate, audioFormat || "mp3", editProgress, onProcess);
        } else {
          await downloadVideoWithProgress(url, outputTemplate, quality, MAX_FILE_SIZE_MB, editProgress, onProcess);
        }

        let filePath = findDownloadedFile(downloadId);
        if (!filePath) throw new Error("File hasil download tidak ditemukan.");

        let stats = fs.statSync(filePath);
        let sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > MAX_FILE_SIZE_MB) {
          if (type === "video" && AUTO_COMPRESS) {
            await ctx.editMessageCaption(
              `📦 File ${sizeMB.toFixed(1)}MB kegedean, lagi coba kompres otomatis...`,
              { parse_mode: "HTML" }
            );
            const compressedPath = filePath.replace(/\.[^.]+$/, "") + "_compressed.mp4";
            try {
              await compressVideoToTarget(filePath, compressedPath, MAX_FILE_SIZE_MB);
              cleanup(filePath);
              filePath = compressedPath;
              stats = fs.statSync(filePath);
              sizeMB = stats.size / (1024 * 1024);
            } catch (compressErr) {
              cleanup(filePath);
              cleanup(compressedPath);
              await ctx.editMessageCaption(
                `❌ File terlalu besar dan gagal dikompres ke bawah ${MAX_FILE_SIZE_MB}MB.\nCoba pilih kualitas lebih rendah.`,
                { parse_mode: "HTML", reply_markup: retryKeyboard(id, retryType, retryParam).reply_markup }
              );
              return;
            }
          }

          if (sizeMB > MAX_FILE_SIZE_MB) {
            cleanup(filePath);
            await ctx.editMessageCaption(
              `❌ File terlalu besar (${sizeMB.toFixed(1)}MB). Batas Telegram Bot API ${MAX_FILE_SIZE_MB}MB.\n` +
                (type !== "audio" ? "Coba pilih kualitas lebih rendah atau opsi Audio." : ""),
              { parse_mode: "HTML", reply_markup: retryKeyboard(id, retryType, retryParam).reply_markup }
            );
            return;
          }
        }

        await ctx.editMessageCaption(`✅ Selesai! Mengirim file (${sizeMB.toFixed(1)}MB)...`, { parse_mode: "HTML" });

        let sentMsg;
        if (type === "audio") {
          sentMsg = await ctx.replyWithAudio({ source: filePath }, { title: info.title });
        } else {
          sentMsg = await ctx.replyWithVideo({ source: filePath }, { caption: escapeHtml(info.title) });
        }

        addEntry({
          userId,
          title: info.title,
          url,
          type,
          quality: type === "video" ? quality : audioFormat || "mp3",
        });

        const prefs = getPrefs(userId);
        if (prefs.autoDeleteMin) scheduleAutoDelete(ctx, sentMsg, prefs.autoDeleteMin);

        cleanup(filePath);
      } catch (err) {
        if (err.message === "__CANCELLED__") {
          cleanup(findDownloadedFile(downloadId));
          try {
            await ctx.editMessageCaption("🚫 Download dibatalkan.", { parse_mode: "HTML" });
          } catch (_) {}
          return;
        }

        logger.error(err);
        if (isCriticalError(err)) {
          notifyOwner(`Gagal download (user ${userId}, url ${url}):\n${err.message}`);
        }
        try {
          await ctx.editMessageCaption(
            `❌ Gagal download: ${escapeHtml(err.message)}\n\n` +
              "Kemungkinan: situs ini belum didukung yt-dlp, videonya private, atau butuh login.",
            { parse_mode: "HTML", reply_markup: retryKeyboard(id, retryType, retryParam).reply_markup }
          );
        } catch (_) {
          await ctx.reply(`❌ Gagal download: ${err.message}`);
        }
      }
    },
    async (position, total) => {
      try {
        await ctx.editMessageCaption(
          `📋 Kamu di antrian nomor ${position} dari ${total}...\n\nKetik /cancel buat batalin.`,
          { parse_mode: "HTML" }
        );
      } catch (_) {}
    }
  );
}

async function processPlaylistDownload(ctx, id, data) {
  const { url, userId } = data;
  const limit = Math.min(data.playlistCount || PLAYLIST_LIMIT, PLAYLIST_LIMIT);
  const prefs = getPrefs(userId);
  const quality = prefs.quality && prefs.quality !== "best" ? prefs.quality : "720";

  await enqueue(
    userId,
    async (regJobId) => {
      let lastEdit = 0;
      const editProgress = async (percent, meta) => {
        const now = Date.now();
        if (now - lastEdit < 2500 && percent < 99) return;
        lastEdit = now;
        const bar = progressBar(percent);
        const itemInfo = meta && meta.totalItems ? `Video ${meta.currentItem}/${meta.totalItems} • ` : "";
        const speed = meta && meta.speed ? ` • ${meta.speed}` : "";
        try {
          await ctx.editMessageCaption(
            `⏳ Downloading playlist...\n${itemInfo}<code>${bar}</code> ${percent.toFixed(0)}%${speed}\n\nKetik /cancel buat batalin.`,
            { parse_mode: "HTML" }
          );
        } catch (_) {}
      };
      const onProcess = (proc) => {
        const job = state.jobRegistry.get(regJobId);
        if (job) job.proc = proc;
      };

      const plId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const plDir = path.join(state.DOWNLOAD_DIR, `${plId}_pl`);
      fs.mkdirSync(plDir, { recursive: true });
      const outputTemplate = path.join(plDir, "%(playlist_index)s_%(title).50s.%(ext)s");

      try {
        await ctx.editMessageCaption(
          `⏳ Mempersiapkan download playlist (maks ${limit} video, kualitas ${quality}p)... (Ketik /cancel buat batalin)`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
        );

        await downloadPlaylistWithProgress(url, outputTemplate, limit, quality, editProgress, onProcess);

        const files = fs.readdirSync(plDir).filter((f) => !f.startsWith("."));
        if (files.length === 0) throw new Error("Gak ada video yang berhasil diunduh dari playlist ini.");

        await ctx.editMessageCaption(`✅ Selesai! Mengirim ${files.length} video...`, { parse_mode: "HTML" });

        let sentCount = 0;
        for (const f of files.sort()) {
          const fp = path.join(plDir, f);
          const stat = fs.statSync(fp);
          const sizeMB = stat.size / (1024 * 1024);
          if (sizeMB > MAX_FILE_SIZE_MB) {
            await ctx.reply(`⏭ Dilewati (${sizeMB.toFixed(1)}MB, kelewat batas ${MAX_FILE_SIZE_MB}MB): ${f}`);
            continue;
          }
          const sentMsg = await ctx.replyWithVideo({ source: fp });
          sentCount++;
          const prefsNow = getPrefs(userId);
          if (prefsNow.autoDeleteMin) scheduleAutoDelete(ctx, sentMsg, prefsNow.autoDeleteMin);
        }

        addEntry({
          userId,
          title: `Playlist (${sentCount}/${files.length} video terkirim)`,
          url,
          type: "playlist",
          quality,
        });
      } catch (err) {
        if (err.message === "__CANCELLED__") {
          try {
            await ctx.editMessageCaption("🚫 Download playlist dibatalkan.", { parse_mode: "HTML" });
          } catch (_) {}
        } else {
          logger.error(err);
          if (isCriticalError(err)) {
            notifyOwner(`Gagal download playlist (user ${userId}, url ${url}):\n${err.message}`);
          }
          try {
            await ctx.editMessageCaption(`❌ Gagal download playlist: ${escapeHtml(err.message)}`, {
              parse_mode: "HTML",
              reply_markup: retryKeyboard(id, "playlist", "-").reply_markup,
            });
          } catch (_) {
            await ctx.reply(`❌ Gagal download playlist: ${err.message}`);
          }
        }
      } finally {
        try {
          fs.rmSync(plDir, { recursive: true, force: true });
        } catch (_) {}
      }
    },
    async (position, total) => {
      try {
        await ctx.editMessageCaption(
          `📋 Kamu di antrian nomor ${position} dari ${total} (playlist)...\n\nKetik /cancel buat batalin.`,
          { parse_mode: "HTML" }
        );
      } catch (_) {}
    }
  );
}

async function handlePhotoFallback(ctx, url, statusMsg, id, GALLERY_DL_COOKIES_FILE) {
  try {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      undefined,
      "🔎 Videonya gak ketemu, kemungkinan ini postingan foto — lagi coba ambil fotonya..."
    );
  } catch (_) {}

  const jobId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const destDir = path.join(state.DOWNLOAD_DIR, jobId);
  fs.mkdirSync(destDir, { recursive: true });

  try {
    await downloadPhotos(url, destDir, { cookiesFile: GALLERY_DL_COOKIES_FILE });

    const files = fs
      .readdirSync(destDir)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map((f) => path.join(destDir, f));

    if (files.length === 0) {
      throw new Error("Gak ada foto yang ketemu di link ini.");
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      undefined,
      `✅ Ketemu ${files.length} foto! Mengirim...`
    );

    const prefs = getPrefs(ctx.from.id);
    for (let i = 0; i < files.length; i += 10) {
      const chunk = files.slice(i, i + 10);
      const media = chunk.map((filePath) => ({ type: "photo", media: { source: filePath } }));
      const sentMsgs = await ctx.replyWithMediaGroup(media);
      if (Array.isArray(sentMsgs) && prefs.autoDeleteMin) {
        for (const m of sentMsgs) scheduleAutoDelete(ctx, m, prefs.autoDeleteMin);
      }
    }

    addEntry({
      userId: ctx.from.id,
      title: `${files.length} foto dari ${new URL(url).hostname}`,
      url,
      type: "photo",
      quality: null,
    });
  } catch (err) {
    logger.error(err);
    if (isCriticalError(err)) {
      notifyOwner(`Gagal ambil foto (user ${ctx.from.id}, url ${url}):\n${err.message}`);
    }
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        `❌ Gagal ambil foto: ${escapeHtml(err.message)}\n\n` +
          "Kemungkinan: postingannya private/butuh login, atau linknya emang gak ada media yang bisa diambil.",
        id ? { parse_mode: "HTML", reply_markup: retryKeyboard(id, "photo", "-").reply_markup } : { parse_mode: "HTML" }
      );
    } catch (_) {}
  } finally {
    try {
      fs.rmSync(destDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

module.exports = { initNotify, processDownload, processPlaylistDownload, handlePhotoFallback };
