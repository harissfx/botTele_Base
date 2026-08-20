const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Markup } = require("telegraf");
const logger = require("../../lib/logger");
const { BANNER_URL } = require("../config");
const state = require("./state");

const PENDING_TTL_MS = 15 * 60 * 1000;

function storePending(data) {
  const id = crypto.randomBytes(4).toString("hex");
  state.pending.set(id, data);
  setTimeout(() => state.pending.delete(id), PENDING_TTL_MS);
  return id;
}

function findDownloadedFile(baseName) {
  const files = fs.readdirSync(state.DOWNLOAD_DIR).filter((f) => f.startsWith(baseName));
  if (files.length === 0) return null;
  return path.join(state.DOWNLOAD_DIR, files[0]);
}

function cleanup(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    logger.error("Gagal hapus file sementara:", e.message);
  }
}

function retryKeyboard(id, type, param) {
  return Markup.inlineKeyboard([[Markup.button.callback("↻ Coba lagi", `retry:${id}:${type}:${param}`)]]);
}

function scheduleAutoDelete(ctx, sentMsg, minutes) {
  if (!minutes || minutes <= 0 || !sentMsg) return;
  setTimeout(async () => {
    try {
      await ctx.telegram.deleteMessage(sentMsg.chat.id, sentMsg.message_id);
    } catch (_) {}
  }, minutes * 60 * 1000);
}

function getBannerSource() {
  const localBanner = path.join(__dirname, "..", "image", "banner.jpg");
  if (fs.existsSync(localBanner)) return { source: localBanner };
  return BANNER_URL;
}

async function safeReplyWithPhoto(ctx, photoSource, extra) {
  try {
    return await ctx.replyWithPhoto(photoSource, extra);
  } catch (err) {
    logger.error("Gagal kirim foto, fallback ke teks:", err.message);
    return ctx.reply(extra.caption, {
      parse_mode: extra.parse_mode,
      reply_markup: extra.reply_markup,
    });
  }
}

module.exports = {
  storePending,
  findDownloadedFile,
  cleanup,
  retryKeyboard,
  scheduleAutoDelete,
  getBannerSource,
  safeReplyWithPhoto,
};