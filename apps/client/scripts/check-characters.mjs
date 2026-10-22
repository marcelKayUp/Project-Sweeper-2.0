import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import validator from "gltf-validator";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import { Scene } from "@babylonjs/core/scene.js";
import "@babylonjs/loaders/glTF/index.js";
import { buildCharacter } from "../../../packages/characters/src/index.ts";

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectDir = path.resolve(clientDir, "../..");
const outputDir = path.join(projectDir, "artifacts/characters");
const url = "http://127.0.0.1:4175/characters.html?quelle=prozedural";
const preview = spawn(process.execPath, [
  path.join(clientDir, "node_modules/vite/bin/vite.js"), "preview",
  "--outDir", "dist-characters", "--host", "127.0.0.1", "--port", "4175", "--strictPort",
], { cwd: clientDir, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });

let previewLog = "";
let previewExited = false;
preview.stdout.on("data", (chunk) => { previewLog += String(chunk); });
preview.stderr.on("data", (chunk) => { previewLog += String(chunk); });
preview.on("exit", () => { previewExited = true; });

let browser;
let report = {
  check: "characters-browser-and-glb",
  passed: false,
  url,
  assertions: [],
  versions: {},
  browser: null,
  screenshots: [],
  exports: {},
  warnings: [],
  pageErrors: [],
};
const warningCounts = new Map();
const deliveryValidation = { status: "skipped", files: [], reason: "delivery GLBs were not checked" };

function passed(name, detail) {
  report.assertions.push({ name, passed: true, ...(detail === undefined ? {} : { detail }) });
}

function readChunkHeader(buffer, offset) {
  assert(offset + 8 <= buffer.length, "GLB chunk header is truncated");
  return { length: buffer.readUInt32LE(offset), type: buffer.readUInt32LE(offset + 4), dataOffset: offset + 8 };
}

function parseGlb(buffer) {
  assert(buffer.length >= 20, "GLB is too short");
  assert.equal(buffer.toString("ascii", 0, 4), "glTF", "GLB magic must be glTF");
  assert.equal(buffer.readUInt32LE(4), 2, "GLB version must be 2");
  assert.equal(buffer.readUInt32LE(8), buffer.length, "GLB header length must match downloaded bytes");
  const jsonChunk = readChunkHeader(buffer, 12);
  assert.equal(jsonChunk.type, 0x4e4f534a, "first GLB chunk must contain JSON");
  const jsonEnd = jsonChunk.dataOffset + jsonChunk.length;
  assert(jsonEnd <= buffer.length, "GLB JSON chunk exceeds file bounds");
  const document = JSON.parse(buffer.toString("utf8", jsonChunk.dataOffset, jsonEnd).replace(/[\u0000\u0020]+$/g, ""));
  let binary = Buffer.alloc(0);
  let cursor = jsonEnd;
  while (cursor + 8 <= buffer.length) {
    const chunk = readChunkHeader(buffer, cursor);
    assert(chunk.dataOffset + chunk.length <= buffer.length, "GLB chunk exceeds file bounds");
    if (chunk.type === 0x004e4942) binary = buffer.subarray(chunk.dataOffset, chunk.dataOffset + chunk.length);
    cursor = chunk.dataOffset + chunk.length;
  }
  assert.equal(cursor, buffer.length, "GLB chunks must consume the entire file");
  return { document, binary };
}

const componentInfo = new Map([
  [5120, { bytes: 1, get: (view, offset) => view.getInt8(offset), normalized: (value) => Math.max(value / 127, -1) }],
  [5121, { bytes: 1, get: (view, offset) => view.getUint8(offset), normalized: (value) => value / 255 }],
  [5122, { bytes: 2, get: (view, offset) => view.getInt16(offset, true), normalized: (value) => Math.max(value / 32767, -1) }],
  [5123, { bytes: 2, get: (view, offset) => view.getUint16(offset, true), normalized: (value) => value / 65535 }],
  [5125, { bytes: 4, get: (view, offset) => view.getUint32(offset, true), normalized: (value) => value / 4294967295 }],
  [5126, { bytes: 4, get: (view, offset) => view.getFloat32(offset, true), normalized: (value) => value }],
]);
const typeWidth = new Map([["SCALAR", 1], ["VEC2", 2], ["VEC3", 3], ["VEC4", 4], ["MAT2", 4], ["MAT3", 9], ["MAT4", 16]]);

