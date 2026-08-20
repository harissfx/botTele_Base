const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const logger = require("./lib/logger");
const { ownerOnly } = require("./lib/guard");
const { scheduleInstagramCookieCheck } = require("./lib/cookiecheck");
const config = require("./config");
const state = require("./core/state");
const { createNotifyOwner } = require("./core/notify");

if (!config.BOT_TOKEN) {
  logger.error("BOT_TOKEN belum diisi. Copy .env.example jadi .env lalu isi token bot kamu.");
  process.exit(1);
}

logger.printBanner({
  ownerConfigured: Boolean(config.OWNER_ID),
  maxFileSizeMB: config.MAX_FILE_SIZE_MB,
});

if (!config.OWNER_ID) {
  logger.warn(
    "OWNER_ID belum di-set di .env — bot ini masih bisa dipakai SIAPA AJA yang tau link/username bot kamu. " +
      "Isi OWNER_ID (ID Telegram kamu, dari @userinfobot) di .env supaya bot cuma bisa dipakai kamu sendiri."
  );
}

if (config.GALLERY_DL_COOKIES_FILE && !fs.existsSync(config.GALLERY_DL_COOKIES_FILE)) {
  logger.warn(`GALLERY_DL_COOKIES_FILE diset ke "${config.GALLERY_DL_COOKIES_FILE}" tapi file-nya gak ketemu.`);
}

const bot = new Telegraf(config.BOT_TOKEN);
const notifyOwner = createNotifyOwner(bot);

require("./download").initNotify(bot);

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
require("./commands/basic").register(bot);
require("./commands/status").register(bot);
require("./commands/settings").register(bot);
require("./commands/cancel").register(bot);
require("./convert/sticker").register(bot);
require("./convert/file").register(bot);
require("./handlers/menu").register(bot);
require("./handlers/text").register(bot);

function cleanOldDownloads() {
  try {
    const files = fs.readdirSync(state.DOWNLOAD_DIR);
    for (const f of files) {
      const fp = path.join(state.DOWNLOAD_DIR, f);
      fs.rmSync(fp, { recursive: true, force: true });
    }
  } catch (e) {
  }
}

cleanOldDownloads();

bot.catch((err, ctx) => {
  logger.error(`Error saat proses update ${ctx.updateType} dari ${ctx.from?.id}:`, err);
  notifyOwner(`Error tak tertangani saat proses update ${ctx.updateType} dari user ${ctx.from?.id}:\n${err.message}`);
  ctx.reply("⚠️ Terjadi error, coba lagi ya.").catch(() => {});
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection:", err);
  notifyOwner(`Unhandled rejection: ${err && err.message ? err.message : err}`);
});

bot.launch().then(() => {
  logger.ok("Bot jalan! Kirim link video ke bot Telegram kamu, atau ketik /menu.");
  bot.telegram
    .getMe()
    .then((me) => logger.info(`Bot aktif sebagai @${me.username}`))
    .catch(() => {});

  if (config.GALLERY_DL_COOKIES_FILE) {
    scheduleInstagramCookieCheck(config.GALLERY_DL_COOKIES_FILE, notifyOwner);
  }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));