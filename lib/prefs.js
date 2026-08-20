const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const DATA_DIR = path.join(__dirname, "..", "data");
const PREFS_FILE = path.join(DATA_DIR, "prefs.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadAll() {
  try {
    if (!fs.existsSync(PREFS_FILE)) return {};
    return JSON.parse(fs.readFileSync(PREFS_FILE, "utf-8") || "{}");
  } catch (e) {
    logger.error("Gagal baca prefs.json:", e.message);
    return {};
  }
}

function saveAll(data) {
  try {
    fs.writeFileSync(PREFS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error("Gagal simpan prefs.json:", e.message);
  }
}

function getPrefs(userId) {
  const all = loadAll();
  return all[String(userId)] || {};
}

function setPref(userId, key, value) {
  const all = loadAll();
  const uid = String(userId);
  if (!all[uid]) all[uid] = {};
  all[uid][key] = value;
  saveAll(all);
  return all[uid];
}

module.exports = { getPrefs, setPref };