import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2), mode = args.shift() ?? "analyze";
const options = {}, forwarded = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--python" && args[i+1]) options.python = args[++i];
  else if (["--spec", "--out", "--checkpoint", "--threads", "--from-file"].includes(args[i]) && args[i+1]) forwarded.push(args[i],args[++i]);
  else if (["--force", "--offline-only"].includes(args[i])) forwarded.push(args[i]);
  else throw new Error(`Unknown/incomplete option: ${args[i]}`);
}
const venvPython = (name) => path.join(root, name, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const environmentPython = venvPython(".venv-assets"), samPython = venvPython(".venv-sam");
const bundled = path.join(process.env.USERPROFILE ?? "", ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe");
async function run(command, args, env = {}) {
  const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: "inherit", env: { ...process.env, ...env } });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  if (code !== 0) throw new Error(`Reference analysis exited with ${code}`);
}
async function basePython() {
  const base = options.python ?? process.env.ASSET_PYTHON_PATH;
  if (base) return base;
  try { await access(bundled); return bundled; } catch { return process.platform === "win32" ? "python" : "python3"; }
}
async function requireEnvironment(python, setup) {
  try { await access(python); } catch { throw new Error(`Run corepack pnpm ${setup} first.`); }
}
try {
  if (mode === "setup") {
    try { await access(environmentPython); } catch { await run(await basePython(), ["-m", "venv", ".venv-assets"]); }
    await run(environmentPython, ["-m", "pip", "install", "--only-binary=:all:", "-r", "tools/reference-analysis/requirements.txt"]);
  } else if (mode === "setup-sam") {
    // Separate environment: PyTorch and SAM 2 stay out of the analysis environment.
    try { await access(samPython); } catch { await run(await basePython(), ["-m", "venv", ".venv-sam"]); }
    await run(samPython, ["-m", "pip", "install", "--only-binary=:all:", "-r", "tools/reference-analysis/requirements-sam.txt"]);
    await run(samPython, ["-m", "pip", "install", "--no-build-isolation", "-r", "tools/reference-analysis/requirements-sam-source.txt"], { SAM2_BUILD_CUDA: "0" });
    await run(samPython, ["-X", "utf8", "tools/reference-analysis/sam_setup.py", ...forwarded]);
  } else if (["segment", "check-sam"].includes(mode)) {
    await requireEnvironment(samPython, "setup:reference-segmentation");
    await run(samPython, ["-X", "utf8", `tools/reference-analysis/${mode === "segment" ? "segment" : "check_segmentation"}.py`, ...forwarded]);
  } else {
    if (!["analyze", "check"].includes(mode)) throw new Error("Expected setup, analyze, check, setup-sam, segment or check-sam");
    const python = options.python ?? process.env.ASSET_PYTHON_PATH ?? environmentPython;
    if (python === environmentPython) await requireEnvironment(python, "setup:reference-analysis");
    await run(python, ["-X", "utf8", `tools/reference-analysis/${mode === "check" ? "check" : "analyze"}.py`, ...forwarded]);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
