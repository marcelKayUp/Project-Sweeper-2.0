import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const options = { recipe: "assets/specs/props/terminal-family.json", out: "assets/generated/props/terminals", blender: process.env.BLENDER_PATH ?? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe", force: false };
function local(value) {
  const resolved = path.resolve(root, value), relative = path.relative(root, resolved);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("Pfad muss innerhalb des Projekts liegen.");
  return resolved;
}
try {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--force") options.force = true;
    else if (["--recipe", "--out", "--blender", "--only"].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("--")) options[args[i++].slice(2)] = args[i];
    else throw new Error(`Unbekanntes oder unvollständiges Argument: ${args[i]}`);
  }
  local(options.recipe); const destination = local(options.out);
  await access(options.blender);
  await mkdir(destination, { recursive: true });
  const log = createWriteStream(path.join(destination, "build.log"));
  const command = ["--background", "--factory-startup", "--disable-autoexec", "--threads", "4", "--python-exit-code", "1", "--python", path.join(root, "tools/terminals/build_terminal_family.py"), "--", "--recipe", options.recipe, "--out", options.out];
  if (options.force) command.push("--force");
  if (options.only) command.push("--only", options.only);
  const child = spawn(options.blender, command, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let buffer = "";
  child.stdout.on("data", bytes => {
    log.write(bytes); buffer += bytes.toString();
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim(); buffer = buffer.slice(index + 1);
      if (line.startsWith("NC_TERMINAL")) console.log(line);
    }
  });
  child.stderr.on("data", bytes => log.write(bytes));
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  await new Promise(resolve => log.end(resolve));
  if (code !== 0) throw new Error(`Terminalbau endete mit Code ${code}. Siehe ${path.relative(root, destination)}/build.log`);
  // A custom/partial build stays an isolated bundle; it never replaces the public family.
  if (options.out === "assets/generated/props/terminals" && !options.only) {
    const publicDir = path.join(root, "apps/client/public/assets/props/terminals");
    const catalog = JSON.parse(await readFile(path.join(destination, "catalog.json"), "utf8"));
    await mkdir(publicDir, { recursive: true });
    for (const asset of catalog.assets) {
      if (!/^terminal-[a-z0-9-]+\.glb$/.test(asset.file)) throw new Error("Ungültiger Katalogpfad.");
      await copyFile(path.join(destination, "glb", asset.file), path.join(publicDir, asset.file));
    }
    await copyFile(path.join(destination, "catalog.json"), path.join(publicDir, "catalog.json"));
    console.log(JSON.stringify({ ok: true, published: catalog.assets.length, url: "/terminals.html", catalog: path.relative(root, path.join(publicDir, "catalog.json")) }));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
}
