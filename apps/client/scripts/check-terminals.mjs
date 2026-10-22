import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import validator from "gltf-validator";
import { chromium } from "playwright";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import "@babylonjs/loaders/glTF/index.js";

const client = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(client, "../..");
const bundle = path.join(root, "assets/generated/props/terminals");
const output = path.join(root, "artifacts/terminals");
const publicDir = path.join(client, "public/assets/props/terminals");
const base = "http://127.0.0.1:4176";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const report = { passed: false, assertions: [], assets: {}, pageErrors: [], warnings: [] };
const pass = (name, detail) => report.assertions.push({ name, detail });
const close = (actual, expected, tolerance = 0.00001) => assert(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
async function command(args) {
  const child = spawn(process.execPath, ["tools/terminals/generate-terminals.mjs", ...args], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", bytes => { log += bytes; }); child.stderr.on("data", bytes => { log += bytes; });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  assert.equal(code, 0, log); return log;
}
function gltf(bytes) { assert.equal(bytes.toString("ascii", 0, 4), "glTF"); assert.equal(bytes.readUInt32LE(8), bytes.length); return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString().trim()); }
function accessorBytes(bytes, doc, accessorId) {
  const accessor = doc.accessors[accessorId], view = doc.bufferViews[accessor.bufferView];
  const binary = bytes.subarray(28 + bytes.readUInt32LE(12));
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const componentBytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
  assert(components && componentBytes);
  const stride = view.byteStride ?? componentBytes * components;
  return Buffer.concat(Array.from({ length: accessor.count }, (_, index) => {
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + index * stride;
    return binary.subarray(start, start + componentBytes * components);
  }));
}
let browser, preview;
try {
  await mkdir(path.join(output, "thumbnails"), { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(bundle, "manifest.json"), "utf8"));
  const catalog = JSON.parse(await readFile(path.join(publicDir, "catalog.json"), "utf8"));
  assert.equal(catalog.assets.length, 18); assert.equal(new Set(catalog.assets.map(a => a.id)).size, 18);
  assert.equal(manifest.codeSha256, sha(await readFile(path.join(root, "tools/terminals/build_terminal_family.py"))), "Assets must come from the current recipe code");
  assert.equal(manifest.recipeSha256, sha(await readFile(path.join(root, manifest.recipe))));
  const engine = new NullEngine({ renderWidth: 1, renderHeight: 1, textureSize: 1 });
  const shapeHashes = new Map();
  try {
    for (const asset of catalog.assets) {
      const bytes = await readFile(path.join(publicDir, asset.file));
      const origin = manifest.assets.find(a => a.id === asset.id);
      assert.deepEqual(origin.spec, asset.spec); assert.equal(sha(bytes), asset.sha256);
      for (const [file, expected] of Object.entries(origin.files)) assert.equal(sha(await readFile(path.join(bundle, file))), expected, file);
      const checked = await validator.validateBytes(new Uint8Array(bytes), { uri: asset.file });
      assert.equal(checked.issues.numErrors, 0, JSON.stringify(checked.issues.messages));
      assert.equal(checked.issues.numWarnings, 0, JSON.stringify(checked.issues.messages.filter(m => m.severity <= 1)));
      const doc = gltf(bytes);
      assert(!doc.animations?.length && !doc.skins?.length && !doc.cameras?.length && !doc.extensions?.KHR_lights_punctual);
      assert(doc.buffers.every(b => !b.uri)); assert(doc.images.length === 1 && doc.images.every(i => i.bufferView !== undefined && !i.uri), "self-contained display image");
      const recipe = doc.nodes.map(n => n.extras?.terminalRecipe).find(Boolean);
      assert.deepEqual(JSON.parse(recipe), asset.spec);
      const primitives = doc.meshes.flatMap(m => m.primitives);
      const triangles = primitives.reduce((sum, p) => sum + doc.accessors[p.indices].count / 3, 0);
      assert.equal(triangles, asset.stats.triangles); assert(triangles <= manifest.budgets.triangles);
      assert.equal(doc.materials.length, asset.stats.materials); assert(doc.materials.length <= manifest.budgets.materials);
      assert(bytes.length <= manifest.budgets.glbBytes);
      const geometry = sha(Buffer.concat(primitives.flatMap(p => [accessorBytes(bytes, doc, p.attributes.POSITION), accessorBytes(bytes, doc, p.indices)])));
      const key = `${asset.spec.form}:${asset.spec.size}`;
      if (shapeHashes.has(key)) assert.equal(geometry, shapeHashes.get(key), "Palette must not change geometry"); else shapeHashes.set(key, geometry);
      const scene = new Scene(engine); scene.useRightHandedSystem = true;
      try {
        const container = await LoadAssetContainerAsync(new Uint8Array(bytes), scene, { pluginExtension: ".glb" }); container.addAllToScene();
        const meshes = container.meshes.filter(m => m.getTotalVertices() > 0);
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (const mesh of meshes) {
          mesh.computeWorldMatrix(true); const box = mesh.getBoundingInfo().boundingBox;
          [box.minimumWorld.x, box.minimumWorld.y, box.minimumWorld.z].forEach((v, i) => { min[i] = Math.min(min[i], v); });
          [box.maximumWorld.x, box.maximumWorld.y, box.maximumWorld.z].forEach((v, i) => { max[i] = Math.max(max[i], v); });
        }
        close(min[1], 0);
        const expected = asset.stats.dimensions;
        [expected[0], expected[2], expected[1]].forEach((v, i) => close(max[i] - min[i], v));
        assert.equal(meshes.length, 5, "one mesh per material to bound draw calls");
        container.dispose();
      } finally { scene.dispose(); }
      report.assets[asset.id] = { triangles, bytes: bytes.length, materials: doc.materials.length, geometrySha256: geometry, glbSha256: asset.sha256, validator: { errors: 0, warnings: 0 } };
    }
  } finally { engine.dispose(); }
  for (const form of ["pedestal", "console", "wall"]) {
    const compact = catalog.assets.find(a => a.spec.form === form && a.spec.size === "compact");
    const standard = catalog.assets.find(a => a.spec.form === form && a.spec.size === "standard");
    compact.stats.dimensions.forEach((v, i) => close(v / standard.stats.dimensions[i], .8));
  }
  pass("all 18 GLBs validate and reimport at correct meter scale", { forms: 3, sizes: 2, palettes: 3, geometryUnaffectedByPalette: true });
  await command([]);
  const warm = JSON.parse(await readFile(path.join(bundle, "manifest.json"), "utf8"));
  assert.deepEqual(warm.lastRun, { built: 0, cacheHits: 18 });
  pass("unchanged family build reuses all 18 checked outputs", warm.lastRun);
  const repeated = catalog.assets.find(a => a.spec.form === "pedestal" && a.spec.size === "standard" && a.spec.organization === "daeyang");
  const repeatOut = "artifacts/terminals/repeat";
  await command(["--only", repeated.id, "--out", repeatOut, "--force"]);
  const repeatPath = path.join(root, repeatOut, "glb", repeated.file);
  assert.equal(sha(await readFile(repeatPath)), repeated.sha256, "Fresh independent builds must be byte-identical");
  await writeFile(repeatPath, Buffer.from("damaged generated fixture"));
  await command(["--only", repeated.id, "--out", repeatOut]);
  assert.equal(sha(await readFile(repeatPath)), repeated.sha256);
  pass("fresh isolated repeat is byte-identical; damaged cache output is regenerated", repeated.id);
  const alternate = JSON.parse(await readFile(path.join(root, "assets/specs/props/terminal-family.json"), "utf8"));
  alternate.seed = 47;
  await writeFile(path.join(output, "seed47.json"), JSON.stringify(alternate));
  await command(["--recipe", "artifacts/terminals/seed47.json", "--only", repeated.id, "--out", "artifacts/terminals/seed47"]);
  const alternateBytes = await readFile(path.join(output, "seed47/glb", repeated.file));
  const alternateDoc = gltf(alternateBytes);
  const alternatePrimitives = alternateDoc.meshes.flatMap(m => m.primitives);
  assert.equal(sha(Buffer.concat(alternatePrimitives.flatMap(p => [accessorBytes(alternateBytes, alternateDoc, p.attributes.POSITION), accessorBytes(alternateBytes, alternateDoc, p.indices)]))), report.assets[repeated.id].geometrySha256);
  assert.notEqual(sha(await readFile(path.join(output, "seed47/textures", repeated.id + ".png"))), sha(await readFile(path.join(bundle, "textures", repeated.id + ".png"))));
  assert.equal(JSON.parse(alternateDoc.nodes.map(n => n.extras?.terminalRecipe).find(Boolean)).seed, 47);
  pass("changed seed varies the display without changing geometry");
  preview = spawn(process.execPath, [path.join(client, "node_modules/vite/bin/vite.js"), "preview", "--outDir", "dist-terminals", "--host", "127.0.0.1", "--port", "4176", "--strictPort"], { cwd: client, windowsHide: true, stdio: "ignore" });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (await fetch(base + "/terminals.html").then(r => r.ok).catch(() => false)) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, "Preview server did not start");
  for (const channel of ["chrome", "msedge", undefined]) { try { browser = await chromium.launch({ channel, headless: true }); break; } catch {} }
  assert(browser, "No browser available");
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on("pageerror", e => report.pageErrors.push(e.message));
  page.on("console", msg => { if (msg.type() === "warning") report.warnings.push(msg.text()); });
  await page.goto(base + "/terminals.html", { waitUntil: "networkidle" });
  const canvas = page.locator("canvas");
  for (const asset of catalog.assets) {
    await page.getByLabel("Bauform", { exact: true }).selectOption(asset.spec.form);
    await page.getByLabel("Größe", { exact: true }).selectOption(asset.spec.size);
    await page.getByLabel("Organisation", { exact: true }).selectOption(asset.spec.organization);
    await page.waitForFunction(id => document.querySelector("canvas")?.dataset.assetId === id && document.querySelector("#download")?.getAttribute("aria-disabled") === "false", asset.id);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.equal(await page.locator("canvas").count(), 1);
    const visiblePixels = await canvas.evaluate(canvas => {
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) return 0;
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let different = 0;
      for (let i = 0; i < pixels.length; i += 4) if (Math.abs(pixels[i] - pixels[0]) + Math.abs(pixels[i + 1] - pixels[1]) + Math.abs(pixels[i + 2] - pixels[2]) > 12) different++;
      return different;
    });
    assert(visiblePixels > 500, `Blank render for ${asset.id}: ${visiblePixels}`);
    const bounds = await canvas.boundingBox(), edge = Math.min(bounds.width, bounds.height);
    await page.screenshot({ path: path.join(output, "thumbnails", asset.id + ".png"), clip: { x: bounds.x + (bounds.width - edge) / 2, y: bounds.y + (bounds.height - edge) / 2, width: edge, height: edge } });
  }
  await page.getByLabel("Bauform", { exact: true }).selectOption("pedestal");
  await page.getByLabel("Größe", { exact: true }).selectOption("standard");
  await page.getByLabel("Organisation", { exact: true }).selectOption("daeyang");
  await page.waitForFunction(id => document.querySelector("canvas")?.dataset.assetId === id, repeated.id);
  const downloaded = page.waitForEvent("download"); await page.getByRole("link", { name: "GLB herunterladen ↗" }).click();
  await (await downloaded).saveAs(path.join(output, "browser.glb")); assert.equal(sha(await readFile(path.join(output, "browser.glb"))), repeated.sha256);
  const jsonDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Rezept herunterladen" }).click();
  await (await jsonDownload).saveAs(path.join(output, "browser.json")); assert.deepEqual(JSON.parse(await readFile(path.join(output, "browser.json"), "utf8")), repeated.spec);
  for (const view of ["Front", "Rücken", "Schräg"]) { await page.getByRole("button", { name: view, exact: true }).click(); assert.equal(await page.getByRole("button", { name: view, exact: true }).getAttribute("aria-pressed"), "true"); }
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, "workshop.png"), fullPage: true });
  await page.getByLabel("Bauform", { exact: true }).selectOption("wall");
  await page.getByLabel("Bauform", { exact: true }).selectOption("console");
  await page.getByLabel("Bauform", { exact: true }).selectOption("pedestal");
  await page.waitForFunction(id => document.querySelector("canvas")?.dataset.assetId === id && document.querySelector("#download")?.getAttribute("aria-disabled") === "false", repeated.id);
  pass("browser shows all variants, source downloads, views and rapid switching", { browser: browser.version(), pageErrors: report.pageErrors.length });
  const failed = await context.newPage();
  await failed.route("**/terminal-pedestal-standard-falkenfeld-kessler.glb", r => r.fulfill({ status: 503, body: "Unavailable" }));
  await failed.goto(base + "/terminals.html", { waitUntil: "networkidle" });
  await failed.getByRole("alert").waitFor();
  assert.equal(await failed.locator("#download").getAttribute("href"), null);
  assert(await failed.getByRole("button", { name: "Rezept herunterladen" }).isDisabled());
  await failed.unroute("**/terminal-pedestal-standard-falkenfeld-kessler.glb");
  await failed.getByLabel("Organisation", { exact: true }).selectOption("daeyang");
  await failed.waitForFunction(() => document.querySelector("#download")?.getAttribute("aria-disabled") === "false");
  await failed.close();
  pass("load failure blocks exports and another selection recovers");
  // A contact sheet uses screenshots of actual GLBs at the same projection scale.
  const sheets = [];
  const html = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  for (const asset of catalog.assets) sheets.push(`<figure><img src="data:image/png;base64,${(await readFile(path.join(output, "thumbnails", asset.id + ".png"))).toString("base64")}"><figcaption>${html(asset.label)}<small>${asset.stats.triangles} Dreiecke · ${(asset.bytes / 1024).toFixed(1)} KiB</small></figcaption></figure>`);
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.setContent(`<html><head><style>*{box-sizing:border-box}body{margin:0;background:#0d161f;color:#d8e5eb;font:15px system-ui;padding:28px}h1{margin:0 0 7px;font-size:28px}p{color:#9bb1bf;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}figure{margin:0;background:#172530}img{width:100%;display:block}figcaption{padding:10px;font-size:12px;min-height:68px}small{display:block;color:#8daaba;margin-top:5px}</style></head><body><h1>NEON CONTRACT · Terminal-Familie</h1><p>3 Bauformen × 2 Größen × 3 Organisationsfarben · identischer Maßstab · direkt aus exportierten GLBs</p><div class="grid">${sheets.join("")}</div></body></html>`);
  await page.locator("img").evaluateAll(images => Promise.all(images.map(i => i.decode())));
  await page.locator("body").screenshot({ path: path.join(output, "contact-sheet.png") });
  assert.equal(report.pageErrors.length, 0, report.pageErrors.join("\n"));
  report.warnings = [...new Set(report.warnings)]; report.passed = true;
} catch (error) { report.error = error.stack ?? String(error); process.exitCode = 1; }
finally {
  await browser?.close(); preview?.kill();
  await mkdir(output, { recursive: true }); await writeFile(path.join(output, "check.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: report.passed, checks: report.assertions.length, assets: Object.keys(report.assets).length, report: "artifacts/terminals/check.json", error: report.error }));
}
