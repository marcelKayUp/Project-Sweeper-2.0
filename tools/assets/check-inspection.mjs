import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdtemp, mkdir, readFile, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, "artifacts/asset-inspection");
const blender = process.env.BLENDER_PATH ?? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
const sha = async file => createHash("sha256").update(await readFile(file)).digest("hex");
async function run(command, args) {
  const process_ = spawn(command, args, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; process_.stdout.on("data", data => { log += data; }); process_.stderr.on("data", data => { log += data; });
  const code = await new Promise((resolve, reject) => { process_.on("error", reject); process_.on("close", resolve); });
  assert.equal(code, 0, log.slice(-6000));
}

try {
  const report = JSON.parse(await readFile(path.join(output, "report.json"), "utf8"));
  assert(report.summary.sourceUnchanged && report.summary.errors === 0 && report.summary.renderErrors === 0);
  assert.equal(report.summary.files, report.assets.length);
  assert.equal(report.summary.thumbnails, report.assets.flatMap(a => a.thumbnails).length);
  for (const asset of report.assets) {
    assert.equal(await sha(path.join(report.sourceRoot, asset.path)), asset.fileSha256, "source file changed");
    assert(asset.meshes.every(m => m.finite && m.triangles > 0));
    for (const action of asset.actions) {
      assert(action.movingCurves > 0, `Empty/constant clip: ${action.name}`);
      if (asset.rigs.length) assert(action.temporalVertexMotion > 0.000001, `No sampled motion: ${action.name}`);
    }
    for (const thumbnail of asset.thumbnails) assert((await stat(path.join(output, thumbnail.file))).size > 0);
  }
  const contactCheck = JSON.parse(await readFile(path.join(output, "contact-check.json"), "utf8"));
  assert(contactCheck.passed && contactCheck.images === report.summary.thumbnails);
  const fixtures = await mkdtemp(path.join(output, "cache-test-"));
  const input = path.join(fixtures, "input"), result = path.join(fixtures, "output");
  await mkdir(input); await mkdir(result);
  const weapon = report.assets.find(a => a.category === "weapons");
  const secondWeapon = report.assets.find(a => a.category === "weapons" && a.fileSha256 !== weapon.fileSha256);
  const target = path.join(input, "weapon.blend");
  const image = path.join(input, "dependency.png");
  await copyFile(path.join(report.sourceRoot, weapon.path), target);
  const allThumbs = report.assets.flatMap(a => a.thumbnails);
  await copyFile(path.join(output, allThumbs[0].file), image);
  // Only edit the owned fixture copy: an unused but saved external image still
  // has to invalidate cached diagnostics when its bytes change.
  const expression = `import bpy; bpy.ops.wm.open_mainfile(filepath=${JSON.stringify(target.replaceAll("\\", "/"))},use_scripts=False); image=bpy.data.images.load(${JSON.stringify(image.replaceAll("\\", "/"))}); image.use_fake_user=True; bpy.ops.wm.save_as_mainfile(filepath=${JSON.stringify(target.replaceAll("\\", "/"))})`;
  await run(blender, ["--background", "--factory-startup", "--disable-autoexec", "--python-exit-code", "1", "--python-expr", expression]);
  const unchanged = await sha(target);
  const results = [];
  async function inspect(label) {
    await run(process.execPath, ["tools/assets/inspect-assets.mjs", "--source", input, "--out", result, "--no-thumbnails"]);
    const summary = JSON.parse(await readFile(path.join(result, "summary.json"), "utf8"));
    results.push({ label, cacheHits: summary.cacheHits, inspected: summary.inspected });
    return summary;
  }
  const cold = await inspect("cold"); assert.equal(cold.inspected, 2);
  const warm = await inspect("unchanged"); assert.equal(warm.inspected, 0); assert.equal(warm.cacheHits, 2);
  const oldImage = await sha(image);
  await copyFile(path.join(output, allThumbs[1].file), image);
  assert.notEqual(await sha(image), oldImage);
  assert.equal(await sha(target), unchanged);
  const dependency = await inspect("external-image-changed"); assert.equal(dependency.inspected, 1); assert.equal(dependency.cacheHits, 1);
  const previousStat = await stat(target);
  await copyFile(path.join(report.sourceRoot, secondWeapon.path), target);
  await utimes(target, previousStat.atime, previousStat.mtime);
  const changed = await inspect("blend-bytes-changed-with-same-mtime"); assert.equal(changed.inspected, 1); assert.equal(changed.cacheHits, 1);
  assert.notEqual(await sha(target), unchanged);
  const final = { passed: true, actualAssets: report.assets.length, actualThumbnails: report.summary.thumbnails, actualSourcesUnchanged: true, cacheRuns: results, fixtures: path.relative(root, fixtures) };
  await writeFile(path.join(output, "verification.json"), JSON.stringify(final, null, 2) + "\n");
  console.log(JSON.stringify(final));
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1;
}
