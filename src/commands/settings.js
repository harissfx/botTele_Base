const { Markup } = require("telegraf");
const { getPrefs, setPref } = require("../../lib/prefs");

function register(bot) {
  bot.command("setquality", async (ctx) => {
    const prefs = getPrefs(ctx.from.id);
    await ctx.reply(
      `Kualitas video default sekarang: <b>${prefs.quality}</b>\nPilih yang baru:`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("360p", "setq:360"),
            Markup.button.callback("720p", "setq:720"),
            Markup.button.callback("1080p", "setq:1080"),
          ],
          [Markup.button.callback("Terbaik", "setq:best")],
        ]),
      }
    );
  });

  bot.action(/^setq:(360|720|1080|best)$/, async (ctx) => {
    const q = ctx.match[1];
    setPref(ctx.from.id, "quality", q);
    await ctx.answerCbQuery(`Kualitas default: ${q}`);
    await ctx.editMessageText(`✓ Kualitas video default diset ke <b>${q}</b>`, { parse_mode: "HTML" });
  });

  bot.command("setaudio", async (ctx) => {
    const prefs = getPrefs(ctx.from.id);
    await ctx.reply(
      `Format audio default sekarang: <b>${prefs.audioFormat.toUpperCase()}</b>\nPilih yang baru:`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("MP3", "seta:mp3"),
            Markup.button.callback("M4A", "seta:m4a"),
            Markup.button.callback("Opus", "seta:opus"),
          ],
        ]),
      }
    );
  });

  bot.action(/^seta:(mp3|m4a|opus)$/, async (ctx) => {
    const fmt = ctx.match[1];
    setPref(ctx.from.id, "audioFormat", fmt);
    await ctx.answerCbQuery(`Format audio default: ${fmt}`);
    await ctx.editMessageText(`✓ Format audio default diset ke <b>${fmt.toUpperCase()}</b>`, {
      parse_mode: "HTML",
    });
  });

  bot.command("autodelete", async (ctx) => {
    const prefs = getPrefs(ctx.from.id);
    const cur = prefs.autoDeleteMin ? `${prefs.autoDeleteMin} menit` : "mati";
    await ctx.reply(
      `Auto-hapus pesan hasil download: <b>${cur}</b>\nPilih:`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("Mati", "setad:0"),
            Markup.button.callback("5 mnt", "setad:5"),
            Markup.button.callback("15 mnt", "setad:15"),
            Markup.button.callback("60 mnt", "setad:60"),
          ],
        ]),
      }
    );
  });

  bot.action(/^setad:(\d+)$/, async (ctx) => {
    const min = parseInt(ctx.match[1], 10);
    setPref(ctx.from.id, "autoDeleteMin", min);
    const label = min ? `${min} menit` : "mati";
    await ctx.answerCbQuery(`Auto-delete: ${label}`);
    await ctx.editMessageText(`✓ Auto-hapus pesan hasil download: <b>${label}</b>`, { parse_mode: "HTML" });
  });

  bot.command("caption", async (ctx) => {
    const prefs = getPrefs(ctx.from.id);
    const on = prefs.detailCaption !== false;
    setPref(ctx.from.id, "detailCaption", !on);
    await ctx.reply(`✓ Caption detail: <b>${!on ? "ON" : "OFF"}</b>`, { parse_mode: "HTML" });
  });
}

module.exports = { register };