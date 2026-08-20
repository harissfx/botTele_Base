const botSettings = require("./botsettings");

function ownerOnly(OWNER_ID) {
  return (ctx, next) => {
    const fromId = ctx.from ? String(ctx.from.id) : null;
    const isOwner = OWNER_ID && fromId === String(OWNER_ID);

    if (isOwner) return next();
    if (botSettings.isPublic()) return next();
    if (!OWNER_ID) return next();

    if (ctx.updateType === "message") {
      return ctx.reply(
        "⚿ Bot sedang mode <b>self</b> (private).\nCuma owner yang bisa pakai.",
        { parse_mode: "HTML" }
      );
    }
    if (ctx.updateType === "callback_query") {
      return ctx.answerCbQuery("⚿ Bot mode self — cuma owner.", { show_alert: true });
    }
    return;
  };
}

module.exports = { ownerOnly };