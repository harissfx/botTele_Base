const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Markup } = require("telegraf");
const { convertToAudio, convertToGif } = require("../../lib/ffmpeg");
const { addEntry } = require("../../lib/history");
const { getPrefs } = require("../../lib/prefs");
const logger = require("../../lib/logger");
const state = require("../core/state");
const { cleanup, scheduleAutoDelete } = require("../core/helpers");
const { isCriticalError, createNotifyOwner } = require("../core/notify");
const { consumeStickerMode } = require("./sticker");

const CONVERT_TTL_MS = 10 * 60 * 1000;

async function runFileConversion(ctx, data, kind, format, notifyOwner) {
  const { inputPath, userId } = data;
  const outExt = kind === "gif" ? "gif" : format;
  const outputPath = inputPath.replace(/_in\.mp4$/, `_out.${outExt}`);

  try {
    await ctx.editMessageText(`↻ Mengubah jadi ${kind === "gif" ? "GIF" : outExt.toUpperCase()}...`);
  } catch (_) {}

  try {
    let sentMsg;
    if (kind === "gif") {
      await convertToGif(inputPath, outputPath);
      sentMsg = await ctx.replyWithAnimation({ source: outputPath });
    } else {
      await convertToAudio(inputPath, outputPath, format);
      sentMsg = await ctx.replyWithAudio({ source: outputPath });
    }

    addEntry({
      userId,
      title: kind === "gif" ? "video → GIF" : `video → ${outExt.toUpperCase()}`,
      url: null,
      type: "convert",
      quality: null,
    });

    const prefs = getPrefs(userId);
    if (prefs.autoDeleteMin) scheduleAutoDelete(ctx, sentMsg, prefs.autoDeleteMin);
  } catch (err) {
    logger.error(err);
    if (isCriticalError(err)) {
      notifyOwner(`Gagal convert file (user ${userId}):\n${err.message}`);
    }
    try {
      await ctx.reply(`✗ Gagal convert: ${err.message}`);
    } catch (_) {}
  } finally {
    cleanup(inputPath);
    cleanup(outputPath);
  }
}

function register(bot) {
  const notifyOwner = createNotifyOwner(bot);
  bot.on(["video", "document"], async (ctx) => {
    const media = ctx.message.video || ctx.message.document;
    if (!media) return;
    const mime = media.mime_type || "";
    if (ctx.message.document && !mime.startsWith("video/")) return; // dokumen non-video diabaikan

    const { handleStickerConversion } = require("./sticker");
    if (consumeStickerMode(ctx.from.id)) {
      return handleStickerConversion(ctx, media.file_id, "video", media.file_size, notifyOwner);
    }

    const fileSizeMB = (media.file_size || 0) / (1024 * 1024);
    if (fileSizeMB > 20) {
      return ctx.reply("✗ File terlalu besar buat aku ambil (>20MB). Ini batas Telegram Bot API untuk bot biasa.");
    }

    const statusMsg = await ctx.reply("↓ Mengunduh file dari Telegram...");
    const jobId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = path.join(state.DOWNLOAD_DIR, `${jobId}_in.mp4`);

    try {
      const link = await ctx.telegram.getFileLink(media.file_id);
      const res = await fetch(link.href);
      if (!res.ok) throw new Error(`Gagal ambil file dari Telegram (HTTP ${res.status}).`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(inputPath, buffer);

      const cid = crypto.randomBytes(4).toString("hex");
      state.convertPending.set(cid, { inputPath, userId: ctx.from.id, chatId: ctx.chat.id });
      setTimeout(() => {
        const d = state.convertPending.get(cid);
        if (d) {
          cleanup(d.inputPath);
          state.convertPending.delete(cid);
        }
      }, CONVERT_TTL_MS);

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        "✓ File diterima! Mau dijadikan apa?",
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback("♪ MP3", `cvaudio:${cid}:mp3`), Markup.button.callback("♪ M4A/Opus", `cvaudiofmt:${cid}`)],
            [Markup.button.callback("▶ GIF", `cvgif:${cid}`)],
          ]).reply_markup,
        }
      );
    } catch (err) {
      logger.error(err);
      if (isCriticalError(err)) {
        notifyOwner(`Gagal ambil file buat convert (user ${ctx.from.id}):\n${err.message}`);
      }
      cleanup(inputPath);
      try {
        await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, `✗ Gagal ambil file: ${err.message}`);
      } catch (_) {}
    }
  });

  bot.action(/^cvaudiofmt:([a-f0-9]+)$/, async (ctx) => {
    const cid = ctx.match[1];
    const data = state.convertPending.get(cid);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ File sudah gak ada lagi, kirim ulang videonya ya.");
    try {
      await ctx.editMessageText("♪ Pilih format audio:", {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("M4A", `cvaudio:${cid}:m4a`), Markup.button.callback("Opus", `cvaudio:${cid}:opus`)],
        ]).reply_markup,
      });
    } catch (_) {}
  });

  bot.action(/^cvaudio:([a-f0-9]+):(mp3|m4a|opus)$/, async (ctx) => {
    const [, cid, format] = ctx.match;
    const data = state.convertPending.get(cid);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ File sudah gak ada lagi, kirim ulang videonya ya.");
    state.convertPending.delete(cid);
    await runFileConversion(ctx, data, "audio", format, notifyOwner);
  });

  bot.action(/^cvgif:([a-f0-9]+)$/, async (ctx) => {
    const cid = ctx.match[1];
    const data = state.convertPending.get(cid);
    await ctx.answerCbQuery();
    if (!data) return ctx.reply("⌛ File sudah gak ada lagi, kirim ulang videonya ya.");
    state.convertPending.delete(cid);
    await runFileConversion(ctx, data, "gif", undefined, notifyOwner);
  });
}

module.exports = { register };