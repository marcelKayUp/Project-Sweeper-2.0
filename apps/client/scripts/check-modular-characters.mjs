import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import validator from "gltf-validator";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import "@babylonjs/loaders/glTF/index.js";
import { createModularCharacterSpec, getModularLibrary, MODULAR_SOURCE_ID, MODULAR_FEMALE_SOURCE_ID, MODULAR_SOURCE_IDS, MODULAR_VARIANTS, MODULAR_SLOTS, modularPartName } from "../../../packages/characters/src/index.ts";
import { exportModularCharacterGlb } from "../src/characters/modularPreview.ts";

const client = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = path.resolve(client, "../..");
const output = path.join(project, "artifacts/characters/modular");
const base = "http://127.0.0.1:4175";
const asset = path.join(client, "public/assets/characters/quaternius");
const catalog = JSON.parse(await readFile(path.join(asset, "catalog.json"), "utf8"));
const sourceBytes = new Uint8Array(await readFile(path.join(asset, "master.glb")));
const report = { passed: false, check: "modular-character-workshop", assertions: [], exports: {}, pageErrors: [], warnings: [] };
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const pass = (name, detail) => report.assertions.push({ name, ...(detail === undefined ? {} : { detail }) });
function documentFrom(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString().trim());
}
function movingChannels(bytes, gltf, animation) {
  const binary = bytes.subarray(28 + bytes.readUInt32LE(12));
  return animation.samplers.filter(sampler => {
    const accessor = gltf.accessors[sampler.output];
    const view = gltf.bufferViews[accessor.bufferView];
    assert.equal(accessor.componentType, 5126);
    const width = { VEC3: 3, VEC4: 4 }[accessor.type];
    assert(width, "Animation output must be a transform vector");
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const stride = view.byteStride ?? width * 4;
    for (let key = 1; key < accessor.count; key++) for (let component = 0; component < width; component++) {
      if (Math.abs(binary.readFloatLE(offset + key * stride + component * 4) - binary.readFloatLE(offset + component * 4)) > 0.000001) return true;
    }
    return false;
  }).length;
}
async function inspect(bytes, spec, name, expectedCatalog = catalog) {
  const gltf = documentFrom(bytes);
  const validation = await validator.validateBytes(new Uint8Array(bytes), { uri: name });
  assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues.messages.filter(m => m.severity === 0)));
  assert.equal(validation.issues.numWarnings, 0, JSON.stringify(validation.issues.messages.filter(m => m.severity === 1)));
  assert.equal(gltf.skins.length, 1);
  assert.equal(gltf.skins[0].joints.length, 62);
  assert.deepEqual(gltf.animations.map(a => a.name).sort(), [...expectedCatalog.clips].sort());
  assert(gltf.animations.every(a => a.channels.length > 0 && a.samplers.length > 0));
  assert(gltf.animations.every(a => movingChannels(bytes, gltf, a) > 0), "Native animation keys must actually vary over time");
  assert(!gltf.cameras?.length && !gltf.extensions?.KHR_lights_punctual, "production GLB excludes preview cameras/lights");
  const meta = gltf.nodes.map(n => n.extras?.modularCharacter).find(Boolean);
  assert.deepEqual(meta?.spec, spec, "GLB must preserve its exact recipe");
  assert.equal(meta.source, spec.source);
  assert.equal(meta.license, expectedCatalog.license);
  assert.equal(meta.assetSha256, expectedCatalog.assetSha256);
  assert.equal(meta.sourceBlendSha256, expectedCatalog.sourceBlendSha256);
  const allParts = new Set([...MODULAR_SOURCE_IDS.flatMap(source => getModularLibrary(source).variants.flatMap(v => MODULAR_SLOTS.map(s => modularPartName(s, v, source)))), "Pistol", "Sword", "Backpack"]);
  const selected = new Set([...MODULAR_SLOTS.map(slot => modularPartName(slot, spec.parts[slot], spec.source)), ...(spec.equipment === "none" ? [] : [expectedCatalog.equipment[spec.equipment]])]);
  const contained = new Set(gltf.nodes.map(n => n.name).filter(n => allParts.has(n)));
  assert.deepEqual([...contained].sort(), [...selected].sort(), "only selected source parts may be exported");
  const engine = new NullEngine({ renderWidth: 1, renderHeight: 1, textureSize: 1 });
  const scene = new Scene(engine); scene.useRightHandedSystem = true;
  try {
    const container = await LoadAssetContainerAsync(new Uint8Array(bytes), scene, { pluginExtension: ".glb" });
    assert.equal(container.skeletons.length, 1);
    assert.equal(container.skeletons[0].bones.length, 62);
    assert.equal(container.animationGroups.length, 24);
    assert(container.meshes.some(m => m.getTotalVertices() > 0));
    container.dispose();
  } finally { scene.dispose(); engine.dispose(); }
  const bindAccessor = gltf.accessors[gltf.skins[0].inverseBindMatrices];
  const bindView = gltf.bufferViews[bindAccessor.bufferView];
  const binary = bytes.subarray(28 + bytes.readUInt32LE(12));
  const bind = Array.from({ length: bindAccessor.count * 16 }, (_, i) => binary.readFloatLE((bindView.byteOffset ?? 0) + (bindAccessor.byteOffset ?? 0) + Math.floor(i / 16) * (bindView.byteStride ?? 64) + (i % 16) * 4));
  return { sha256: sha(bytes), bytes: bytes.length, source: spec.source, sourceBlendSha256: expectedCatalog.sourceBlendSha256, bindHash: sha(JSON.stringify(bind)), joints: 62, clips: 24, materials: gltf.materials.length, triangles: gltf.meshes.flatMap(m => m.primitives).reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0), validator: { errors: 0, warnings: 0 } };
}
async function download(page, button, filename) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: button, exact: true }).click();
  const file = await event; const destination = path.join(output, filename);
  await file.saveAs(destination);
  return readFile(destination);
}
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
let browser, preview;
try {
  await mkdir(output, { recursive: true });
  const masterCheck = await validator.validateBytes(sourceBytes, { uri: "master.glb" });
  assert.equal(masterCheck.issues.numErrors, 0); assert.equal(masterCheck.issues.numWarnings, 0);
  const masterDoc = documentFrom(Buffer.from(sourceBytes));
  assert(masterDoc.animations.every(a => movingChannels(Buffer.from(sourceBytes), masterDoc, a) > 0), "Library must contain motion, not just named constant channels");
  const colors = new Set(masterDoc.materials.map(m => JSON.stringify(m.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1])));
  assert(colors.size > 8, "Native material colors must survive the Blender export");
  pass("source library validates", { meshes: 47, joints: 62, clips: 24, sha256: sha(sourceBytes) });
  // Every native outfit passes all four slot paths through the real exporter.
  for (const variant of MODULAR_VARIANTS) {
    const spec = createModularCharacterSpec(42, variant);
    const result = await exportModularCharacterGlb(spec, sourceBytes, catalog);
    const bytes = Buffer.from(await result.blob.arrayBuffer());
    report.exports[variant] = await inspect(bytes, spec, `${variant}.glb`);
    assert.equal(result.report.triangles, report.exports[variant].triangles);
    if (variant === "Casual2") {
      await writeFile(path.join(output, "casual2.glb"), bytes);
      await writeFile(path.join(output, "casual2.json"), JSON.stringify(spec, null, 2));
    }
  }
  pass("all eleven native sets export through the shared rig", Object.fromEntries(Object.entries(report.exports).map(([v, r]) => [v, r.triangles])));
  const mixedBase = { ...createModularCharacterSpec(), parts: { head: "Punk", body: "Swat", legs: "Farmer", feet: "Worker" }, stature: 1.15, palette: { skin: "#BD895D", hair: "#244C78", cloth: null, armor: "#183846", accent: "#EF7722" } };
  for (const equipment of ["pistol", "sword", "backpack"]) {
    const spec = { ...mixedBase, equipment };
    const result = await exportModularCharacterGlb(spec, sourceBytes, catalog);
    const bytes = Buffer.from(await result.blob.arrayBuffer());
    report.exports[equipment] = await inspect(bytes, spec, `mixed-${equipment}.glb`);
    if (equipment === "pistol") {
      await writeFile(path.join(output, "mixed-pistol.glb"), bytes);
      await writeFile(path.join(output, "mixed-pistol.json"), JSON.stringify(spec, null, 2));
    }
  }
  pass("mixed source parts, palette overrides, stature and all three equipment meshes export");
  const femaleDir = path.join(client, "public/assets/characters/women");
  const femaleCatalog = JSON.parse(await readFile(path.join(femaleDir, "catalog.json"), "utf8"));
  const femaleBytes = new Uint8Array(await readFile(path.join(femaleDir, "master.glb")));
  const femaleMasterCheck = await validator.validateBytes(femaleBytes, { uri: "female-master.glb" });
  assert.equal(femaleMasterCheck.issues.numErrors, 0); assert.equal(femaleMasterCheck.issues.numWarnings, 0);
  assert.notEqual(femaleCatalog.sourceBlendSha256, catalog.sourceBlendSha256);
  await assert.rejects(() => exportModularCharacterGlb(createModularCharacterSpec(42, undefined, MODULAR_FEMALE_SOURCE_ID), sourceBytes, catalog), /Quelle|Quellen|Bibliothek|Katalog|verschieden/i);
  for (const variant of getModularLibrary(MODULAR_FEMALE_SOURCE_ID).variants) {
    const spec = createModularCharacterSpec(42, variant, MODULAR_FEMALE_SOURCE_ID);
    const result = await exportModularCharacterGlb(spec, femaleBytes, femaleCatalog);
    const bytes = Buffer.from(await result.blob.arrayBuffer());
    const inspected = await inspect(bytes, spec, `female-${variant}.glb`, femaleCatalog);
    report.exports[`female-${variant}`] = inspected;
    assert.equal(inspected.triangles, result.report.triangles);
    assert.notEqual(inspected.bindHash, report.exports.Casual2.bindHash, "female exports must preserve a distinct native bind rig");
    if (variant === "Casual") {
      await writeFile(path.join(output, "female-casual.glb"), bytes);
      await writeFile(path.join(output, "female-casual.json"), JSON.stringify(spec, null, 2));
    }
  }
  for (const equipment of ["pistol", "sword"]) {
    const spec = { ...createModularCharacterSpec(42, "Soldier", MODULAR_FEMALE_SOURCE_ID), equipment };
    const result = await exportModularCharacterGlb(spec, femaleBytes, femaleCatalog);
    const bytes = Buffer.from(await result.blob.arrayBuffer());
    report.exports[`female-${equipment}`] = await inspect(bytes, spec, `female-${equipment}.glb`, femaleCatalog);
    await writeFile(path.join(output, `female-${equipment}.glb`), bytes);
  }
  pass("all ten female sets and both native bone-attached weapons preserve the female rig");
  preview = spawn(process.execPath, [path.join(client, "node_modules/vite/bin/vite.js"), "preview", "--outDir", "dist-characters", "--host", "127.0.0.1", "--port", "4175", "--strictPort"], { cwd: client, windowsHide: true, stdio: "ignore" });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await fetch(`${base}/characters.html`).then(r => r.ok).catch(() => false)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  for (const channel of ["chrome", "msedge", undefined]) {
    try { browser = await chromium.launch({ channel, headless: true }); break; } catch { /* try another installed browser */ }
  }
  assert(browser, "No usable browser installed");
  report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on("pageerror", error => report.pageErrors.push(error.message));
  page.on("console", msg => { if (msg.type() === "warning") report.warnings.push(msg.text()); });
  await page.goto(`${base}/characters.html`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Figuren-Werkstatt", exact: true }).waitFor();
  await page.getByRole("button", { name: "GLB exportieren ↗", exact: true }).waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector(".mw-export-button")?.disabled);
  assert.equal(await page.getByLabel("Native Animation", { exact: true }).inputValue(), "Idle_Neutral");
  assert.equal(await page.locator(".mw-preview-host canvas").count(), 1);
  const webgl = await page.locator(".mw-preview-host canvas").evaluate(canvas => ({ width: canvas.width, height: canvas.height, context: Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")) }));
  assert(webgl.context && webgl.width > 200 && webgl.height > 200);
  await frames(page);
  await page.screenshot({ path: path.join(output, "workshop-1366.png"), fullPage: true });
  for (const variant of MODULAR_VARIANTS) {
    await page.getByLabel("Modellvorlage", { exact: true }).selectOption(variant);
    for (const label of ["Kopf", "Oberkörper", "Beine", "Schuhe"]) assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), variant);
  }
  for (const clip of catalog.clips) await page.getByLabel("Native Animation", { exact: true }).selectOption(clip);
  for (const view of ["Front", "Schräg", "Rücken", "Seite"]) {
    const button = page.getByRole("button", { name: view, exact: true }); await button.click();
    assert.equal(await button.getAttribute("aria-pressed"), "true");
  }
  await page.getByLabel("Seed", { exact: true }).fill("42");
  await page.getByRole("button", { name: "Deterministische Variante aus dem sichtbaren Seed erzeugen" }).click();
  const seeded = await page.getByLabel("Figuren-JSON bearbeiten").inputValue();
  await page.getByRole("button", { name: "Deterministische Variante aus dem sichtbaren Seed erzeugen" }).click();
  assert.equal(await page.getByLabel("Figuren-JSON bearbeiten").inputValue(), seeded);
  const input = page.getByLabel("Figuren-JSON bearbeiten");
  const original = JSON.parse(seeded);
  for (const [name, candidate] of [["foreign", JSON.stringify({ ...original, source: "elsewhere" })], ["bad-part", JSON.stringify({ ...original, parts: { ...original.parts, head: "unknown" } })], ["oversize", " ".repeat(32769)]]) {
    await input.fill(candidate);
    await page.getByRole("button", { name: "JSON prüfen & übernehmen", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "JSON nicht übernommen" }).waitFor();
    const actual = JSON.parse((await download(page, "JSON herunterladen", `rejected-${name}.json`)).toString());
    assert.deepEqual(actual, original);
  }
  await input.fill(seeded);
  await page.getByRole("button", { name: "JSON prüfen & übernehmen", exact: true }).click();
  pass("browser presets, source validation, seed determinism, cameras and all 24 clips", webgl);
  await page.getByLabel("Modellvorlage", { exact: true }).selectOption("Casual2");
  await page.getByLabel("Native Animation", { exact: true }).selectOption("Walk");
  const expected = JSON.parse(await input.inputValue());
  const moving = await download(page, "GLB exportieren ↗", "browser-walking.glb");
  await page.getByRole("button", { name: "Animation pausieren", exact: true }).click();
  const paused = await download(page, "GLB exportieren ↗", "browser-paused.glb");
  assert.equal(sha(moving), sha(paused), "preview motion must never be baked into exported bind pose");
  report.exports.browser = await inspect(paused, expected, "browser-paused.glb");
  pass("download contains selected parts only and is identical during playback/pause");
  const maleDraft = JSON.parse(await input.inputValue());
  const model = page.getByLabel("Körpermodell", { exact: true });
  await model.selectOption(MODULAR_FEMALE_SOURCE_ID);
  await page.waitForFunction(() => !document.querySelector(".mw-export-button")?.disabled);
  assert.equal(await page.locator(".mw-preview-host canvas").count(), 1);
  assert.equal(await page.getByLabel("Modellvorlage", { exact: true }).locator("option:not([disabled])").count(), 10);
  assert.equal(await page.getByLabel("Kopf", { exact: true }).inputValue(), "Casual");
  assert.equal(await page.getByLabel("Ausrüstung", { exact: true }).locator('option[value="backpack"]').count(), 0);
  for (const variant of getModularLibrary(MODULAR_FEMALE_SOURCE_ID).variants) {
    await page.getByLabel("Modellvorlage", { exact: true }).selectOption(variant);
    for (const label of ["Kopf", "Oberkörper", "Beine", "Schuhe"]) assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), variant);
  }
  await page.getByLabel("Modellvorlage", { exact: true }).selectOption("Casual");
  await page.getByLabel("Kopf", { exact: true }).selectOption("Formal");
  await page.getByLabel("Ausrüstung", { exact: true }).selectOption("pistol");
  const femaleDraft = JSON.parse(await input.inputValue());
  const femalePaused = await download(page, "GLB exportieren ↗", "browser-female-paused.glb");
  report.exports.browserFemale = await inspect(femalePaused, femaleDraft, "browser-female-paused.glb", femaleCatalog);
  assert.notEqual(report.exports.browserFemale.bindHash, report.exports.browser.bindHash);
  await page.getByRole("button", { name: "Animation abspielen", exact: true }).click();
  const femaleMoving = await download(page, "GLB exportieren ↗", "browser-female-moving.glb");
  assert.equal(sha(femalePaused), sha(femaleMoving));
  await model.selectOption(MODULAR_SOURCE_ID);
  await page.waitForFunction(() => !document.querySelector(".mw-export-button")?.disabled);
  assert.deepEqual(JSON.parse(await input.inputValue()), maleDraft, "male draft survives source switching");
  await input.fill(JSON.stringify(femaleDraft));
  await page.getByRole("button", { name: "JSON prüfen & übernehmen", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".mw-export-button")?.disabled);
  assert.equal(await model.inputValue(), MODULAR_FEMALE_SOURCE_ID);
  assert.deepEqual(JSON.parse((await download(page, "JSON herunterladen", "browser-female.json")).toString()), femaleDraft);
  await model.selectOption(MODULAR_SOURCE_ID);
  await model.selectOption(MODULAR_FEMALE_SOURCE_ID);
  await model.selectOption(MODULAR_SOURCE_ID);
  await model.selectOption(MODULAR_FEMALE_SOURCE_ID);
  await page.waitForFunction(() => !document.querySelector(".mw-export-button")?.disabled);
  assert.deepEqual(JSON.parse(await input.inputValue()), femaleDraft, "female draft survives rapid source switches");
  assert.equal(await page.locator(".mw-preview-host canvas").count(), 1);
  await page.getByLabel("Modellvorlage", { exact: true }).selectOption("Casual");
  await page.getByLabel("Ausrüstung", { exact: true }).selectOption("none");
  await page.getByLabel("Native Animation", { exact: true }).selectOption("Idle_Neutral");
  await page.getByRole("button", { name: "Front", exact: true }).click();
  await frames(page);
  await page.screenshot({ path: path.join(output, "workshop-female-1366.png"), fullPage: true });
  pass("female selector, ten sets, native bind rig, paused export, JSON source roundtrip and independent drafts");
  await page.getByLabel("Native Animation", { exact: true }).selectOption("Idle_Neutral");
  await page.getByRole("button", { name: "Front", exact: true }).click();
  await frames(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await frames(page);
  await page.screenshot({ path: path.join(output, "workshop-1920.png"), fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const isolated = await context.newPage();
  await isolated.goto(`${base}/characters.html`, { waitUntil: "networkidle" });
  assert.equal(await isolated.getByLabel("Kopf", { exact: true }).inputValue(), "Casual2");
  await page.getByLabel("Kopf", { exact: true }).selectOption("Punk");
  assert.equal(await isolated.getByLabel("Kopf", { exact: true }).inputValue(), "Casual2");
  await isolated.close();
  pass("independent editors and desktop layout");
  const failed = await context.newPage();
  await failed.route("**/assets/characters/quaternius/master.glb", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await failed.goto(`${base}/characters.html`, { waitUntil: "networkidle" });
  await failed.getByRole("alert").filter({ hasText: "3D-Vorschau nicht verfügbar" }).waitFor();
  await failed.unroute("**/assets/characters/quaternius/master.glb");
  await failed.getByRole("button", { name: "Vorschau erneut laden" }).click();
  await failed.waitForFunction(() => !document.querySelector(".mw-export-button")?.disabled);
  await failed.close();
  pass("asset load failure is explained and retry recovers");
  const failedFemale = await context.newPage();
  await failedFemale.route("**/assets/characters/women/master.glb", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await failedFemale.goto(`${base}/characters.html`, { waitUntil: "networkidle" });
  await failedFemale.getByLabel("Körpermodell", { exact: true }).selectOption(MODULAR_FEMALE_SOURCE_ID);
  await failedFemale.getByRole("alert").filter({ hasText: "3D-Vorschau nicht verfügbar" }).waitFor();
  assert(await failedFemale.getByRole("button", { name: "GLB exportieren ↗", exact: true }).isDisabled());
  await failedFemale.getByLabel("Körpermodell", { exact: true }).selectOption(MODULAR_SOURCE_ID);
  await failedFemale.waitForFunction(() => !document.querySelector(".mw-export-button")?.disabled);
  await failedFemale.unroute("**/assets/characters/women/master.glb");
  await failedFemale.getByLabel("Körpermodell", { exact: true }).selectOption(MODULAR_FEMALE_SOURCE_ID);
  await failedFemale.waitForFunction(() => !document.querySelector(".mw-export-button")?.disabled);
  assert.equal(await failedFemale.locator(".mw-preview-host canvas").count(), 1);
  await failedFemale.close();
  pass("female load failure blocks export, male remains usable and female reload recovers");
  assert.equal(report.pageErrors.length, 0, report.pageErrors.join("\n"));
  report.warnings = [...new Set(report.warnings)];
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
} finally {
  await browser?.close(); preview?.kill();
  await writeFile(path.join(output, "check.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ passed: report.passed, assertions: report.assertions.length, exports: Object.keys(report.exports), report: "artifacts/characters/modular/check.json", error: report.error }));
}
