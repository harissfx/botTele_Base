const { Markup } = require("telegraf");
const { OWNER_ID } = require("../config");
const botSettings = require("../../lib/botsettings");

function isOwner(ctx) {
  return OWNER_ID && String(ctx.from.id) === String(OWNER_ID);
}

function statusText() {
  const s = botSettings.getSettings();
  const modeLabel = s.mode === "public" ? "🌐 Public (siapa aja bisa pakai)" : "🔒 Self (cuma owner)";
  const coinLabel = s.coinSystem ? "🪙 ON (download pakai koin)" : "🪙 OFF (gratis, tanpa koin)";
  return (
    `⚙️ <b>Pengaturan Bot</b>\n\n` +
    `<b>Mode akses:</b> ${modeLabel}\n` +
    `<b>Sistem koin:</b> ${coinLabel}\n\n` +
    `Pilih di bawah untuk mengubah:`
  );
}

function keyboard() {
  const s = botSettings.getSettings();
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(s.mode === "self" ? "🔒 Self ✓" : "🔒 Self", "setbot:mode:self"),
      Markup.button.callback(s.mode === "public" ? "🌐 Public ✓" : "🌐 Public", "setbot:mode:public"),
    ],
    [
      Markup.button.callback(s.coinSystem ? "🪙 Koin ON ✓" : "🪙 Koin ON", "setbot:coin:on"),
      Markup.button.callback(!s.coinSystem ? "🪙 Koin OFF ✓" : "🪙 Koin OFF", "setbot:coin:off"),
    ],
  ]);
}

function register(bot) {
  bot.command("setbot", async (ctx) => {
    if (!isOwner(ctx)) return;
    if (!OWNER_ID) return;
    await ctx.reply(statusText(), { parse_mode: "HTML", ...keyboard() });
  });

  bot.action(/^setbot:mode:(self|public)$/, async (ctx) => {
    if (!isOwner(ctx)) return ctx.answerCbQuery().catch(() => {});
    const mode = ctx.match[1];
    botSettings.setMode(mode);
    await ctx.answerCbQuery(mode === "public" ? "Mode: Public" : "Mode: Self");
    try {
      await ctx.editMessageText(statusText(), { parse_mode: "HTML", ...keyboard() });
    } catch (_) {}
  });

  bot.action(/^setbot:coin:(on|off)$/, async (ctx) => {
    if (!isOwner(ctx)) return ctx.answerCbQuery().catch(() => {});
    const on = ctx.match[1] === "on";
    botSettings.setCoinSystem(on);
    await ctx.answerCbQuery(on ? "Sistem koin: ON" : "Sistem koin: OFF");
    try {
      await ctx.editMessageText(statusText(), { parse_mode: "HTML", ...keyboard() });
    } catch (_) {}
  });
}

module.exports = { register };