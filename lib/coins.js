const fs = require("fs");
const path = require("path");
const {
  COIN_START,
  COIN_COST_DOWNLOAD,
  COIN_REFERRAL_BONUS,
  OWNER_ID,
} = require("../src/config");
const botSettings = require("./botsettings");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const COINS_FILE = path.join(DATA_DIR, "coins.json");

function loadAll() {
  try {
    if (fs.existsSync(COINS_FILE)) return JSON.parse(fs.readFileSync(COINS_FILE, "utf8"));
  } catch (_) {}
  return {};
}

function saveAll(data) {
  fs.writeFileSync(COINS_FILE, JSON.stringify(data, null, 2));
}

function isEnabled() {
  return botSettings.isCoinEnabled();
}

function isOwnerUser(userId) {
  return OWNER_ID && String(userId) === String(OWNER_ID);
}

function ensureUser(userId) {
  if (!isEnabled()) return false;
  const all = loadAll();
  const id = String(userId);
  if (all[id]) return false;
  all[id] = {
    coins: COIN_START,
    referredBy: null,
    referralCount: 0,
    createdAt: Date.now(),
  };
  saveAll(all);
  return true;
}

function getBalance(userId) {
  if (!isEnabled()) return null;
  ensureUser(userId);
  const all = loadAll();
  const u = all[String(userId)];
  return u ? u.coins : 0;
}

function getUserRecord(userId) {
  if (!isEnabled()) return null;
  ensureUser(userId);
  return loadAll()[String(userId)] || null;
}

function applyReferral(newUserId, referrerId) {
  if (!isEnabled()) return { ok: false, reason: "disabled" };
  const newId = String(newUserId);
  const refId = String(referrerId);
  if (!refId || refId === newId) return { ok: false, reason: "invalid" };

  const all = loadAll();
  if (!all[newId]) {
    all[newId] = { coins: COIN_START, referredBy: null, referralCount: 0, createdAt: Date.now() };
  }
  if (!all[refId]) {
    all[refId] = { coins: COIN_START, referredBy: null, referralCount: 0, createdAt: Date.now() };
  }

  if (all[newId].referredBy) return { ok: false, reason: "already_referred" };

  all[newId].referredBy = refId;
  all[refId].coins = (all[refId].coins || 0) + COIN_REFERRAL_BONUS;
  all[refId].referralCount = (all[refId].referralCount || 0) + 1;
  saveAll(all);
  return { ok: true, bonus: COIN_REFERRAL_BONUS, referrerBalance: all[refId].coins };
}

function canAfford(userId, amount = COIN_COST_DOWNLOAD) {
  if (!isEnabled()) return true;
  if (isOwnerUser(userId)) return true;
  return getBalance(userId) >= amount;
}

function spendCoins(userId, amount = COIN_COST_DOWNLOAD) {
  if (!isEnabled()) return { ok: true, balance: null, skipped: true };
  if (isOwnerUser(userId)) return { ok: true, balance: null, skipped: true, owner: true };

  const all = loadAll();
  const id = String(userId);
  if (!all[id]) {
    all[id] = { coins: COIN_START, referredBy: null, referralCount: 0, createdAt: Date.now() };
  }
  if (all[id].coins < amount) {
    return { ok: false, balance: all[id].coins, reason: "insufficient" };
  }
  all[id].coins -= amount;
  saveAll(all);
  return { ok: true, balance: all[id].coins };
}

function addCoins(userId, amount) {
  ensureUser(userId);
  const all = loadAll();
  const id = String(userId);
  all[id].coins = (all[id].coins || 0) + amount;
  saveAll(all);
  return all[id].coins;
}

function buildReferralLink(botUsername, userId) {
  if (!botUsername) return null;
  return `https://t.me/${botUsername.replace(/^@/, "")}?start=ref_${userId}`;
}

module.exports = {
  isEnabled,
  ensureUser,
  getBalance,
  getUserRecord,
  applyReferral,
  canAfford,
  spendCoins,
  addCoins,
  buildReferralLink,
  isOwnerUser,
};