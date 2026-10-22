import { readFile, writeFile, mkdir, rename, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { randomizeCharacterSpec, randomizeModularCharacterSpec, validateCharacterSpec, validateModularCharacterSpec, buildCharacter, CHARACTER_VERSION, CLIP_NAMES, MODULAR_SOURCE_ID, MODULAR_FEMALE_SOURCE_ID } from "../../packages/characters/src/index.ts";
import { exportCharacterGlb } from "../../apps/client/src/characters/preview.ts";
import { exportModularCharacterGlb } from "../../apps/client/src/characters/modularPreview.ts";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const hash = (value) => createHash("sha256").update(value).digest("hex");
function localPath(value) {
  const resolved = path.resolve(project, value);
  const relative = path.relative(project, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("Pfad muss im Projekt bleiben.");
  return resolved;
}
async function atomicWrite(file, bytes) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, file);
}

try {
  const arguments_ = process.argv.slice(2);
  let input;
  let output = "artifacts/characters/cli";
  let seed = 42;
  let procedural = false;
  let model;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--out") {
      output = arguments_[++index];
      if (!output) throw new Error("--out benötigt einen Projektpfad.");
    } else if (argument === "--seed") {
      const raw = arguments_[++index];
      if (!raw || !/^\d+$/.test(raw)) throw new Error("--seed benötigt einen uint32-Wert.");
      seed = Number(raw);
      if (!Number.isSafeInteger(seed) || seed > 0xffff_ffff) throw new Error("Seed muss zwischen 0 und 4294967295 liegen.");
    } else if (argument === "--procedural") {
      procedural = true;
    } else if (argument === "--model") {
      model = arguments_[++index];
      if (model !== "male" && model !== "female") throw new Error("--model erwartet male oder female.");
    } else if (argument.startsWith("--") || input) {
      throw new Error(`Unbekanntes Argument: ${argument}`);
    } else input = argument;
  }
  let candidate;
  if (input) {
    const contents = await readFile(localPath(input));
    if (contents.byteLength > 32 * 1024) throw new Error("Spezifikation ist größer als 32 KiB.");
    candidate = JSON.parse(contents.toString("utf8"));
  } else candidate = procedural ? randomizeCharacterSpec(seed) : randomizeModularCharacterSpec(seed, model === "female" ? MODULAR_FEMALE_SOURCE_ID : MODULAR_SOURCE_ID);
  const modular = candidate?.schemaVersion === 2;
  const checked = modular ? validateModularCharacterSpec(candidate) : validateCharacterSpec(candidate);
  if (!checked.ok) throw new Error(checked.errors.join("\n"));
  const spec = checked.value;
  if (model && (!modular || (model === "female" ? MODULAR_FEMALE_SOURCE_ID : MODULAR_SOURCE_ID) !== spec.source)) throw new Error("--model passt nicht zur source der Spezifikation bzw. zur prozeduralen Quelle.");
  let stats, clips, blob, source;
  if (modular) {
    const assetFolder = path.join(project, "apps/client/public/assets/characters", spec.source === MODULAR_FEMALE_SOURCE_ID ? "women" : "quaternius");
    const catalog = JSON.parse(await readFile(path.join(assetFolder, "catalog.json"), "utf8"));
    const exported = await exportModularCharacterGlb(spec, new Uint8Array(await readFile(path.join(assetFolder, "master.glb"))), catalog);
    blob = exported.blob;
    const { clips: actualClips, ...actualStats } = exported.report;
    stats = actualStats;
    clips = actualClips;
    source = { author: catalog.author, license: catalog.license, url: catalog.sourceUrl, sourceId: catalog.sourceId, assetSha256: catalog.assetSha256, sourceBlendSha256: catalog.sourceBlendSha256 };
  } else {
    stats = buildCharacter(spec).stats;
    clips = CLIP_NAMES;
    blob = await exportCharacterGlb(spec);
    source = "Project-authored TypeScript geometry; no external figure models or textures.";
  }
  const glb = Buffer.from(await blob.arrayBuffer());
  const json = `${JSON.stringify(spec, null, 2)}\n`;
  const directory = localPath(output);
  await mkdir(directory, { recursive: true });
  const sourceFiles = (await readdir(path.join(project, "packages/characters/src")))
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .sort().map((file) => `packages/characters/src/${file}`);
  sourceFiles.push(modular ? "apps/client/src/characters/modularPreview.ts" : "apps/client/src/characters/preview.ts", "tools/characters/generate-character.mjs", "pnpm-lock.yaml");
  if (modular) sourceFiles.push(spec.source === MODULAR_FEMALE_SOURCE_ID ? "tools/characters/export_female_master.py" : "tools/characters/export_modular_master.py", `apps/client/public/assets/characters/${spec.source === MODULAR_FEMALE_SOURCE_ID ? "women" : "quaternius"}/catalog.json`);
  const recipeHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, hash(await readFile(path.join(project, file)))])));
  const manifest = {
    assetId: spec.id, generator: "NEON CONTRACT Character Creator", generatorVersion: modular ? "modular-1.1.0" : CHARACTER_VERSION,
    nodeVersion: process.version, babylonVersion: "9.31.2", specification: spec,
    stats, clips, source,
    recipeHashes, files: { [`${spec.id}.glb`]: hash(glb), [`${spec.id}.json`]: hash(json) },
    humanArtAcceptance: "open",
  };
  await atomicWrite(path.join(directory, `${spec.id}.glb`), glb);
  await atomicWrite(path.join(directory, `${spec.id}.json`), json);
  await atomicWrite(path.join(directory, `${spec.id}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, directory: path.relative(project, directory), assetId: spec.id, bytes: glb.byteLength, ...stats }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
