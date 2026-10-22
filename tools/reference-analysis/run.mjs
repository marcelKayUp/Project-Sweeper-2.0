import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2), mode = args.shift() ?? "analyze";
const options = {}, forwarded = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--python" && args[i+1]) options.python = args[++i];
  else if (["--spec", "--out"].includes(args[i]) && args[i+1]) forwarded.push(args[i],args[++i]);
  else if (args[i] === "--force") forwarded.push(args[i]);
  else throw new Error(`Unknown/incomplete option: ${args[i]}`);
}
const environmentPython = path.join(root, ".venv-assets", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const bundled = path.join(process.env.USERPROFILE ?? "", ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe");
async function run(command, args) {
  const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: "inherit" });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  if (code !== 0) throw new Error(`Reference analysis exited with ${code}`);
}
try {
  if (mode === "setup") {
    let base = options.python ?? process.env.ASSET_PYTHON_PATH;
    if (!base) { try { await access(bundled); base = bundled; } catch { base = process.platform === "win32" ? "python" : "python3"; } }
    try { await access(environmentPython); } catch { await run(base, ["-m", "venv", ".venv-assets"]); }
    await run(environmentPython, ["-m", "pip", "install", "--only-binary=:all:", "-r", "tools/reference-analysis/requirements.txt"]);
  } else {
    if (!["analyze", "check"].includes(mode)) throw new Error("Expected setup, analyze or check");
    const python = options.python ?? process.env.ASSET_PYTHON_PATH ?? environmentPython;
    if (python === environmentPython) { try { await access(python); } catch { throw new Error("Run corepack pnpm setup:reference-analysis first."); } }
    await run(python, ["-X", "utf8", `tools/reference-analysis/${mode === "check" ? "check" : "analyze"}.py`, ...forwarded]);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
