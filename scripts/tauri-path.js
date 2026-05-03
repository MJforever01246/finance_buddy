/**
 * Prepends rustup cargo bin to PATH so local `@tauri-apps/cli` finds `cargo`.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const home = process.env.USERPROFILE || process.env.HOME || "";
const cargoBin = path.join(home, ".cargo", "bin");
const cargoExe =
  process.platform === "win32"
    ? path.join(cargoBin, "cargo.exe")
    : path.join(cargoBin, "cargo");

if (home && fs.existsSync(cargoExe)) {
  process.env.PATH = `${cargoBin}${path.delimiter}${process.env.PATH}`;
}

const binDir = path.join(root, "node_modules", ".bin");
const tauriBin =
  process.platform === "win32"
    ? path.join(binDir, "tauri.cmd")
    : path.join(binDir, "tauri");

const r = spawnSync(tauriBin, process.argv.slice(2), {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(r.status ?? 1);
