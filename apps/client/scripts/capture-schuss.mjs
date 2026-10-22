import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.resolve(clientDir, "../../artifacts/pieces/schuss/ours.png");
const previewUrl = "http://127.0.0.1:4173/?stueck=schuss";

const viteBin = path.join(clientDir, "node_modules", "vite", "bin", "vite.js");
const preview = spawn(process.execPath, [viteBin, "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
  cwd: clientDir,
  stdio: ["ignore", "pipe", "pipe"],
});

function stopPreview() {
  if (!preview.pid) return;
  spawn("taskkill", ["/PID", String(preview.pid), "/T", "/F"], { stdio: "ignore" });
}

try {
  await waitForPreview(preview);
  await mkdir(path.dirname(outFile), { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => {
    console.error(`pageerror: ${error.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error(`console: ${msg.text()}`);
  });
  await page.goto(previewUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#battle-root canvas");
  await page.waitForFunction(() => window.__NEON_FRAME_READY__ === true);
  await page.screenshot({
    path: outFile,
    type: "png",
    clip: { x: 0, y: 0, width: 1920, height: 1080 },
    animations: "disabled",
  });
  await browser.close();
  const buf = await readFile(outFile);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width !== 1920 || height !== 1080) {
    throw new Error(`PNG ist ${width}×${height}, erwartet 1920×1080`);
  }
  console.log(`${outFile} ${width}x${height}`);
} finally {
  stopPreview();
}

async function waitForPreview(child) {
  let log = "";
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`preview startet nicht\n${log}`)), 30000);
    const take = (chunk) => {
      const text = String(chunk);
      log += text;
      if (text.includes("4173")) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout?.on("data", take);
    child.stderr?.on("data", take);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`preview beendet (${code})\n${log}`));
    });
  });
  await ready;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(previewUrl);
      if (response.ok) return;
    } catch {
      // Server schreibt die URL, bevor er Verbindungen annimmt.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`preview nicht erreichbar\n${log}`);
}

async function launchBrowser() {
  let last = new Error("kein Browser");
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({
        channel,
        headless: true,
        args: ["--force-device-scale-factor=1", "--hide-scrollbars", "--disable-background-timer-throttling"],
      });
    } catch (error) {
      last = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw last;
}
