import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const missionUrl = "http://127.0.0.1:5173/";
const healthUrl = "http://127.0.0.1:2567/health";
const children = [];

const serverUp = await reachable(healthUrl);
const clientUp = await reachable(missionUrl);
if (!serverUp) start(["pnpm", "--filter", "@neon/server", "start"]);
if (!clientUp) start(["pnpm", "--filter", "@neon/client", "dev"]);

if (!(await waitUntilReady())) {
  console.error("Die Testmission ist nicht erreichbar.");
  stop(1);
}

openBrowser(missionUrl);
if (children.length === 0) process.exit(0);

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

function start(args) {
  const child = spawn("corepack", args, { cwd: root, stdio: "inherit", shell: true });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal || code === 0 || code === null) return;
    stop(code);
  });
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if ((await reachable(healthUrl)) && (await reachable(missionUrl))) return true;
    await delay(500);
  }
  return false;
}

async function reachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true, windowsHide: true });
    return;
  }
  const command = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(command, [url], { stdio: "ignore", detached: true });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stop(code) {
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === "win32") spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill();
  }
  process.exit(code);
}
