const { fetchInfo, isPlaylistUrl, fetchPlaylistInfo } = require("../../lib/ytdlp");
const { isPhotoFallbackSite } = require("../../lib/gallery");
const { getPrefs } = require("../../lib/prefs");
const { escapeHtml } = require("../../lib/format");
const state = require("../core/state");
const { storePending } = require("../core/helpers");
const { checkRateLimit } = require("../../lib/ratelimit");
const coins = require("../../lib/coins");
const { infoKeyboard, qualityKeyboard, audioFormatKeyboard, buildInfoCaption } = require("../core/keyboards");
const { isCriticalError, createNotifyOwner } = require("../core/notify");
const { processDownload, processPlaylistDownload, handlePhotoFallback } = require("../download");
const { PLAYLIST_LIMIT, GALLERY_DL_COOKIES_FILE, COIN_COST_DOWNLOAD } = require("../config");

function guardRateLimit(ctx) {
  const rl = checkRateLimit(ctx.from.id);
  if (!rl.allowed) {
    const msg = `⏳ Rate limit: maksimal ${rl.limit} download / 10 menit.\nCoba lagi dalam ~${rl.retrySec} detik.`;
    if (ctx.callbackQuery) {
      return ctx.answerCbQuery(msg, { show_alert: true }).then(() => false).catch(() => false);
    }
    return ctx.reply(msg).then(() => false).catch(() => false);
  }
  return Promise.resolve(true);
}

async function guardCoins(ctx) {
  if (!coins.isEnabled()) return true;
  const userId = ctx.from.id;
  coins.ensureUser(userId);
  if (coins.canAfford(userId)) return true;
  const bal = coins.getBalance(userId);
  const msg =
    `🪙 Koin tidak cukup (saldo: ${bal}, butuh: ${COIN_COST_DOWNLOAD}).\n` +
    `Ajak teman lewat /referral atau tunggu owner top-up.\nCek saldo: /koin`;
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery(msg, { show_alert: true });
    } catch (_) {}
    return false;
  }
  try {
    await ctx.reply(msg);
  } catch (_) {}
  return false;
}

