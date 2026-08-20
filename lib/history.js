const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const DATA_DIR = path.join(__dirname, "..", "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const MAX_ENTRIES = 5000;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadAll() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    logger.error("Gagal baca history.json:", e.message);
    return [];
  }
}

function saveAll(entries) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
  } catch (e) {
    logger.error("Gagal simpan history.json:", e.message);
  }
}

function addEntry(entry) {
  const entries = loadAll();
  entries.push({ ...entry, date: Date.now() });
  while (entries.length > MAX_ENTRIES) entries.shift();
  saveAll(entries);
}

function getHistory(userId, limit = 10) {
  const entries = loadAll();
  return entries
    .filter((e) => String(e.userId) === String(userId))
    .slice(-limit)
    .reverse();
}

function getStats() {
  const entries = loadAll();
  const total = entries.length;
  const byType = {};
  const byUser = {};

  for (const e of entries) {
    const type = e.type || "lainnya";
    byType[type] = (byType[type] || 0) + 1;
    byUser[e.userId] = (byUser[e.userId] || 0) + 1;
  }

  let topUser = null;
  let topCount = 0;
  for (const [uid, count] of Object.entries(byUser)) {
    if (count > topCount) {
      topCount = count;
      topUser = uid;
    }
  }

  return {
    total,
    byType,
    uniqueUsers: Object.keys(byUser).length,
    topUser,
    topCount,
    maxEntries: MAX_ENTRIES,
  };
}

module.exports = { addEntry, getHistory, getStats, MAX_ENTRIES };