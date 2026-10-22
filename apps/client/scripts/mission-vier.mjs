import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(clientDir, "../..");
const serverDir = path.join(repoDir, "apps", "server");
const outFile = path.join(repoDir, "artifacts", "pieces", "mission", "run.json");
const previewUrl = "http://127.0.0.1:4175/?stueck=mission&server=ws://127.0.0.1:2567";
const viteBin = path.join(clientDir, "node_modules", "vite", "bin", "vite.js");
const tsxCli = path.join(serverDir, "node_modules", "tsx", "dist", "cli.mjs");

const players = [
  { name: "Kite", runner: "kite", preset: "rifle" },
  { name: "Voss", runner: "voss", preset: "sidearm" },
  { name: "Nera", runner: "nera", preset: "rifle" },
  { name: "Sol", runner: "sol", preset: "sidearm" },
];

const children = [];

try {
  await rm(outFile, { force: true });
  await run(process.execPath, [viteBin, "build"], clientDir);
  const preview = start(process.execPath, [viteBin, "preview", "--host", "127.0.0.1", "--port", "4175", "--strictPort"], clientDir);
  const server = start(process.execPath, [tsxCli, "src/index.ts"], serverDir, {
    PORT: "2567",
    HOST: "127.0.0.1",
    DEBUG: "",
  });
  await waitForHttp("http://127.0.0.1:4175/?stueck=mission", preview);
  await waitForHttp("http://127.0.0.1:2567/health", server);

  const browser = await launchBrowser();
  const contexts = [];
  try {
    for (const player of players) {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.on("pageerror", (error) => {
        console.error(`pageerror: ${error.message}`);
      });
      contexts.push({ context, page, player });
    }

    const first = contexts[0];
    await openZugang(first.page);
    await first.page.fill("[data-field=name]", first.player.name);
    await first.page.click("[data-action=erstellen]");
    await first.page.waitForSelector("[data-room-phase=lobby]");
    const code = await first.page.locator("[data-invite]").getAttribute("data-invite");
    if (!code) throw new Error("Einladung fehlt");

    for (const entry of contexts.slice(1)) {
      await openZugang(entry.page);
      await entry.page.fill("[data-field=name]", entry.player.name);
      await entry.page.fill("[data-field=code]", code);
      await entry.page.click("[data-action=beitreten]");
      await entry.page.waitForSelector(`[data-own-runner=${entry.player.runner}]`);
    }
    await first.page.waitForSelector(`[data-own-runner=${first.player.runner}]`);

    for (const entry of contexts) {
      await entry.page.click(`button[data-preset=${entry.player.preset}]`);
      await entry.page.waitForSelector(`[data-slot=${entry.player.runner}][data-preset=${entry.player.preset}]`);
      await entry.page.click("[data-screen=lobby] [data-action=bereit]");
      await entry.page.waitForSelector(`[data-slot=${entry.player.runner}][data-ready='1']`);
    }

    await first.page.locator("[data-action=start]:not([disabled])").click();
    for (const entry of contexts) {
      await entry.page.waitForSelector("[data-room-phase=mission]");
      await entry.page.waitForSelector("[data-view=iso] canvas");
    }

    const kite = contexts[0].page;
    const voss = contexts[1].page;
    const nera = contexts[2].page;
    const sol = contexts[3].page;

    await act(kite, "[data-action=terminal]");
    await kite.waitForSelector("[data-copies='1']");
    await voss.click("[data-action=bewegen]");
    await act(voss, "[data-cell='1,8']");
    await voss.click("[data-action=bewegen]");
    await act(voss, "[data-cell='2,8']");
    await act(voss, "[data-action=terminal]");
    await voss.waitForSelector("[data-copies='2']");

    for (const page of [kite, voss, nera, sol]) await act(page, "[data-screen=einsatz] [data-action=bereit]");
    for (const page of [kite, voss, nera, sol]) await page.waitForSelector("[data-round='2'][data-phase=crew]");

    await kite.click("[data-action=bewegen]");
    await act(kite, "[data-cell='0,9']");
    await act(kite, "[data-action=extraktion]");
    await voss.click("[data-action=bewegen]");
    await act(voss, "[data-cell='1,8']");
    await voss.click("[data-action=bewegen]");
    await act(voss, "[data-cell='0,8']");
    await act(voss, "[data-action=extraktion]");
    await nera.click("[data-action=bewegen]");
    await act(nera, "[data-cell='0,10']");
    await act(nera, "[data-action=extraktion]");
    await sol.click("[data-action=bewegen]");
    await act(sol, "[data-cell='0,11']");
    await act(sol, "[data-action=extraktion]");

    const runnerIds = [];
    let outcome = "";
    let round = 0;
    for (const entry of contexts) {
      await entry.page.waitForSelector("[data-mission-result]");
      const count = await entry.page.locator("[data-mission-result]").count();
      if (count !== 1) throw new Error(`MissionResult Anzahl ${count}`);
      const node = entry.page.locator("[data-mission-result]");
      const seen = await node.getAttribute("data-mission-result");
      const seenRound = Number(await node.getAttribute("data-result-round"));
      const runner = await node.getAttribute("data-own-runner");
      const text = await node.innerText();
      if (seen !== "sieg" && seen !== "niederlage") throw new Error(`Ergebnis fehlt: ${seen ?? ""}`);
      if (!Number.isInteger(seenRound) || seenRound < 1) throw new Error(`Runde fehlt: ${seenRound}`);
      if (!runner) throw new Error("Runner fehlt");
      if (outcome && outcome !== seen) throw new Error("Ergebnisse widersprechen sich");
      if (round && round !== seenRound) throw new Error("Runden widersprechen sich");
      if (seen === "sieg" && (!text.includes("Erfolg") || text.includes("Niederlage"))) throw new Error("Erfolgtext ist nicht eindeutig");
      if (seen === "niederlage" && (!text.includes("Niederlage") || text.includes("Erfolg"))) throw new Error("Niederlagentext ist nicht eindeutig");
      outcome = seen;
      round = seenRound;
      runnerIds.push(runner);
    }
    if (new Set(runnerIds).size !== 4) throw new Error(`Runner nicht getrennt: ${runnerIds.join(",")}`);

    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, `${JSON.stringify({ outcome, round, runnerIds, source: "playwright" }, null, 2)}\n`, "utf8");
    console.log(`mission:vier ${outcome} Runde ${round}`);
    console.log(outFile);
  } finally {
    await browser.close();
  }
} catch (error) {
  const detail = children.map((child) => child.log ?? "").filter(Boolean).join("\n").slice(-4000);
  if (detail && error instanceof Error) error.message = `${error.message}\n${detail}`;
  throw error;
} finally {
  for (const child of children) stop(child);
}