function register(bot) {
  const notifyOwner = createNotifyOwner(bot);
  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return next();
    const urlMatch = text.match(/https?:\/\/[^\s]+/);

    if (!urlMatch) {
      return ctx.reply(
        "Kirim link video ya (YouTube/TikTok/Instagram/Facebook/Twitter). Ketik /menu buat lihat semua fitur."
      );
    }

    coins.ensureUser(ctx.from.id);

    const url = urlMatch[0];
    const statusMsg = await ctx.reply("⌕ Mengambil info video...");

    let info;
    try {
      info = await fetchInfo(url);
    } catch (err) {
      if (isPhotoFallbackSite(url)) {
        if (!(await guardRateLimit(ctx))) return;
        if (!(await guardCoins(ctx))) return;
        const id = storePending({ url, userId: ctx.from.id, chatId: ctx.chat.id, kind: "photo" });
        return handlePhotoFallback(ctx, url, statusMsg, id, GALLERY_DL_COOKIES_FILE);
      }
      if (isCriticalError(err)) {
        notifyOwner(`Gagal ambil info video (user ${ctx.from.id}, url ${url}):\n${err.message}`);
      }
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        `✗ <b>Gagal ambil info video</b>\n<i>${escapeHtml(err.message)}</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    let playlistCount = null;
    if (isPlaylistUrl(url)) {
      try {
        const plInfo = await fetchPlaylistInfo(url, { limit: PLAYLIST_LIMIT });
        if (plInfo && Array.isArray(plInfo.entries)) playlistCount = plInfo.entries.length;
      } catch (_) {
        playlistCount = null;
      }
    }

    const id = storePending({ url, info, userId: ctx.from.id, chatId: ctx.chat.id, playlistCount });
    const caption = buildInfoCaption(info);

    try {
      await ctx.deleteMessage(statusMsg.message_id);
    } catch (_) {}

    await ctx.reply(caption, {
      parse_mode: "HTML",
      reply_markup: infoKeyboard(id, { userId: ctx.from.id, playlistCount }).reply_markup,
    });
  });

  bot.action(/^retry:([a-f0-9]+):(video|audio|photo|playlist):([a-zA-Z0-9-]+)$/, async (ctx) => {
    const [, id, type, param] = ctx.match;
    await ctx.answerCbQuery("Mencoba lagi...");
    const data = state.pending.get(id);
    if (!data) return ctx.reply("⌛ Permintaan sudah kedaluwarsa, kirim ulang linknya ya.");

    if (!(await guardRateLimit(ctx))) return;
    if (!(await guardCoins(ctx))) return;

    if (type === "photo") {
      const statusMsg = await ctx.reply("↻ Mencoba ambil foto lagi...");
      return handlePhotoFallback(ctx, data.url, statusMsg, id, GALLERY_DL_COOKIES_FILE);
    }
    if (type === "playlist") {
      return processPlaylistDownload(ctx, id, data);
    }
    if (type === "video") {
      return processDownload(ctx, id, data, "video", param, null);
    }
    return processDownload(ctx, id, data, "audio", null, param);
  });

  bot.action(/^dlq:([a-f0-9]+)$/, async (ctx) => {
    const id = ctx.match[1];
    const data = state.pending.get(id);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ Permintaan sudah kedaluwarsa, kirim ulang linknya ya.");
    await ctx.editMessageText(buildInfoCaption(data.info) + "\n≡ Pilih kualitas video:", {
      parse_mode: "HTML",
      reply_markup: qualityKeyboard(id).reply_markup,
    });
  });

  bot.action(/^dlaf:([a-f0-9]+)$/, async (ctx) => {
    const id = ctx.match[1];
    const data = state.pending.get(id);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ Permintaan sudah kedaluwarsa, kirim ulang linknya ya.");
    await ctx.editMessageText(buildInfoCaption(data.info) + "\n♪ Pilih format audio:", {
      parse_mode: "HTML",
      reply_markup: audioFormatKeyboard(id).reply_markup,
    });
  });

  bot.action(/^dlqback:([a-f0-9]+)$/, async (ctx) => {
    const id = ctx.match[1];
    const data = state.pending.get(id);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ Permintaan sudah kedaluwarsa, kirim ulang linknya ya.");
    await ctx.editMessageText(buildInfoCaption(data.info), {
      parse_mode: "HTML",
      reply_markup: infoKeyboard(id, data).reply_markup,
    });
  });

  bot.action(/^dl(v|a):([a-f0-9]+)$/, async (ctx) => {
    const type = ctx.match[1] === "v" ? "video" : "audio";
    const id = ctx.match[2];
    const data = state.pending.get(id);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ Permintaan sudah kedaluwarsa, kirim ulang linknya ya.");
    if (!(await guardRateLimit(ctx))) return;
    if (!(await guardCoins(ctx))) return;
    if (type === "video") {
      const prefs = getPrefs(data.userId);
      return processDownload(ctx, id, data, "video", prefs.quality || "best", null);
    }
    const prefs = getPrefs(ctx.from.id);
    return processDownload(ctx, id, data, "audio", null, prefs.audioFormat || "mp3");
  });

  bot.action(/^dlqs:([a-f0-9]+):(360|720|1080)$/, async (ctx) => {
    const id = ctx.match[1];
    const quality = ctx.match[2];
    const data = state.pending.get(id);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ Permintaan sudah kedaluwarsa, kirim ulang linknya ya.");
    if (!(await guardRateLimit(ctx))) return;
    if (!(await guardCoins(ctx))) return;
    await processDownload(ctx, id, data, "video", quality, null);
  });

  bot.action(/^dlafs:([a-f0-9]+):(mp3|m4a|opus)$/, async (ctx) => {
    const id = ctx.match[1];
    const format = ctx.match[2];
    const data = state.pending.get(id);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ Permintaan sudah kedaluwarsa, kirim ulang linknya ya.");
    if (!(await guardRateLimit(ctx))) return;
    if (!(await guardCoins(ctx))) return;
    await processDownload(ctx, id, data, "audio", null, format);
  });

  bot.action(/^dlpl:([a-f0-9]+)$/, async (ctx) => {
    const id = ctx.match[1];
    const data = state.pending.get(id);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ Permintaan sudah kedaluwarsa, kirim ulang linknya ya.");
    if (!(await guardRateLimit(ctx))) return;
    if (!(await guardCoins(ctx))) return;
    await processPlaylistDownload(ctx, id, data);
  });
}

module.exports = { register };