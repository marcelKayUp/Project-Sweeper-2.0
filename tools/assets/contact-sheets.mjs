import assert from "node:assert/strict";
import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "../../apps/client/node_modules/playwright/index.mjs";

const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const titles = { characters: "Modulare Figuren", weapons: "Komplette Waffen · Zuordnung nach Dateiname", components: "Waffenteile · Zuordnung nach Dateiname" };

export async function buildContactSheets(output, report) {
  const thumbs = report.assets.flatMap(asset => (asset.thumbnails ?? []).map(image => ({ ...image, path: asset.path, flags: asset.flags })));
  const sections = Object.entries(titles).filter(([category]) => thumbs.some(t => t.category === category)).map(([category, title]) => `<section id="${category}"><h2>${title}</h2><p>Neutrale Darstellung, einheitliche Bildgröße; individuelle Größenanpassung pro Motiv. Dreiecke nach Modifiern.</p><div class="grid">${thumbs.filter(t => t.category === category).map(t => `<figure data-search="${escape(t.label.toLowerCase())}"><img src="${escape(t.file)}" width="240" height="200" loading="eager" alt="${escape(t.label)}"><figcaption><strong>${escape(t.label)}</strong><span>${t.triangles.toLocaleString("de-DE")} Dreiecke</span><small>${escape(t.path)}</small></figcaption></figure>`).join("")}</div></section>`).join("");
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEON CONTRACT · Assetprüfung</title><style>*{box-sizing:border-box}body{margin:0;padding:28px;font:14px/1.5 system-ui;background:#141c24;color:#e4eaf0}h1{font-size:24px}h2{font-size:19px}p,small{color:#a5b4c1}header{max-width:1300px;margin:0 auto 28px}a{color:#a4e5ce}input{padding:10px;font:inherit;background:#202c36;border:1px solid #657885;color:inherit;width:380px;max-width:100%}section{max-width:1300px;margin:0 auto 32px;padding-top:12px;border-top:1px solid #3d4b59}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}figure{margin:0;background:#202b35;min-width:0}img{display:block;width:100%;height:auto}figcaption{padding:10px;display:grid;gap:3px}figcaption span{color:#a4e5ce}figcaption small{font-size:10px;overflow-wrap:anywhere}.hidden{display:none}@media(max-width:900px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}</style><header><h1>Lokale Assetprüfung</h1><p>${report.summary.files} Blender-Dateien · ${thumbs.length} Vorschauen · Quellen unverändert: ${report.summary.sourceUnchanged ? "ja" : "nein"}.</p><p>Quelle: vom Nutzer bereitgestellter Ordner Models&amp;Animations. Keine Lizenz aus Ähnlichkeit abgeleitet. Technische Rig- und Animationsbefunde stehen in <a href="summary.md">summary.md</a>; alle Messdaten in <a href="report.json">report.json</a>.</p><label>Suchen <input aria-label="Asset suchen" placeholder="Name eingeben"></label></header>${sections}<script>document.querySelector('input').addEventListener('input',event=>{const query=event.target.value.toLowerCase();document.querySelectorAll('figure').forEach(item=>item.classList.toggle('hidden',!item.dataset.search.includes(query)))})</script></html>`;
  await writeFile(path.join(output, "index.html"), html);
  const server = http.createServer(async (req, res) => {
    try {
      const file = path.resolve(output, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
      if (file !== output && !file.startsWith(output + path.sep)) { res.writeHead(403); res.end(); return; }
      const data = await readFile(file === output ? path.join(output, "index.html") : file);
      res.setHeader("Content-Type", file.endsWith(".png") ? "image/png" : file.endsWith(".json") ? "application/json" : file.endsWith(".md") ? "text/plain;charset=utf-8" : "text/html;charset=utf-8"); res.end(data);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    for (const channel of ["chrome", "msedge", undefined]) {
      try { browser = await chromium.launch({ channel, headless: true }); break; } catch { /* try another installed browser */ }
    }
    assert(browser, "Kein Browser für Kontaktbögen verfügbar; Einzelbilder und HTML bleiben erhalten.");
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: "networkidle" });
    await page.locator("img").evaluateAll(images => Promise.all(images.map(i => i.decode())));
    assert.equal(await page.locator("img").count(), thumbs.length);
    for (const category of Object.keys(titles)) if (thumbs.some(t => t.category === category)) await page.locator(`#${category}`).screenshot({ path: path.join(output, `contact-${category}.png`) });
    const example = thumbs[0]?.label;
    if (example) {
      await page.getByLabel("Asset suchen").fill(example.toLowerCase());
      assert(await page.locator("figure:not(.hidden)").count() > 0);
      assert(await page.locator("figure.hidden").count() > 0);
    }
    assert.equal(errors.length, 0, errors.join("\n"));
    await writeFile(path.join(output, "contact-check.json"), JSON.stringify({ passed: true, images: thumbs.length, categories: Object.keys(titles).filter(c => thumbs.some(t => t.category === c)), search: true, pageErrors: errors }, null, 2) + "\n");
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
