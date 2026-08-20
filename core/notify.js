const { escapeHtml } = require("../lib/format");
const logger = require("../lib/logger");
const { OWNER_ID } = require("../config");

function isCriticalError(err) {
  const msg = err && err.message ? err.message : "";
  return msg.includes("tidak ditemukan");
}

function createNotifyOwner(bot) {
  return async function notifyOwner(message) {
    if (!OWNER_ID) return;
    try {
      await bot.telegram.sendMessage(OWNER_ID, `⚠️ <b>Notifikasi Bot</b>\n\n${escapeHtml(message)}`, {
        parse_mode: "HTML",
      });
    } catch (e) {
      logger.error("Gagal kirim notif ke owner:", e.message);
    }
  };
}

module.exports = { isCriticalError, createNotifyOwner };
