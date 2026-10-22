import "@babylonjs/loaders/glTF/index.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import "./style.css";

interface Asset {
  id: string; label: string; file: string; sha256: string; bytes: number;
  stats: { triangles: number; vertices: number; materials: number; dimensions: number[] };
  spec: { form: string; size: string; organization: string; seed: number; palette: { label: string }; [key: string]: unknown };
}
const root = document.getElementById("root");
if (!root) throw new Error("Terminal root fehlt");
root.innerHTML = `<main><header><div class="brand">NC <span>NEON CONTRACT</span></div><a href="/characters.html">Figuren-Werkstatt ↗</a></header><section class="heading"><p class="eyebrow">LOKALE ASSETPRODUKTION · PILOT 01</p><h1>Eine Familie. Drei Bauformen.</h1><p>Standterminal, Pult und Wandterminal aus demselben parametrischen Rezept.</p></section><div class="layout"><aside><h2>Variante auswählen</h2><label>Bauform<select id="form" aria-label="Bauform"><option value="pedestal">Standterminal</option><option value="console">Pult</option><option value="wall">Wandterminal</option></select></label><label>Größe<select id="size" aria-label="Größe"><option value="standard">Standard</option><option value="compact">Kompakt</option></select></label><label>Organisation<select id="organization" aria-label="Organisation"><option value="falkenfeld-kessler">Falkenfeld-Kessler</option><option value="daeyang">Daeyang</option><option value="nakamura-lindahl">Nakamura-Lindahl</option></select></label><div class="actions"><a id="download" aria-disabled="true">GLB herunterladen ↗</a><button id="recipe" disabled>Rezept herunterladen</button></div><p class="note">1 Einheit = 1 Meter. Alle Varianten haben denselben Ursprung an der Unterkante. Organisationsfarben sind kosmetisch.</p><p class="note">Stand- und Pultgeräte stehen auf dem Boden. Das Wandgerät benötigt bei der Platzierung eine Wandhalterung.</p></aside><section class="preview"><div class="stage-top"><span id="asset-title">Bibliothek laden …</span><span>ECHTES GLB</span></div><div class="canvas-host"><canvas aria-label="Dreidimensionale Terminalvorschau"></canvas><div id="error" role="alert" hidden></div></div><div class="views"><button data-view="iso" aria-pressed="true">Schräg</button><button data-view="front" aria-pressed="false">Front</button><button data-view="back" aria-pressed="false">Rücken</button><span>Ziehen zum Drehen · Mausrad zum Zoomen</span></div><dl id="stats"></dl></section></div><footer><span>PYTHON + NUMPY + BLENDER</span><span>18 Varianten · Originalgeometrie und Displaygrafik · keine externen Modelle</span></footer></main>`;
const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
const form = root.querySelector<HTMLSelectElement>("#form")!;
const size = root.querySelector<HTMLSelectElement>("#size")!;
const organization = root.querySelector<HTMLSelectElement>("#organization")!;
const errorBox = root.querySelector<HTMLDivElement>("#error")!;
const title = root.querySelector<HTMLSpanElement>("#asset-title")!;
const stats = root.querySelector<HTMLDListElement>("#stats")!;
const download = root.querySelector<HTMLAnchorElement>("#download")!;
const recipe = root.querySelector<HTMLButtonElement>("#recipe")!;
const base = "/assets/props/terminals/";
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true }, false);
const scene = new Scene(engine);
scene.useRightHandedSystem = true;
scene.clearColor = new Color4(.12, .15, .18, 1);
const camera = new ArcRotateCamera("terminal-camera", Math.PI / 3, 1.12, 2.8, new Vector3(0, .5, 0), scene);
camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
camera.minZ = .01; camera.lowerRadiusLimit = 1; camera.upperRadiusLimit = 5; camera.panningSensibility = 0;
camera.attachControl(canvas, true);
const light = new HemisphericLight("fill", new Vector3(0, 1, .3), scene); light.intensity = .95;
light.groundColor = new Color3(.25, .28, .32);
const key = new DirectionalLight("key", new Vector3(-.4, -.8, -.5), scene); key.intensity = 1.6;
let assets: Asset[] = [], active: Asset | undefined, container: AssetContainer | undefined, token = 0;
function resize(): void {
  engine.resize();
  const half = .76 * camera.radius / 2.8;
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  camera.orthoTop = half; camera.orthoBottom = -half; camera.orthoLeft = -half * aspect; camera.orthoRight = half * aspect;
}
new ResizeObserver(resize).observe(canvas.parentElement!);
camera.onViewMatrixChangedObservable.add(resize);
engine.runRenderLoop(() => scene.render());
function clearDownload(): void { download.removeAttribute("href"); download.setAttribute("aria-disabled", "true"); recipe.disabled = true; }
async function load(): Promise<void> {
  const current = ++token;
  clearDownload(); errorBox.hidden = true;
  const asset = assets.find(a => a.spec.form === form.value && a.spec.size === size.value && a.spec.organization === organization.value);
  if (!asset) { errorBox.textContent = "Diese Kombination wurde nicht gebaut."; errorBox.hidden = false; return; }
  title.textContent = "GLB laden …";
  try {
    const response = await fetch(base + asset.file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(v => v.toString(16).padStart(2, "0")).join("");
    if (digest !== asset.sha256) throw new Error("Dateihash passt nicht zum Katalog.");
    const loaded = await LoadAssetContainerAsync(new Uint8Array(bytes), scene, { pluginExtension: ".glb" });
    if (current !== token) { loaded.dispose(); return; }
    container?.dispose(); container = loaded; loaded.addAllToScene(); active = asset;
    await scene.whenReadyAsync();
    if (current !== token || container !== loaded) return;
    // Keep a fixed meter scale while switching variants so size differences remain visible.
    camera.target = new Vector3(0, .5, 0);
    title.textContent = asset.label;
    stats.replaceChildren();
    const dimensions = asset.stats.dimensions;
    for (const [label, value] of [["Dreiecke", asset.stats.triangles.toLocaleString("de-DE")], ["Materialien", String(asset.stats.materials)], ["GLB", `${(asset.bytes / 1024).toFixed(1)} KiB`], ["B × T × H", `${dimensions.map(n => n.toFixed(2)).join(" × ")} m`]]) {
      const item = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = label!; dd.textContent = value!; item.append(dt, dd); stats.append(item);
    }
    download.href = base + asset.file; download.download = asset.file; download.setAttribute("aria-disabled", "false"); recipe.disabled = false;
    canvas.dataset.assetId = asset.id; resize();
  } catch (error) {
    if (current !== token) return;
    title.textContent = "Vorschau nicht verfügbar";
    errorBox.textContent = `${error instanceof Error ? error.message : String(error)} · Auswahl ändern, um erneut zu laden.`;
    errorBox.hidden = false;
  }
}
for (const select of [form, size, organization]) select.addEventListener("change", () => { void load(); });
for (const button of root.querySelectorAll<HTMLButtonElement>("[data-view]")) button.addEventListener("click", () => {
  const view = button.dataset.view;
  camera.alpha = view === "front" ? Math.PI / 2 : view === "back" ? -Math.PI / 2 : Math.PI / 3;
  camera.beta = view === "iso" ? 1.12 : Math.PI / 2;
  for (const other of root.querySelectorAll("[data-view]")) other.setAttribute("aria-pressed", String(other === button));
});
recipe.addEventListener("click", () => {
  if (!active) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(active.spec, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = active.id + ".json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
try {
  const response = await fetch(base + "catalog.json");
  if (!response.ok) throw new Error("Zuerst corepack pnpm generate:terminals ausführen.");
  const catalog: unknown = await response.json();
  if (!catalog || typeof catalog !== "object" || !("schemaVersion" in catalog) || catalog.schemaVersion !== 1 || !("assets" in catalog) || !Array.isArray(catalog.assets) || !catalog.assets.length || catalog.assets.length > 48) throw new Error("Ungültiger Terminalkatalog.");
  assets = catalog.assets as Asset[];
  if (assets.some(a => !a || typeof a.label !== "string" || a.label.length > 200 || !/^terminal-[a-z0-9-]+\.glb$/.test(a.file) || !/^[a-f0-9]{64}$/.test(a.sha256) || !Number.isInteger(a.bytes) || a.bytes < 20 || !a.spec || !["pedestal", "console", "wall"].includes(a.spec.form) || !["compact", "standard"].includes(a.spec.size) || !a.spec.palette || typeof a.spec.palette.label !== "string" || !a.stats || ![a.stats.triangles, a.stats.vertices, a.stats.materials].every(n => Number.isInteger(n) && n > 0) || !Array.isArray(a.stats.dimensions) || a.stats.dimensions.length !== 3 || !a.stats.dimensions.every(n => Number.isFinite(n) && n > 0))) throw new Error("Ungültiger Terminaleintrag.");
  for (const [select, key, labels] of [[form, "form", { pedestal: "Standterminal", console: "Pult", wall: "Wandterminal" }], [size, "size", { compact: "Kompakt", standard: "Standard" }], [organization, "organization", {}]] as const) {
    const wanted = select.value;
    select.replaceChildren();
    for (const value of [...new Set(assets.map(a => a.spec[key]))]) {
      const option = document.createElement("option"); option.value = value;
      option.textContent = key === "organization" ? assets.find(a => a.spec.organization === value)!.spec.palette.label : (labels as Record<string, string>)[value]!;
      select.append(option);
    }
    if ([...select.options].some(o => o.value === wanted)) select.value = wanted;
  }
  await load();
} catch (error) { errorBox.textContent = error instanceof Error ? error.message : String(error); errorBox.hidden = false; }
