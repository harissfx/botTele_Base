const menu = require("../lib/menu");
const { safeReplyWithPhoto, getBannerSource } = require("../core/helpers");
const { MAX_FILE_SIZE_MB } = require("../config");

async function sendRootMenu(ctx) {
  await safeReplyWithPhoto(ctx, getBannerSource(), {
    caption: menu.ROOT_CAPTION,
    parse_mode: "HTML",
    reply_markup: menu.ROOT_KEYBOARD.reply_markup,
  });
}

function register(bot) {
  bot.start((ctx) => sendRootMenu(ctx));
  bot.command("menu", (ctx) => sendRootMenu(ctx));

  bot.command("help", (ctx) =>
    ctx.reply(menu.helpCaption(MAX_FILE_SIZE_MB), { parse_mode: "HTML" })
  );

  bot.command("history", (ctx) =>
    ctx.reply(menu.historyCaption(ctx.from.id), { parse_mode: "HTML" })
  );

  bot.command("ping", async (ctx) => {
    const start = Date.now();
    const msg = await ctx.reply("🏓 Pong...");
    const latency = Date.now() - start;
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `🏓 Pong! ${latency}ms`);
    } catch (_) {}
  });
}

module.exports = { sendRootMenu, register };