function accessorValues(document, binary, accessorIndex) {
  const accessor = document.accessors?.[accessorIndex];
  assert(accessor, `missing glTF accessor ${accessorIndex}`);
  const viewInfo = componentInfo.get(accessor.componentType);
  const columns = typeWidth.get(accessor.type);
  assert(viewInfo && columns, `unsupported accessor format ${accessor.componentType}/${accessor.type}`);
  const values = [];
  if (accessor.bufferView === undefined) {
    assert.equal(accessor.sparse, undefined, "sparse accessors are not expected in character exports");
    return values;
  }
  const bufferView = document.bufferViews?.[accessor.bufferView];
  assert(bufferView, `missing bufferView for accessor ${accessorIndex}`);
  const baseOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = bufferView.byteStride ?? viewInfo.bytes * columns;
  const data = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  for (let item = 0; item < accessor.count; item += 1) {
    const itemOffset = baseOffset + item * stride;
    for (let component = 0; component < columns; component += 1) {
      const raw = viewInfo.get(data, itemOffset + component * viewInfo.bytes);
      values.push(accessor.normalized && accessor.componentType !== 5126 ? viewInfo.normalized(raw) : raw);
    }
  }
  assert.equal(values.length, accessor.count * columns, `accessor ${accessorIndex} count/format mismatch`);
  return values;
}

function skinSignature(parsed) {
  const { document, binary } = parsed;
  const skin = document.skins?.[0];
  assert(skin, "GLB must contain a skin");
  const inverseBindMatrices = accessorValues(document, binary, skin.inverseBindMatrices);
  const positions = [];
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const positionAccessor = primitive.attributes?.POSITION;
      if (positionAccessor !== undefined) positions.push(accessorValues(document, binary, positionAccessor));
    }
  }
  return { jointCount: skin.joints.length, inverseBindMatrices, positions };
}

async function loadGlbWithBabylon(buffer, name, parsed) {
  const engine = new NullEngine({ renderWidth: 1, renderHeight: 1, textureSize: 1 });
  const scene = new Scene(engine);
  let container;
  try {
    container = await LoadAssetContainerAsync(new Uint8Array(buffer), scene, { pluginExtension: ".glb" });
    assert.equal(container.skeletons.length, 1, `${name} Babylon loader must create one skeleton`);
    const skeleton = container.skeletons[0];
    assert.equal(skeleton.bones.length, 19, `${name} Babylon loader must create all 19 bones`);
    const clips = container.animationGroups.map((group) => group.name).sort();
    assert.deepEqual(clips, ["crouch", "death", "hit", "idle", "reload", "shoot", "walk"], `${name} Babylon loader clip names`);
    const meshes = container.meshes.filter((mesh) => mesh.getTotalVertices() > 0);
    assert(meshes.length > 0, `${name} Babylon loader must create vertex meshes`);
    const loadedVertices = meshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0);
    const expectedVertices = (parsed.document.meshes ?? []).flatMap((mesh) => mesh.primitives ?? [])
      .reduce((sum, primitive) => sum + (parsed.document.accessors?.[primitive.attributes?.POSITION]?.count ?? 0), 0);
    assert.equal(loadedVertices, expectedVertices, `${name} Babylon loader vertex count must match GLB accessors`);
    return { skeletons: container.skeletons.length, bones: skeleton.bones.length, clips, meshes: meshes.length, vertices: loadedVertices };
  } finally {
    container?.dispose();
    scene.dispose();
    engine.dispose();
  }
}

function analyzeSourceWinding(spec) {
  const geometry = buildCharacter(spec);
  const result = { triangles: 0, positive: 0, negative: 0, degenerate: 0, minimumDot: Infinity };
  for (const part of geometry.parts) {
    for (let cursor = 0; cursor < part.indices.length; cursor += 3) {
      const ia = part.indices[cursor];
      const ib = part.indices[cursor + 1];
      const ic = part.indices[cursor + 2];
      const point = (index) => part.positions.slice(index * 3, index * 3 + 3);
      const a = point(ia);
      const b = point(ib);
      const c = point(ic);
      const ab = b.map((value, axis) => value - a[axis]);
      const ac = c.map((value, axis) => value - a[axis]);
      const cross = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ];
      const area = Math.hypot(...cross);
      assert(area > 1e-12, `source geometry ${part.id} contains a degenerate triangle`);
      const averageNormal = [0, 1, 2].map((axis) => (part.normals[ia * 3 + axis] + part.normals[ib * 3 + axis] + part.normals[ic * 3 + axis]) / 3);
      const dot = cross.reduce((sum, value, axis) => sum + value * averageNormal[axis], 0);
      assert(dot > 0, `source geometry ${part.id} has inverted/invalid winding: cross·normal=${dot}`);
      result.triangles += 1;
      result.positive += 1;
      result.minimumDot = Math.min(result.minimumDot, dot);
    }
  }
  return result;
}

