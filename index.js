const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const logger = require("./lib/logger");
const { ownerOnly } = require("./lib/guard");
const { scheduleInstagramCookieCheck } = require("./lib/cookiecheck");
const config = require("./src/config");
const state = require("./src/core/state");
const botSettings = require("./lib/botsettings");
const { createNotifyOwner } = require("./src/core/notify");

if (!config.BOT_TOKEN) {
  logger.error("BOT_TOKEN belum diisi. Copy .env.example jadi .env lalu isi token bot kamu.");
  process.exit(1);
}

const bot = new Telegraf(config.BOT_TOKEN);
const notifyOwner = createNotifyOwner(bot);

require("./src/download").initNotify(bot);

bot.use((ctx, next) => {
  const who = ctx.from ? `${ctx.from.first_name || ""} (${ctx.from.id})` : "unknown";
  if (ctx.updateType === "message" && ctx.message.text) {
    if (ctx.message.text.startsWith("/")) {
      logger.cmd(`${who} -> ${ctx.message.text}`);
    } else {
      logger.msg(`text dari ${who}: ${ctx.message.text}`);
    }
  } else if (ctx.updateType === "message") {
    const kind = ctx.message.video ? "video" : ctx.message.document ? "document" : ctx.updateType;
    logger.msg(`${kind} dari ${who}`);
  } else if (ctx.updateType === "callback_query") {
    logger.cb(`${who} -> ${ctx.callbackQuery.data}`);
  } else {
    logger.msg(`${ctx.updateType} dari ${who}`);
  }
  return next();
});

bot.use(ownerOnly(config.OWNER_ID));
require("./src/commands/basic").register(bot);
require("./src/commands/status").register(bot);
require("./src/commands/settings").register(bot);
require("./src/commands/cancel").register(bot);
require("./src/commands/setbot").register(bot);
require("./src/commands/admin").register(bot);
require("./src/convert/sticker").register(bot);
require("./src/convert/file").register(bot);
require("./src/handlers/menu").register(bot);
require("./src/handlers/text").register(bot);

function cleanOldDownloads(maxAgeMs) {
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  try {
    const entries = fs.readdirSync(state.DOWNLOAD_DIR, { withFileTypes: true });
    for (const entry of entries) {
      const fp = path.join(state.DOWNLOAD_DIR, entry.name);
      try {
        const stat = fs.statSync(fp);
        if (stat.mtimeMs < cutoff) {
          fs.rmSync(fp, { recursive: true, force: true });
          removed++;
        }
      } catch (_) {}
    }
  } catch (e) {
    logger.warn("Cleanup downloads gagal:", e.message);
  }
  if (removed > 0) {
    logger.info(`Cleanup: hapus ${removed} file/folder lama di downloads/`);
  }
  return removed;
}

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const maxAgeMs = Math.max(0.1, config.DOWNLOAD_CLEANUP_HOURS) * 60 * 60 * 1000;

cleanOldDownloads(maxAgeMs);
const cleanupTimer = setInterval(() => cleanOldDownloads(maxAgeMs), CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

bot.catch((err, ctx) => {
  logger.error(`Error saat proses update ${ctx.updateType} dari ${ctx.from?.id}:`, err);
  notifyOwner(`Error tak tertangani saat proses update ${ctx.updateType} dari user ${ctx.from?.id}:\n${err.message}`);
  ctx.reply("⚠ Terjadi error, coba lagi ya.").catch(() => {});
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection:", err);
  notifyOwner(`Unhandled rejection: ${err && err.message ? err.message : err}`);
});

async function start() {
  let botUsername;
  try {
    const me = await bot.telegram.getMe();
    botUsername = me.username;
  } catch (err) {
    logger.warn("Gagal ambil info bot dari Telegram (getMe):", err.message);
  }

  logger.printBanner({
    botUsername,
    mode: botSettings.getSettings().mode,
    maxFileSizeMB: config.MAX_FILE_SIZE_MB,
  });

  if (!config.OWNER_ID) {
    logger.warn(
      "OWNER_ID belum di-set di .env — bot ini masih bisa dipakai SIAPA AJA yang tau link/username bot kamu. " +
        "Isi OWNER_ID (ID Telegram kamu, dari @userinfobot) di .env supaya bot cuma bisa dipakai kamu sendiri."
    );
  }

  bot.launch().catch((err) => {
    logger.error("Bot gagal jalan:", err.message);
    process.exit(1);
  });

  if (botUsername) logger.info(`Bot aktif sebagai @${botUsername}`);
  logger.startWaitingSpinner();

  if (config.GALLERY_DL_COOKIES_FILE) {
    scheduleInstagramCookieCheck(config.GALLERY_DL_COOKIES_FILE, notifyOwner);
  }
}

start();

function shutdown(signal) {
  logger.stopWaitingSpinner();
  logger.info(`Menerima ${signal}, mematikan bot...`);
  bot.stop(signal);
  process.exit(0);
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));