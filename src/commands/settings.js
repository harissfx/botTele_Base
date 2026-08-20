const { Markup } = require("telegraf");
const { getPrefs, setPref } = require("../../lib/prefs");

function register(bot) {
  bot.command("setquality", async (ctx) => {
    const current = getPrefs(ctx.from.id).quality;
    await ctx.reply(
      `≡ Pilih kualitas video default kamu${current ? ` (sekarang: <b>${current === "best" ? "Terbaik" : current + "p"}</b>)` : ""}:`,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback("360p", "setq:360"),
            Markup.button.callback("720p", "setq:720"),
            Markup.button.callback("1080p", "setq:1080"),
          ],
          [Markup.button.callback("★ Terbaik (best)", "setq:best")],
        ]).reply_markup,
      }
    );
  });

  bot.action(/^setq:(360|720|1080|best)$/, async (ctx) => {
    const quality = ctx.match[1];
    setPref(ctx.from.id, "quality", quality);
    await ctx.answerCbQuery("Tersimpan!");
    try {
      await ctx.editMessageText(
        `✓ Kualitas default disetel ke <b>${quality === "best" ? "Terbaik" : quality + "p"}</b>. Tombol "Video" nanti otomatis pakai ini.`,
        { parse_mode: "HTML" }
      );
    } catch (_) {}
  });
  
  bot.command("autodelete", async (ctx) => {
    const current = getPrefs(ctx.from.id).autoDeleteMin || 0;
    await ctx.reply(
      `⌫ Auto-hapus pesan hasil download setelah berapa menit?${current ? ` (sekarang: <b>${current} menit</b>)` : " (sekarang: mati)"}`,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("Mati (jangan hapus)", "setad:0")],
          [
            Markup.button.callback("5 menit", "setad:5"),
            Markup.button.callback("15 menit", "setad:15"),
            Markup.button.callback("60 menit", "setad:60"),
          ],
        ]).reply_markup,
      }
    );
  });

  bot.action(/^setad:(0|5|15|60)$/, async (ctx) => {
    const minutes = parseInt(ctx.match[1], 10);
    setPref(ctx.from.id, "autoDeleteMin", minutes);
    await ctx.answerCbQuery("Tersimpan!");
    try {
      await ctx.editMessageText(
        minutes === 0
          ? "✓ Auto-hapus dimatikan."
          : `✓ Pesan hasil download bakal otomatis kehapus <b>${minutes} menit</b> setelah dikirim.`,
        { parse_mode: "HTML" }
      );
    } catch (_) {}
  });

  bot.command("caption", async (ctx) => {
    const current = getPrefs(ctx.from.id).detailCaption;
    const isOn = current !== false;
    await ctx.reply(
      `✎ Caption detail (nama akun, like/view, deskripsi &amp; hashtag postingan asli) di file hasil download, sekarang: <b>${
        isOn ? "nyala" : "mati"
      }</b>.`,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("✓ Nyalain", "setcap:1"), Markup.button.callback("⊘ Matiin", "setcap:0")],
        ]).reply_markup,
      }
    );
  });

  bot.action(/^setcap:(0|1)$/, async (ctx) => {
    const on = ctx.match[1] === "1";
    setPref(ctx.from.id, "detailCaption", on);
    await ctx.answerCbQuery("Tersimpan!");
    try {
      await ctx.editMessageText(
        on
          ? "✓ Caption detail dinyalain. File hasil download sekarang bakal nampilin nama akun, like/view, deskripsi & hashtag postingan asli (kalau datanya ada)."
          : "✓ Caption detail dimatiin. File hasil download bakal pakai judul polos doang.",
        { parse_mode: "HTML" }
      );
    } catch (_) {}
  });
}

module.exports = { register };