function collectWarnings(file, messages) {
  for (const issue of messages ?? []) {
    if (issue.severity !== 1) continue;
    const key = `${file}\u0000${issue.code}`;
    const existing = warningCounts.get(key) ?? { file, code: issue.code, count: 0, messages: new Set() };
    existing.count += 1;
    existing.messages.add(issue.message);
    warningCounts.set(key, existing);
  }
}

function validateCharacterGlb(buffer, expectedSpec, name) {
  const parsed = parseGlb(buffer);
  const { document, binary } = parsed;
  const sourceWinding = analyzeSourceWinding(expectedSpec);
  const validation = validator.validateBytes(new Uint8Array(buffer), { uri: name, format: "glb", writeTimestamp: false, maxIssues: 0 });
  return validation.then(async (validationReport) => {
    const issues = validationReport.issues ?? { numErrors: 0, numWarnings: 0, messages: [] };
    assert.equal(issues.numErrors, 0, `${name} has glTF validator errors: ${JSON.stringify(issues.messages)}`);
    collectWarnings(name, issues.messages);

    const skins = document.skins ?? [];
    assert.equal(skins.length, 1, `${name} must have one skin`);
    const skin = skins[0];
    assert.equal(skin.joints.length, 19, `${name} must export all 19 rig joints`);
    const jointNames = skin.joints.map((index) => document.nodes?.[index]?.name);
    assert.deepEqual(jointNames, [
      "Hips", "Spine", "Chest", "Neck", "Head", "LeftShoulder", "LeftUpperArm", "LeftLowerArm", "LeftHand",
      "RightShoulder", "RightUpperArm", "RightLowerArm", "RightHand", "LeftUpperLeg", "LeftLowerLeg", "LeftFoot",
      "RightUpperLeg", "RightLowerLeg", "RightFoot",
    ].map((joint) => `joint_${joint}`), `${name} joint order is not stable`);
    assert(Number.isInteger(skin.inverseBindMatrices), `${name} must contain inverse bind matrices`);
    const matrices = accessorValues(document, binary, skin.inverseBindMatrices);
    assert.equal(matrices.length, 19 * 16, `${name} needs one inverse bind matrix per joint`);

    let triangleCount = 0;
    let positiveWinding = 0;
    const materialIndices = new Set();
    let skinnedVertexCount = 0;
    let blendedVertexCount = 0;
    for (const mesh of document.meshes ?? []) {
      for (const primitive of mesh.primitives ?? []) {
        const mode = primitive.mode ?? 4;
        assert.equal(mode, 4, `${name} must export triangle primitives`);
        const positions = accessorValues(document, binary, primitive.attributes.POSITION);
        const normals = accessorValues(document, binary, primitive.attributes.NORMAL);
        const indices = primitive.indices !== undefined
          ? accessorValues(document, binary, primitive.indices)
          : Array.from({ length: positions.length / 3 }, (_, index) => index);
        assert.equal(indices.length % 3, 0, `${name} index accessor is not a triangle list`);
        triangleCount += indices.length / 3;
        for (let cursor = 0; cursor < indices.length; cursor += 3) {
          const ia = indices[cursor];
          const ib = indices[cursor + 1];
          const ic = indices[cursor + 2];
          for (const index of [ia, ib, ic]) assert(Number.isInteger(index) && index >= 0 && index * 3 + 2 < positions.length, `${name} has an out-of-range vertex index`);
          const point = (index) => positions.slice(index * 3, index * 3 + 3);
          const a = point(ia);
          const b = point(ib);
          const c = point(ic);
          const ab = b.map((value, axis) => value - a[axis]);
          const ac = c.map((value, axis) => value - a[axis]);
          const cross = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0],
          ];
          const area = Math.hypot(...cross);
          assert(area > 1e-12, `${name} contains a degenerate triangle at primitive ${mesh.name ?? "unnamed"}, triangle ${cursor / 3}`);
          const averageNormal = [0, 1, 2].map((axis) => (normals[ia * 3 + axis] + normals[ib * 3 + axis] + normals[ic * 3 + axis]) / 3);
          const dot = cross.reduce((sum, value, axis) => sum + value * averageNormal[axis], 0);
          assert(dot > 0, `${name} has inverted/invalid winding at triangle ${cursor / 3}: cross·normal=${dot}`);
          positiveWinding += 1;
        }
        if (primitive.material !== undefined) materialIndices.add(primitive.material);
        const jointAccessor = primitive.attributes?.JOINTS_0;
        const weightAccessor = primitive.attributes?.WEIGHTS_0;
        assert(Number.isInteger(jointAccessor), `${name} primitive is missing JOINTS_0`);
        assert(Number.isInteger(weightAccessor), `${name} primitive is missing WEIGHTS_0`);
        const joints = accessorValues(document, binary, jointAccessor);
        const weights = accessorValues(document, binary, weightAccessor);
        assert.equal(joints.length, weights.length, `${name} joint/weight counts differ`);
        assert.equal(joints.length % 4, 0, `${name} must provide four skin influences per vertex`);
        for (let i = 0; i < joints.length; i += 4) {
          const sum = weights[i] + weights[i + 1] + weights[i + 2] + weights[i + 3];
          assert(Math.abs(sum - 1) < 1e-4, `${name} skin weights at vertex ${i / 4} sum to ${sum}`);
          if ([0, 1, 2, 3].filter((slot) => weights[i + slot] > 1e-5).length >= 2) blendedVertexCount += 1;
          for (let slot = 0; slot < 4; slot += 1) {
            assert(Number.isInteger(joints[i + slot]) && joints[i + slot] >= 0 && joints[i + slot] < skin.joints.length, `${name} has out-of-range joint index`);
            assert(Number.isFinite(weights[i + slot]) && weights[i + slot] >= 0, `${name} has invalid skin weight`);
          }
        }
        skinnedVertexCount += joints.length / 4;
      }
    }
    assert(triangleCount > 0 && triangleCount <= 5_000, `${name} triangle count ${triangleCount} is outside 1..5000`);
    assert.equal(triangleCount, sourceWinding.triangles, `${name} triangle count differs from the source geometry`);
    assert.equal(positiveWinding, triangleCount, `${name} must preserve the source's outward winding for every triangle`);
    assert(materialIndices.size <= 5, `${name} uses ${materialIndices.size} materials, budget is 5`);
    assert(skinnedVertexCount > 0, `${name} has no skinned vertices`);
    assert(blendedVertexCount > 0, `${name} must contain vertices with multiple active skin influences`);
    const clipNames = (document.animations ?? []).map((animation) => animation.name);
    assert.deepEqual([...clipNames].sort(), ["crouch", "death", "hit", "idle", "reload", "shoot", "walk"].sort(), `${name} must contain the seven named clips`);
    const clipCounts = {};
    for (const animation of document.animations) {
      assert((animation.channels?.length ?? 0) > 0 && (animation.samplers?.length ?? 0) > 0, `${name} animation ${animation.name} must be nonempty`);
      clipCounts[animation.name] = { channels: animation.channels.length, samplers: animation.samplers.length };
    }
    const forbiddenNames = (document.nodes ?? []).map((node) => node.name ?? "").filter((nodeName) => /camera|light|preview|ground|plinth|stage/i.test(nodeName));
    assert.deepEqual(forbiddenNames, [], `${name} contains preview-only camera/light/stage nodes`);
    assert.equal((document.cameras ?? []).length, 0, `${name} must not contain a camera`);
    const embeddedSpecs = [document.asset?.extras, ...(document.nodes ?? []).map((node) => node.extras), ...(document.scenes ?? []).map((scene) => scene.extras)]
      .filter((extras) => extras && typeof extras === "object")
      .map((extras) => extras.spec)
      .filter(Boolean);
    assert(embeddedSpecs.some((spec) => JSON.stringify(spec) === JSON.stringify(expectedSpec)), `${name} must embed the exported character specification in extras.spec`);
    const babylonLoad = await loadGlbWithBabylon(buffer, name, parsed);
    passed(`GLB ${name}`, { triangles: triangleCount, outwardWinding: positiveWinding, sourceWinding, materials: materialIndices.size, joints: skin.joints.length, skinnedVertices: skinnedVertexCount, blendedVertices: blendedVertexCount, clipCounts, babylonLoad, gltfErrors: issues.numErrors, gltfWarnings: issues.numWarnings });
    return { parsed, validationReport, triangleCount, materialCount: materialIndices.size, clipCounts, signature: skinSignature(parsed), skinnedVertexCount, blendedVertexCount, positiveWinding, babylonLoad };
  });
}

