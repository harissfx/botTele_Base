const fs = require("fs");
const path = require("path");
const { imageToWebpSticker, videoToWebpSticker } = require("../lib/sticker");
const { addEntry } = require("../lib/history");
const logger = require("../lib/logger");
const state = require("../core/state");
const { cleanup } = require("../core/helpers");
const { isCriticalError, createNotifyOwner } = require("../core/notify");

const STICKER_MODE_TTL_MS = 5 * 60 * 1000;

function setStickerMode(userId) {
  const existing = state.stickerMode.get(userId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => state.stickerMode.delete(userId), STICKER_MODE_TTL_MS);
  state.stickerMode.set(userId, t);
}

function consumeStickerMode(userId) {
  const has = state.stickerMode.has(userId);
  if (has) {
    clearTimeout(state.stickerMode.get(userId));
    state.stickerMode.delete(userId);
  }
  return has;
}

async function handleStickerConversion(ctx, fileId, kind, fileSizeBytes, notifyOwner) {
  const fileSizeMB = (fileSizeBytes || 0) / (1024 * 1024);
  if (fileSizeMB > 20) {
    return ctx.reply("❌ File terlalu besar buat aku ambil (>20MB). Ini batas Telegram Bot API untuk bot biasa.");
  }

  const statusMsg = await ctx.reply("🔄 Mengubah jadi stiker...");
  const jobId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputPath = path.join(state.DOWNLOAD_DIR, `${jobId}_in${kind === "image" ? ".jpg" : ".mp4"}`);
  const outputPath = path.join(state.DOWNLOAD_DIR, `${jobId}_out.webp`);

  try {
    const link = await ctx.telegram.getFileLink(fileId);
    const res = await fetch(link.href);
    if (!res.ok) throw new Error(`Gagal ambil file dari Telegram (HTTP ${res.status}).`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);

    if (kind === "image") {
      await imageToWebpSticker(inputPath, outputPath);
    } else {
      await videoToWebpSticker(inputPath, outputPath);
    }

    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, "✅ Selesai! Mengirim stiker...");
    await ctx.replyWithSticker({ source: outputPath });

    addEntry({ userId: ctx.from.id, title: "media → stiker", url: null, type: "sticker", quality: null });
  } catch (err) {
    logger.error(err);
    if (isCriticalError(err)) {
      notifyOwner(`Gagal convert stiker (user ${ctx.from.id}):\n${err.message}`);
    }
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        `❌ Gagal ubah jadi stiker: ${err.message}`
      );
    } catch (_) {}
  } finally {
    cleanup(inputPath);
    cleanup(outputPath);
  }
}

function register(bot) {
  const notifyOwner = createNotifyOwner(bot);
  bot.command("sticker", (ctx) => {
    setStickerMode(ctx.from.id);
    return ctx.reply(
      "🖼 Mode stiker aktif! Kirim gambar atau video pendek (maks ±8 detik akan dipotong otomatis) sekarang, nanti aku ubah jadi stiker Telegram.\n" +
        "Mode ini aktif 5 menit atau sampai kamu kirim 1 media."
    );
  });

  bot.on("photo", async (ctx) => {
    const photos = ctx.message.photo;
    if (!photos || photos.length === 0) return;
    const largest = photos[photos.length - 1];
    await handleStickerConversion(ctx, largest.file_id, "image", largest.file_size, notifyOwner);
  });
}

module.exports = { setStickerMode, consumeStickerMode, handleStickerConversion, register };
