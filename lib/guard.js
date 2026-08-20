function ownerOnly(OWNER_ID) {
  return (ctx, next) => {
    if (!OWNER_ID) return next();

    const fromId = ctx.from ? String(ctx.from.id) : null;
    if (fromId === OWNER_ID) return next();
    if (ctx.updateType === "message") {
      return ctx.reply("🔒 Bot ini private, cuma bisa dipakai owner-nya. Kalau ini bot kamu, set OWNER_ID di file .env.");
    }
    if (ctx.updateType === "callback_query") {
      return ctx.answerCbQuery("🔒 Bot ini private.", { show_alert: true });
    }
    return;
  };
}

module.exports = { ownerOnly };