async function validateDeliveryGlbs() {
  const names = ["runner", "guard", "tech"];
  const files = names.map((name) => ({ name, path: path.join(projectDir, `assets/generated/characters/neon-${name}.glb`) }));
  const existing = await Promise.all(files.map(async (file) => ({ ...file, exists: await readFile(file.path).then(() => true, () => false) })));
  if (existing.every((file) => !file.exists)) {
    deliveryValidation.reason = "assets/generated/characters/neon-{runner,guard,tech}.glb not present";
    return;
  }
  assert(existing.every((file) => file.exists), "delivery validation requires all three neon-{runner,guard,tech}.glb files");
  const results = [];
  for (const file of files) {
    const bytes = await readFile(file.path);
    const result = await validator.validateBytes(new Uint8Array(bytes), { uri: path.basename(file.path), format: "glb", writeTimestamp: false, maxIssues: 0 });
    const issues = result.issues ?? { numErrors: 0, numWarnings: 0, messages: [] };
    assert.equal(issues.numErrors, 0, `${file.name} delivery GLB has Khronos errors: ${JSON.stringify(issues.messages)}`);
    results.push({ name: file.name, file: path.relative(projectDir, file.path), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), errors: issues.numErrors, warnings: issues.numWarnings, warningSummary: (issues.messages ?? []).filter((issue) => issue.severity === 1).reduce((counts, issue) => { counts[issue.code] = (counts[issue.code] ?? 0) + 1; return counts; }, {}) });
  }
  deliveryValidation.status = "passed";
  deliveryValidation.files = results;
  delete deliveryValidation.reason;
}

