import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const options = { out: "artifacts/asset-inspection", baseline: "assets/source/characters/quaternius/Humans_Master.blend", blender: process.env.BLENDER_PATH ?? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe", thumbnails: true };
try {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--no-thumbnails") options.thumbnails = false;
    else if (["--source", "--out", "--baseline", "--blender"].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("--")) options[args[i++].slice(2)] = args[i];
    else throw new Error(`Unbekanntes oder unvollständiges Argument: ${args[i]}`);
  }
  if (!options.source) throw new Error('--source "Pfad/zum/Assetordner" ist erforderlich.');
  const destination = path.resolve(root, options.out);
  const relative = path.relative(root, destination);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("Ausgaben müssen im Projekt bleiben.");
  await access(options.blender);
  await mkdir(destination, { recursive: true });
  const log = createWriteStream(path.join(destination, "inspection.log"));
  const command = ["--background", "--factory-startup", "--disable-autoexec", "--threads", "4", "--python-exit-code", "1", "--python", path.join(root, "tools/assets/inspect_blend.py"), "--", "--source", path.resolve(options.source), "--out", destination, "--baseline", path.resolve(root, options.baseline)];
  if (!options.thumbnails) command.push("--no-thumbnails");
  const child = spawn(options.blender, command, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let lineBuffer = "";
  child.stdout.on("data", bytes => {
    log.write(bytes);
    lineBuffer += bytes.toString();
    let newline;
    while ((newline = lineBuffer.indexOf("\n")) >= 0) {
      const line = lineBuffer.slice(0, newline).trim(); lineBuffer = lineBuffer.slice(newline + 1);
      if (line.startsWith("NC_ASSET_PROGRESS ") || line.startsWith("NC_ASSET_RESULT ")) console.log(line);
    }
  });
  child.stderr.on("data", bytes => log.write(bytes));
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  await new Promise(resolve => log.end(resolve));
  if (code !== 0) throw new Error(`Blender-Prüfung endete mit Code ${code}. Details: ${path.relative(root, destination)}/inspection.log`);
  const report = JSON.parse(await readFile(path.join(destination, "report.json"), "utf8"));
  const findings = [];
  if (!report.summary.licenseFiles.length) findings.push("Keine separate Lizenzdatei im untersuchten Ordner; Herkunft bleibt offen.");
  for (const asset of report.assets) {
    if (asset.status !== "ok") { findings.push(`${asset.path}: ${asset.error}`); continue; }
    if (asset.aliases.length) findings.push(`${asset.path}: Quellschreibweise ${asset.aliases.map(a => a.source).join(", ")}; nur für die Vorschau zugeordnet.`);
    if (asset.rigComparison) {
      const c = asset.rigComparison;
      findings.push(`${asset.path}: Rig ${c.sameBindContract ? "stimmt in Namen, Hierarchie und Bindematrizen überein" : "hat Abweichungen im Bindevertrag"}; ${c.restDifferences.length} abweichende Knochenmatrizen; ${c.matchingAnimationCurves.length} identische Animationskurven; neue Clipnamen: ${c.newClipNames.join(", ") || "keine"}.`);
      findings.push(`${asset.path}: ${Object.values(asset.groups).filter(g => Object.keys(g).length === 4).length} komplette Figurensets; ${asset.actions.filter(a => a.temporalVertexMotion > 0.000001).length}/${asset.actions.length} Clips mit zeitlicher Vertexbewegung in fünf Samples.`);
    }
    const skin = asset.meshes.filter(m => m.skin);
    if (asset.flags.includes("raw-skin-weights-not-normalized")) findings.push(`${asset.path}: Rohgewichte sind nicht überall normiert; beim späteren GLB-Export normalisieren und erneut prüfen.`);
    if (asset.flags.includes("raw-skin-over-four-influences")) findings.push(`${asset.path}: ${skin.reduce((sum, m) => sum + m.skin.overFourInfluences, 0)} Quellvertices mit mehr als vier Bone-Einflüssen.`);
    const otherFlags = asset.flags.filter(f => !["source-name-alias", "raw-skin-weights-not-normalized", "raw-skin-over-four-influences"].includes(f));
    if (otherFlags.length) findings.push(`${asset.path}: ${otherFlags.join(", ")}.`);
  }
  const text = ["# Lokale Assetprüfung", "", `Quelle: ${report.sourceRoot}`, `Blender ${report.blender}; Prüfer ${report.inspectorVersion}.`, "", `${report.summary.files} Dateien, ${report.summary.inspected} neu untersucht, ${report.summary.cacheHits} aus Cache (einschließlich Referenzmaster). Quellen unverändert: ${report.summary.sourceUnchanged ? "ja" : "NEIN"}.`, `${report.summary.categories.weapons ?? 0} vollständige Waffen, ${report.summary.categories.components ?? 0} Bauteile (Dateinamenklassifikation), ${report.summary.thumbnails} Vorschaumotive.`, ...Object.entries(report.summary.triangles).map(([category, range]) => `${category}: ${range.min}–${range.max} Dreiecke nach Modifiern.`), "", ...findings.map(f => `- ${f}`), "", "Vollständige Daten: report.json. Geometriefingerabdrücke vergleichen geordnete lokale Vertex-/Dreiecksdaten; sie beweisen keine Material-/Riggleichheit. Fünf Animationssamples pro Clip ersetzen keine Bewegungsabnahme im Spiel.", ""];
  await writeFile(path.join(destination, "summary.md"), text.join("\n"));
  if (options.thumbnails) {
    const { buildContactSheets } = await import("./contact-sheets.mjs");
    await buildContactSheets(destination, report);
  }
  console.log(JSON.stringify({ ok: true, report: path.relative(root, path.join(destination, "report.json")), findings }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
