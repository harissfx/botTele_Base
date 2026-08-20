const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const PREFS_FILE = path.join(DATA_DIR, "prefs.json");

function loadAll() {
  try {
    if (fs.existsSync(PREFS_FILE)) return JSON.parse(fs.readFileSync(PREFS_FILE, "utf8"));
  } catch (_) {}
  return {};
}

function saveAll(data) {
  fs.writeFileSync(PREFS_FILE, JSON.stringify(data, null, 2));
}

function getPrefs(userId) {
  const all = loadAll();
  const p = all[String(userId)] || {};
  return {
    quality: p.quality || "best",
    audioFormat: p.audioFormat || "mp3",
    autoDeleteMin: p.autoDeleteMin || 0,
    detailCaption: p.detailCaption !== false,
  };
}

function setPref(userId, key, value) {
  const all = loadAll();
  const id = String(userId);
  if (!all[id]) all[id] = {};
  all[id][key] = value;
  saveAll(all);
  return getPrefs(userId);
}

module.exports = { getPrefs, setPref };