function specFromJsonDownload(buffer) {
  return JSON.parse(buffer.toString("utf8"));
}

async function waitFrames(page, count = 3) {
  await page.evaluate((frames) => new Promise((resolve) => {
    const next = () => frames <= 0 ? resolve() : requestAnimationFrame(() => { frames -= 1; next(); });
    next();
  }), count);
}

async function ensureCanvas(page) {
  const canvas = page.locator(".cw-preview-host canvas");
  await canvas.waitFor({ state: "visible" });
  const state = await canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const gl = element.getContext("webgl2") || element.getContext("webgl");
    return { width: bounds.width, height: bounds.height, drawingWidth: element.width, drawingHeight: element.height, hasContext: Boolean(gl), glVersion: gl?.getParameter(gl.VERSION) ?? null };
  });
  assert(state.width > 100 && state.height > 100, "3D canvas must occupy a visible preview area");
  assert(state.drawingWidth > 100 && state.drawingHeight > 100 && state.hasContext, "3D canvas must have a live WebGL drawing context");
  return state;
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert(overflow.document <= overflow.viewport && overflow.body <= overflow.viewport, `${label} horizontal overflow: ${JSON.stringify(overflow)}`);
  passed(`no horizontal overflow at ${label}`, overflow);
}

async function clickPreset(page, name) {
  const patterns = {
    runner: /Runner\s+Leicht/,
    guard: /Wache\s+Robust/,
    tech: /Techniker\s+Werkzeug/,
  };
  await page.getByRole("button", { name: patterns[name] }).click();
  await waitFrames(page, 3);
  const expected = {
    runner: { body: "lean", outfit: "runner", accessory: "visor" },
    guard: { body: "heavy", outfit: "guard", accessory: "goggles" },
    tech: { body: "standard", outfit: "tech", accessory: "headset" },
  }[name];
  assert.equal(await page.getByLabel("Körperform", { exact: true }).inputValue(), expected.body, `${name} preset body`);
  assert.equal(await page.getByLabel("Outfit", { exact: true }).inputValue(), expected.outfit, `${name} preset outfit`);
  assert.equal(await page.getByLabel("Zubehör", { exact: true }).inputValue(), expected.accessory, `${name} preset accessory`);
}

async function downloadBlob(page, buttonName, destination) {
  const event = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: buttonName }).click();
  const download = await event;
  await download.saveAs(destination);
  return readFile(destination);
}

async function importJson(page, name, contents) {
  await page.locator('input[aria-label="JSON-Spezifikation importieren"]').setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.isBuffer(contents) ? contents : Buffer.from(contents),
  });
}

