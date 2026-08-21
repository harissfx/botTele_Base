const chalk = require("chalk");
const figlet = require("figlet");
const Spinnies = require("spinnies");

const LEVELS = {
  INFO: { color: chalk.cyan, stream: console.log },
  OK: { color: chalk.green, stream: console.log },
  WARN: { color: chalk.yellow, stream: console.warn },
  ERROR: { color: chalk.red, stream: console.error },
  CMD: { color: chalk.magenta, stream: console.log },
  CB: { color: chalk.blue, stream: console.log },
  MSG: { color: chalk.white, stream: console.log },
};

const spinnies = new Spinnies({
  color: "blue",
  succeedColor: "green",
  spinner: {
    interval: 120,
    frames: [
      "M", "Me", "Men", "Menu", "Menun", "Menung", "Menungg", "Menunggu ",
      "Menunggu P", "Menunggu Pes", "Menunggu Pesa", "Menunggu Pesan",
      "Menunggu Pesan.", "Menunggu Pesan..", "Menunggu Pesan...",
      "Menunggu Pesan..", "Menunggu Pesan.", "Menunggu Pesan",
      "Menunggu Pesa", "Menunggu Pes", "Menunggu Pe", "Menunggu P",
      "Menunggu", "Menungg", "Menung", "Menun", "Menu", "Men", "Me", "M",
    ],
  },
});

let spinnerActive = false;

function startWaitingSpinner() {
  if (spinnerActive) return;
  spinnerActive = true;
  try {
    spinnies.add("waiting", { text: "." });
  } catch (_) {}
}

function stopWaitingSpinner() {
  if (!spinnerActive) return;
  spinnerActive = false;
  try {
    spinnies.remove("waiting");
  } catch (_) {}
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function write(level, args) {
  const { color, stream } = LEVELS[level];
  const prefix = `${chalk.gray(timestamp())} ${color.bold(`[${level}]`)}`;

  if (spinnerActive) {
    try {
      spinnies.remove("waiting");
    } catch (_) {}
    stream(prefix, ...args);
    try {
      spinnies.add("waiting", { text: "." });
    } catch (_) {}
  } else {
    stream(prefix, ...args);
  }
}

function printBanner({ botUsername, mode, maxFileSizeMB } = {}) {
  console.clear();
  let ascii;
  try {
    ascii = figlet.textSync("Bot Downloader", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
      width: 80,
      whitespaceBreak: false,
    });
  } catch (_) {
    ascii = "BOT DOWNLOADER";
  }
  
  console.log(chalk.cyan(ascii));
      console.log(chalk.cyan("================================================="));
    console.log(chalk.cyan(" • Powered By Haris Syc"));
    console.log(chalk.cyan(" • Thanks To Wong Hore Team & O.R.B Group"));
    console.log(chalk.cyan(" • Info Script: https://github.com/harissfx/botTele_Base"));
    console.log(chalk.cyan("================================================="));
    console.log(chalk.green(`\nSTATUS: Bot Berhasil Aktif!`));
    if (botUsername) console.log(chalk.white(" • Bot          :"), chalk.magenta(`@${botUsername}`));
    console.log(
      chalk.white(" • Akses        :"),
      mode === "public" ? chalk.yellow("PUBLIC (semua bisa pakai)") : chalk.yellow("SELF (cuma owner)")
    );
    if (maxFileSizeMB) console.log(chalk.white(" • Batas file   :"), chalk.white(`${maxFileSizeMB}MB`));


  console.log("");
}

module.exports = {
  info: (...args) => write("INFO", args),
  ok: (...args) => write("OK", args),
  warn: (...args) => write("WARN", args),
  error: (...args) => write("ERROR", args),
  cmd: (...args) => write("CMD", args),
  cb: (...args) => write("CB", args),
  msg: (...args) => write("MSG", args),
  printBanner,
  startWaitingSpinner,
  stopWaitingSpinner,
};