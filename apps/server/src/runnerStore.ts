import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyRunnerFile, readRunnerFile, recoverHolds, RUNNER_SAVE_INVALID, type RunnerFile, type RunnerStore } from "./runnerAccount.ts";

export const DEFAULT_RUNNERS_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "runners.json");

let shared: RunnerStore | null = null;

export function createMemoryRunnerStore(initial: RunnerFile = emptyRunnerFile()): RunnerStore {
  let current = initial;
  return {
    read: () => current,
    write(file: RunnerFile) {
      current = file;
    },
  };
}

export function createFileRunnerStore(filePath: string): RunnerStore {
  let current = loadRunners(filePath);
  return {
    read: () => current,
    write(file: RunnerFile) {
      persistRunners(filePath, file);
      current = file;
    },
  };
}

export function openRunnerFile(filePath: string): RunnerStore {
  const store = createFileRunnerStore(filePath);
  shared = store;
  return store;
}

export function runnerStore(): RunnerStore {
  if (shared) return shared;
  return createMemoryRunnerStore();
}

function loadRunners(filePath: string): RunnerFile {
  const text = loadText(filePath);
  if (text === null) {
    const created = emptyRunnerFile();
    persistRunners(filePath, created);
    return created;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(RUNNER_SAVE_INVALID);
  }
  const read = readRunnerFile(raw);
  if (!read.ok) throw new Error(RUNNER_SAVE_INVALID);
  const recovered = recoverHolds(read.file);
  if (!recovered) throw new Error(RUNNER_SAVE_INVALID);
  if (recovered.changed) persistRunners(filePath, recovered.file);
  return recovered.file;
}

function loadText(filePath: string): string | null {
  if (existsSync(filePath)) return readFileSync(filePath, "utf8");
  const temporary = `${filePath}.tmp`;
  if (existsSync(temporary)) return readFileSync(temporary, "utf8");
  return null;
}

function persistRunners(filePath: string, file: RunnerFile): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  if (existsSync(filePath)) unlinkSync(filePath);
  renameSync(temporary, filePath);
}
