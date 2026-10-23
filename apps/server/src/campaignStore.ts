import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createCampaign, readCampaign, releaseFreeze, type CampaignState } from "@neon/sim";

export interface CampaignStore {
  read(): CampaignState;
  write(state: CampaignState): void;
}

let shared: CampaignStore | null = null;

export function createMemoryCampaignStore(initial: CampaignState = createCampaign()): CampaignStore {
  let current = initial;
  return {
    read: () => current,
    write(state: CampaignState) {
      current = state;
    },
  };
}

export function createFileCampaignStore(filePath: string): CampaignStore {
  let current = loadCampaign(filePath);
  return {
    read: () => current,
    write(state: CampaignState) {
      persistCampaign(filePath, state);
      current = state;
    },
  };
}

export function recoverUnbooked(store: CampaignStore): CampaignStore {
  const recovered = releaseFreeze(store.read());
  if (recovered.released) store.write(recovered.state);
  return store;
}

export function openCampaignFile(filePath: string): CampaignStore {
  const store = recoverUnbooked(createFileCampaignStore(filePath));
  shared = store;
  return store;
}

export function campaignStore(): CampaignStore {
  if (shared) return shared;
  return createMemoryCampaignStore();
}

function loadCampaign(filePath: string): CampaignState {
  const text = loadText(filePath);
  if (text === null) {
    const created = createCampaign();
    persistCampaign(filePath, created);
    return created;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Save ist ungültig.");
  }
  const read = readCampaign(raw);
  if (!read.ok) throw new Error(read.rejection);
  if (read.migrated) persistCampaign(filePath, read.state);
  return read.state;
}

function loadText(filePath: string): string | null {
  if (existsSync(filePath)) return readFileSync(filePath, "utf8");
  const temporary = `${filePath}.tmp`;
  if (existsSync(temporary)) return readFileSync(temporary, "utf8");
  return null;
}

function persistCampaign(filePath: string, state: CampaignState): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  if (existsSync(filePath)) unlinkSync(filePath);
  renameSync(temporary, filePath);
}
