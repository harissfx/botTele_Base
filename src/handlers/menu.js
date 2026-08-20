const menu = require("../../lib/menu");
const logger = require("../../lib/logger");
const { sendRootMenu } = require("../commands/basic");
const { MAX_FILE_SIZE_MB } = require("../config");

function register(bot) {
  bot.action(/^menu:(root|download|convert|settings|history|help)$/, async (ctx) => {
    const section = ctx.match[1];
    await ctx.answerCbQuery();
    let caption;
    let keyboard;
    switch (section) {
      case "download":
        caption = menu.downloadCaption();
        keyboard = menu.backKeyboard();
        break;
      case "convert":
        caption = menu.convertCaption();
        keyboard = menu.backKeyboard();
        break;
      case "settings":
        caption = menu.settingsCaption();
        keyboard = menu.backKeyboard();
        break;
      case "history":
        caption = menu.historyCaption(ctx.from.id);
        keyboard = menu.backKeyboard();
        break;
      case "help":
        caption = menu.helpCaption(MAX_FILE_SIZE_MB);
        keyboard = menu.backKeyboard();
        break;
      case "root":
      default:
        caption = menu.ROOT_CAPTION;
        keyboard = menu.ROOT_KEYBOARD;
        break;
    }

    const CAPTION_LIMIT = 1024;
    const currentMsg = ctx.callbackQuery.message;
    const isPhotoMsg = Boolean(currentMsg && Array.isArray(currentMsg.photo) && currentMsg.photo.length > 0);

    try {
      if (section === "root") {
        if (!isPhotoMsg) {
          try {
            await ctx.deleteMessage();
          } catch (_) {}
          await sendRootMenu(ctx);
        } else {
          await ctx.editMessageCaption(caption, { parse_mode: "HTML", reply_markup: keyboard.reply_markup });
        }
      } else if (caption.length > CAPTION_LIMIT) {
        await ctx.reply(caption, { parse_mode: "HTML", reply_markup: keyboard.reply_markup });
      } else if (!isPhotoMsg) {
        await ctx.editMessageText(caption, { parse_mode: "HTML", reply_markup: keyboard.reply_markup });
      } else {
        await ctx.editMessageCaption(caption, { parse_mode: "HTML", reply_markup: keyboard.reply_markup });
      }
    } catch (e) {
      if (!/message is not modified/i.test(e.description || e.message || "")) {
        logger.error("Gagal update menu:", e.description || e.message);
      }
    }
  });
}

module.exports = { register };
