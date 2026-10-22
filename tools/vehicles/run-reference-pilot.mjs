import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const options = {
  python: process.env.ASSET_PYTHON_PATH,
  blender: process.env.BLENDER_PATH ?? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe",
};
const artifacts = path.join(root, "artifacts/reference-truck");
async function run(command, args, logName) {
  const log = createWriteStream(path.join(artifacts, logName));
  const process = spawn(command, args, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  process.stdout.pipe(log, { end: false }); process.stderr.pipe(log, { end: false });
  const code = await new Promise((resolve, reject) => { process.on("error", reject); process.on("close", resolve); });
  await new Promise(resolve => log.end(resolve));
  if (code !== 0) throw new Error(`${logName}: exit ${code}. See artifacts/reference-truck/${logName}`);
}
try {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--legacy") options.legacy = true;
    else if (["--python", "--blender"].includes(args[i]) && args[i + 1]) options[args[i++].slice(2)] = args[i];
    else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  if (!options.python) {
    const projectPython = path.join(root, ".venv-assets", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const bundled = path.join(process.env.USERPROFILE ?? "", ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe");
    try { await access(projectPython); options.python = projectPython; } catch { try { await access(bundled); options.python = bundled; } catch { options.python = "python"; } }
  }
  await mkdir(artifacts, { recursive: true });
  const refinementArgs = [];
  if (!options.legacy) {
    await run(options.python, ["-X", "utf8", "tools/reference-analysis/analyze.py"], "surface-analysis.log");
    refinementArgs.push("--refinement", "artifacts/reference-analysis/truck/geometry-patches.json");
  }
  await run(options.python, ["-X", "utf8", "tools/vehicles/analyze_reference.py", ...refinementArgs], "analysis.log");
  console.log("Reference contours and conditional camera fit computed.");
  await run(options.blender, ["--background", "--factory-startup", "--disable-autoexec", "--threads", "4", "--python-exit-code", "1", "--python", "tools/vehicles/build_reference_vehicle.py"], "build.log");
  console.log("GLB, editable Blender source and three views written.");
  await run(options.python, ["-X", "utf8", "tools/vehicles/analyze_reference.py", "--compose"], "comparison.log");
  const require = createRequire(path.join(root, "apps/client/package.json"));
  const validator = require("gltf-validator");
  const bytes = new Uint8Array(await readFile(path.join(root, "assets/generated/vehicles/reference-truck/reference-truck.glb")));
  const buffer = Buffer.from(bytes);
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString("utf8"));
  const meshUsers = new Map();
  for (const node of gltf.nodes) if (node.mesh !== undefined) meshUsers.set(node.mesh, (meshUsers.get(node.mesh) ?? 0) + 1);
  const sharedMeshUsers = [...meshUsers.values()].filter(count => count > 1).sort((a, b) => a - b);
  if (sharedMeshUsers.length !== 3 || sharedMeshUsers.some(count => count !== 6)) throw new Error("Expected three wheel component meshes shared by all six wheels.");
  if (gltf.materials.length !== 5 || (gltf.images?.length ?? 0) !== 0) throw new Error("Unexpected material/image delivery.");
  const report = await validator.validateBytes(bytes, { uri: "reference-truck.glb" });
  await writeFile(path.join(artifacts, "gltf-validation.json"), JSON.stringify(report, null, 2) + "\n");
  if (report.issues.numErrors) throw new Error(`GLB validation: ${report.issues.numErrors} errors`);
  const analysis = JSON.parse(await readFile(path.join(artifacts, "analysis.json"), "utf8"));
  const silhouette = JSON.parse(await readFile(path.join(artifacts, "silhouette-check.json"), "utf8"));
  function positionsDigest(bytes) {
    const jsonLength = bytes.readUInt32LE(12), doc = JSON.parse(bytes.subarray(20,20+jsonLength).toString("utf8"));
    const binStart = 20+jsonLength+8, hash = createHash("sha256");
    for (const mesh of doc.meshes) for (const primitive of mesh.primitives) {
      const accessor = doc.accessors[primitive.attributes.POSITION], view = doc.bufferViews[accessor.bufferView];
      if (accessor.componentType !== 5126 || accessor.type !== "VEC3") throw new Error("Unsupported position format");
      const start = binStart+(view.byteOffset??0)+(accessor.byteOffset??0), stride = view.byteStride??12;
      for (let i=0;i<accessor.count;i++) hash.update(bytes.subarray(start+i*stride,start+i*stride+12));
    }
    return hash.digest("hex");
  }
  let meshPositionsChangedFromBaseline = null;
  try { meshPositionsChangedFromBaseline = positionsDigest(await readFile(path.join(artifacts,"baseline/reference-truck.glb"))) !== positionsDigest(buffer); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const appliedProfiles = analysis.surfaceRefinement?.appliedProfiles ?? {};
  if (!options.legacy && (!Object.values(appliedProfiles).some(x=>x.movedVertices>0) || meshPositionsChangedFromBaseline === false)) throw new Error("Surface measurement did not alter actual mesh positions.");
  const checks = { ok: true, gltfErrors: report.issues.numErrors, gltfWarnings: report.issues.numWarnings, sharedMeshUsers, meshDefinitions: gltf.meshes.length, appliedProfiles, meshPositionsChangedFromBaseline, landmarkRmsPixels: analysis.fit.rmsPixels, focalLengthAtSearchBoundary: analysis.fit.atFocalSearchBoundary, silhouetteIoU: silhouette.iou, comparison: "artifacts/reference-truck/comparison.png", asset: "assets/generated/vehicles/reference-truck/reference-truck.glb" };
  await writeFile(path.join(artifacts, "checks.json"), JSON.stringify(checks, null, 2) + "\n");
  console.log(JSON.stringify(checks, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