function start(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.log = "";
  const take = (chunk) => {
    child.log += String(chunk);
  };
  child.stdout?.on("data", take);
  child.stderr?.on("data", take);
  children.push(child);
  return child;
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    const take = (chunk) => {
      log += String(chunk);
    };
    child.stdout?.on("data", take);
    child.stderr?.on("data", take);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Befehl endet mit ${code}\n${log}`));
    });
  });
}

async function waitForHttp(url, child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Prozess endet vor ${url}\n${child.log ?? ""}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Der Prozess schreibt erst, dann nimmt er Verbindungen an.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`nicht erreichbar: ${url}\n${child.log ?? ""}`);
}

async function openZugang(page) {
  await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-screen=zugang]");
}

async function act(page, selector) {
  const previous = await page.locator("[data-ack]").first().getAttribute("data-ack");
  await page.locator(selector).click();
  try {
    await page.waitForFunction(
      (prior) => {
        const node = document.querySelector("[data-ack]");
        return Boolean(node && node.getAttribute("data-ack") !== prior);
      },
      previous,
      { timeout: 10000 },
    );
  } catch (error) {
    const notice = await page.locator("[data-notice]").first().getAttribute("data-notice");
    throw new Error(`${selector} ohne Bestätigung (${notice ?? "ohne Hinweis"})`, { cause: error });
  }
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

function stop(child) {
  if (!child.pid) return;
  spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
}