async function assertJsonUnchanged(page, expected, label) {
  const jsonPath = path.join(outputDir, `verify-${label}.json`);
  const data = await downloadBlob(page, "JSON herunterladen", jsonPath);
  assert.deepEqual(specFromJsonDownload(data), expected, `${label} changed the last valid character specification`);
  return data;
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (previewExited) throw new Error(`Character preview could not start: ${previewLog}`);
    try {
      const response = await fetch(url);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert(ready, `Character preview was not reachable: ${previewLog}`);

  let launchError;
  let launchedChannel;
  for (const channel of ["chrome", "msedge"]) {
    try { browser = await chromium.launch({ channel, headless: true }); launchedChannel = channel; break; }
    catch (error) { launchError = error; }
  }
  if (!browser) throw launchError;
  report.browser = { version: browser.version(), channel: launchedChannel };
  report.versions = {
    node: process.version,
    client: JSON.parse(await readFile(path.join(clientDir, "package.json"), "utf8")).version,
    characters: JSON.parse(await readFile(path.join(projectDir, "packages/characters/package.json"), "utf8")).version,
    babylon: JSON.parse(await readFile(path.join(clientDir, "package.json"), "utf8")).dependencies["@babylonjs/core"],
    gltfValidator: validator.version(),
  };

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const pageErrors = report.pageErrors;
  page.on("pageerror", (error) => pageErrors.push({ type: "pageerror", message: error.message }));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push({ type: "console", message: message.text() }); });
  page.on("requestfailed", (request) => pageErrors.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Figuren-Werkstatt" }).waitFor();
  const canvas1366 = await ensureCanvas(page);
  await assertNoHorizontalOverflow(page, "1366x768");
  await page.screenshot({ path: path.join(outputDir, "workshop-1366.png"), fullPage: true });
  report.screenshots.push("workshop-1366.png");
  passed("3D canvas mounted at 1366x768", canvas1366);

  // Exercise every control family and all options, then return to a known state.
  const body = page.getByLabel("Körperform", { exact: true });
  for (const value of ["lean", "standard", "heavy"]) await body.selectOption(value);
  await page.getByLabel("Größe", { exact: true }).evaluate((element) => {
    element.value = "1.10";
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  for (const value of ["none", "crop", "mohawk", "bob"]) await page.getByLabel("Frisur", { exact: true }).selectOption(value);
  for (const value of ["runner", "guard", "tech"]) await page.getByLabel("Outfit", { exact: true }).selectOption(value);
  for (const value of ["none", "visor", "goggles", "headset"]) await page.getByLabel("Zubehör", { exact: true }).selectOption(value);
  for (const label of ["Farbe Haut", "Farbe Haare", "Farbe Stoff", "Farbe Panzerung", "Farbe Akzent"]) {
    assert.equal(await page.getByLabel(label).count(), 1, `missing ${label} control`);
  }
  await page.getByLabel("Farbe Haut", { exact: true }).evaluate((element) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(element, "#c78152");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Seed-Variante" }).click();
  await page.getByLabel("Figuren-ID", { exact: true }).fill("pilot-runner");
  await page.getByLabel("Seed", { exact: true }).fill("42");
  await page.getByLabel("Bewegungsclip", { exact: true }).selectOption("idle");
  for (const viewName of ["Front", "Iso", "Rückseite", "Seite"]) {
    const cameraButton = page.getByRole("button", { name: viewName, exact: true });
    await cameraButton.click();
    assert.equal(await cameraButton.getAttribute("aria-pressed"), "true");
  }
  await page.getByRole("button", { name: "Animation pausieren" }).click();
  await page.getByRole("button", { name: "Animation abspielen" }).click();
  passed("presets and all editor controls", { bodyOptions: 3, hairOptions: 4, outfitOptions: 3, accessoryOptions: 4, colorRoles: 5, cameraViews: 4, playback: true });

  const clipSelect = page.getByLabel("Bewegungsclip", { exact: true });
  assert.equal(await clipSelect.locator("option").count(), 7);
  const selectedClips = [];
  for (const clip of ["idle", "walk", "crouch", "shoot", "reload", "hit", "death"]) {
    await clipSelect.selectOption(clip);
    selectedClips.push(await clipSelect.inputValue());
  }
  assert.deepEqual(selectedClips, ["idle", "walk", "crouch", "shoot", "reload", "hit", "death"]);
  passed("all seven preview clips can be selected", selectedClips);
  await clipSelect.selectOption("idle");

  await clickPreset(page, "runner");
  await page.getByRole("button", { name: "Front", exact: true }).click();
  await waitFrames(page);
  await ensureCanvas(page);
  await page.screenshot({ path: path.join(outputDir, "runner-front.png"), fullPage: true });
  report.screenshots.push("runner-front.png");
  await clickPreset(page, "guard");
  await page.getByRole("button", { name: "Iso", exact: true }).click();
  await waitFrames(page);
  await page.screenshot({ path: path.join(outputDir, "guard-iso.png"), fullPage: true });
  report.screenshots.push("guard-iso.png");
  await clickPreset(page, "tech");
  await page.getByRole("button", { name: "Iso", exact: true }).click();
  await waitFrames(page);
  await page.screenshot({ path: path.join(outputDir, "tech-iso.png"), fullPage: true });
  report.screenshots.push("tech-iso.png");

  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitFrames(page);
  const canvas1920 = await ensureCanvas(page);
  await assertNoHorizontalOverflow(page, "1920x1080");
  await page.screenshot({ path: path.join(outputDir, "workshop-1920.png"), fullPage: true });
  report.screenshots.push("workshop-1920.png");
  passed("3D canvas mounted at 1920x1080", canvas1920);

  // Two isolated contexts must keep their own editor state.
  const secondContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const secondPage = await secondContext.newPage();
  secondPage.setDefaultTimeout(30_000);
  const secondErrors = [];
  secondPage.on("pageerror", (error) => secondErrors.push(error.message));
  await secondPage.goto(url, { waitUntil: "networkidle" });
  await secondPage.getByRole("heading", { name: "Figuren-Werkstatt" }).waitFor();
  const secondInitial = await secondPage.getByLabel("Outfit", { exact: true }).inputValue();
  await clickPreset(page, "runner");
  assert.equal(await page.getByLabel("Outfit", { exact: true }).inputValue(), "runner");
  assert.equal(await secondPage.getByLabel("Outfit", { exact: true }).inputValue(), secondInitial);
  await ensureCanvas(secondPage);
  passed("two browser contexts maintain independent editor state", { changedContext: "runner", untouchedContext: secondInitial });

  // JSON export/import roundtrip plus rejection cases that must preserve the last valid spec.
  await clickPreset(page, "runner");
  const validJsonPath = path.join(outputDir, "roundtrip.json");
  const validJsonBuffer = await downloadBlob(page, "JSON herunterladen", validJsonPath);
  const lastValidSpec = specFromJsonDownload(validJsonBuffer);
  await importJson(page, "roundtrip.json", validJsonBuffer);
  await page.getByRole("status").filter({ hasText: "geladen" }).waitFor();
  await assertJsonUnchanged(page, lastValidSpec, "roundtrip");
  passed("JSON download/import roundtrip preserves canonical spec");

  const invalidInputs = [
    ["unknown-field.json", JSON.stringify({ ...lastValidSpec, unknown: true })],
    ["wrong-type.json", JSON.stringify({ ...lastValidSpec, seed: "42" })],
    ["oversize.json", " ".repeat(32 * 1024 + 1)],
    ["invalid-id.json", JSON.stringify({ ...lastValidSpec, id: "Bad ID" })],
    ["invalid-seed.json", JSON.stringify({ ...lastValidSpec, seed: -1 })],
  ];
  for (const [filename, contents] of invalidInputs) {
    await importJson(page, filename, contents);
    await page.getByRole("alert", { name: "Importfehler" }).waitFor();
    await assertJsonUnchanged(page, lastValidSpec, filename.replace(/[^a-z0-9-]/gi, "-"));
  }
  passed("invalid JSON imports preserve last valid spec", invalidInputs.map(([filename]) => filename));

  // Invalid editable identity fields also retain the last accepted JSON state.
  await page.getByLabel("Figuren-ID", { exact: true }).fill("BAD ID");
  await page.getByRole("alert", { name: "Ungültige Eingabe" }).waitFor();
  await assertJsonUnchanged(page, lastValidSpec, "invalid-id-control");
  await page.getByLabel("Figuren-ID", { exact: true }).fill(lastValidSpec.id);
  await page.getByLabel("Seed", { exact: true }).fill("4294967296");
  await page.getByRole("alert", { name: "Ungültige Eingabe" }).waitFor();
  await assertJsonUnchanged(page, lastValidSpec, "invalid-seed-control");
  await page.getByLabel("Seed", { exact: true }).fill(String(lastValidSpec.seed));
  passed("invalid ID and seed controls preserve last valid spec");

  // Export from known presets and validate the actual downloaded GLB bytes.
  const exportResults = {};
  const expectedSpecs = {};
  for (const preset of ["runner", "guard", "tech"]) {
    await clickPreset(page, preset);
    await page.getByLabel("Bewegungsclip", { exact: true }).selectOption("idle");
    const expected = specFromJsonDownload(await downloadBlob(page, "JSON herunterladen", path.join(outputDir, `spec-${preset}.json`)));
    expectedSpecs[preset] = expected;
    const glb = await downloadBlob(page, "GLB exportieren", path.join(outputDir, `${preset}.glb`));
    exportResults[preset] = await validateCharacterGlb(glb, expected, `${preset}.glb`);
    report.exports[preset] = {
      file: `${preset}.glb`,
      sha256: createHash("sha256").update(glb).digest("hex"),
      bytes: glb.length,
      triangles: exportResults[preset].triangleCount,
      materials: exportResults[preset].materialCount,
      joints: exportResults[preset].signature.jointCount,
      skinnedVertices: exportResults[preset].skinnedVertexCount,
      blendedVertices: exportResults[preset].blendedVertexCount,
      clips: exportResults[preset].clipCounts,
      validator: {
        errors: exportResults[preset].validationReport.issues?.numErrors ?? 0,
        warnings: exportResults[preset].validationReport.issues?.numWarnings ?? 0,
      },
    };
  }
  passed("runner, guard, and tech GLBs downloaded and validated", Object.keys(exportResults));

  // Export twice while walking and while paused; rest/bind data must remain stable.
  await clickPreset(page, "runner");
  await page.getByLabel("Bewegungsclip", { exact: true }).selectOption("walk");
  assert.equal(await page.getByRole("button", { name: "Animation pausieren" }).count(), 1, "walk should be playing before export");
  await new Promise((resolve) => setTimeout(resolve, 550));
  const playingGlb = await downloadBlob(page, "GLB exportieren", path.join(outputDir, "walk-playing.glb"));
  const playingResult = await validateCharacterGlb(playingGlb, expectedSpecs.runner, "walk-playing.glb");
  await page.getByRole("button", { name: "Animation pausieren" }).click();
  assert.equal(await page.getByRole("button", { name: "Animation abspielen" }).count(), 1, "walk should be paused before second export");
  const stoppedGlb = await downloadBlob(page, "GLB exportieren", path.join(outputDir, "walk-stopped.glb"));
  const stoppedResult = await validateCharacterGlb(stoppedGlb, expectedSpecs.runner, "walk-stopped.glb");
  assert.deepEqual(playingResult.signature, exportResults.runner.signature, "playing walk export changed source positions or inverse bind matrices");
  assert.deepEqual(stoppedResult.signature, exportResults.runner.signature, "stopped walk export changed source positions or inverse bind matrices");
  report.exports.walkPlaying = { file: "walk-playing.glb", sha256: createHash("sha256").update(playingGlb).digest("hex"), bytes: playingGlb.length };
  report.exports.walkStopped = { file: "walk-stopped.glb", sha256: createHash("sha256").update(stoppedGlb).digest("hex"), bytes: stoppedGlb.length };
  passed("walk-playing and walk-stopped exports retain identical bind matrices and source positions");

  await page.setViewportSize({ width: 1366, height: 768 });
  await assertNoHorizontalOverflow(page, "final 1366x768");
  assert.deepEqual(pageErrors, [], `browser errors detected: ${JSON.stringify(pageErrors)}`);
  assert.deepEqual(secondErrors, [], `second browser context errors detected: ${JSON.stringify(secondErrors)}`);
  passed("no browser runtime, console, request, or second-context errors");
  await secondContext.close();
  await context.close();
  await validateDeliveryGlbs();
  report.deliveryValidation = deliveryValidation;
  report.passed = true;
}

try {
  await main();
} catch (error) {
  report.failure = { name: error?.name ?? "Error", message: error?.message ?? String(error), stack: error?.stack };
  throw error;
} finally {
  await browser?.close();
  if (preview.exitCode === null && preview.signalCode === null) {
    preview.kill();
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 2_000);
      preview.once("exit", () => { clearTimeout(timer); resolve(); });
    });
  }
  await mkdir(outputDir, { recursive: true });
  report.warnings = [...warningCounts.values()].map(({ messages, ...warning }) => ({ ...warning, messages: [...messages] }));
  await writeFile(path.join(outputDir, "check.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outputDir, "delivery-validation.json"), `${JSON.stringify(deliveryValidation, null, 2)}\n`);
  if (report.passed) console.log(JSON.stringify(report, null, 2));
  else console.error(`Character browser/export check failed. Details: ${path.join(outputDir, "check.json")}`);
}
