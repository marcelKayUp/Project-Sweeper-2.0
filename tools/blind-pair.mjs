import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const piece = process.argv[2];
const barName = process.argv[3];

if (!piece || !barName) {
  console.error("usage: node tools/blind-pair.mjs <piece> <bar-file>");
  process.exit(1);
}

const ours = resolve(root, "artifacts", "pieces", piece, "ours.png");
const bar = resolve(root, "reference", "ja3", barName);
const dir = resolve(root, "artifacts", "pieces", piece, "blind");
mkdirSync(dir, { recursive: true });

const oursIsA = randomInt(2) === 0;
copyFileSync(oursIsA ? ours : bar, resolve(dir, "A.png"));
copyFileSync(oursIsA ? bar : ours, resolve(dir, "B.png"));
writeFileSync(
  resolve(dir, "key.json"),
  JSON.stringify({ A: oursIsA ? "ours" : "bar", B: oursIsA ? "bar" : "ours", bar: barName }),
);

console.log("PAIR_READY");
