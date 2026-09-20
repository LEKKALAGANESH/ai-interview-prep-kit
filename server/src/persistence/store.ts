import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { NormalizedKitInput } from "@trao/interview-prep-shared/input-model.js";
import type { Kit } from "@trao/interview-prep-shared/kit.js";
import type { PracticeState } from "@trao/interview-prep-shared/practice.js";
import { MongoKitStore } from "./mongodb-store.js";

export type PinnedQuestionState = { question_ids: string[]; updated_at: string };
export type ResearchProvenance = { researched_at: string; claims: Array<{ claim: string; source_url: string; source_type: "company-primary" | "public-interview" | "other"; evidence: string; confidence_basis: string; freshness_at?: string }> };

export interface KitStore {
  // Unscoped ids of one user's kits, for the "my kits" list. Optional: only the real stores implement it.
  listForUser?(userId: string): Promise<Array<{ id: string; kit: Kit }>>;
  update(id: string, kit: Kit): Promise<Kit>;
  delete(id: string): Promise<boolean>;
  save(id: string, kit: Kit): Promise<Kit>;
  getById(id: string): Promise<Kit | null>;
  withRequestLock<T>(id: string, operation: () => Promise<T>): Promise<T>;
  getPractice(id: string): Promise<PracticeState>;
  savePractice(id: string, state: PracticeState): Promise<PracticeState>;
  getPinnedQuestions(id: string): Promise<PinnedQuestionState>;
  savePinnedQuestions(id: string, state: PinnedQuestionState): Promise<PinnedQuestionState>;
  getResearchProvenance(id: string): Promise<ResearchProvenance | null>;
  saveResearchProvenance(id: string, state: ResearchProvenance): Promise<ResearchProvenance>;
}

function stableHash(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + index;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildKitId(input: NormalizedKitInput): string {
  return `kit_${stableHash(JSON.stringify([
    input.company_url,
    input.job_description,
    input.days_available,
  ]))}`;
}

export class InMemoryKitStore implements KitStore {
  private readonly kits = new Map<string, Kit>();
  private readonly practice = new Map<string, PracticeState>();
  private readonly pinned = new Map<string, PinnedQuestionState>();
  private readonly provenance = new Map<string, ResearchProvenance>();
  private readonly locks = new Map<string, Promise<void>>();

  async save(id: string, kit: Kit): Promise<Kit> {
    this.kits.set(id, structuredClone(kit));
    return structuredClone(kit);
  }

  async listForUser(userId: string): Promise<Array<{ id: string; kit: Kit }>> {
    const prefix = `user:${userId}:`;
    return [...this.kits].filter(([key]) => key.startsWith(prefix)).map(([key, kit]) => ({ id: key.slice(prefix.length), kit: structuredClone(kit) }));
  }

  async getById(id: string): Promise<Kit | null> {
    const kit = this.kits.get(id);
    return kit ? structuredClone(kit) : null;
  }

  async getPractice(id: string): Promise<PracticeState> { return structuredClone(this.practice.get(id) ?? { current_index: 0, results: [], completed: false }); }
  async savePractice(id: string, state: PracticeState): Promise<PracticeState> { this.practice.set(id, structuredClone(state)); return structuredClone(state); }
  async getPinnedQuestions(id: string): Promise<PinnedQuestionState> { return structuredClone(this.pinned.get(id) ?? { question_ids: [], updated_at: new Date(0).toISOString() }); }
  async savePinnedQuestions(id: string, state: PinnedQuestionState): Promise<PinnedQuestionState> { this.pinned.set(id, structuredClone(state)); return structuredClone(state); }
  async getResearchProvenance(id: string): Promise<ResearchProvenance | null> { return structuredClone(this.provenance.get(id) ?? null); }
  async saveResearchProvenance(id: string, state: ResearchProvenance): Promise<ResearchProvenance> { this.provenance.set(id, structuredClone(state)); return structuredClone(state); }

  async update(id: string, kit: Kit): Promise<Kit> {
    if (!this.kits.has(id)) throw new Error(`Unknown kit: ${id}`);
    this.kits.set(id, structuredClone(kit));
    return structuredClone(kit);
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.kits.delete(id);
    this.practice.delete(id);
    this.pinned.delete(id);
    this.provenance.delete(id);
    return existed;
  }

  async withRequestLock<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const queued = previous.then(() => current);
    this.locks.set(id, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.locks.get(id) === queued) this.locks.delete(id);
    }
  }
}

/**
 * Small durable JSON-backed store for single-node deployments.
 * Writes are atomic (temporary file + rename), so a process restart does not
 * discard generated kits. The application-level in-flight map still prevents
 * concurrent duplicates inside one process.
 */
export class JsonFileKitStore implements KitStore {
  constructor(private readonly filePath: string) {}

  private async readAll(): Promise<Record<string, Kit>> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Kit store file must contain an object");
      }
      return parsed as Record<string, Kit>;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error &&
          (error as { code?: string }).code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockPath = `${this.filePath}.lock`;
    await mkdir(dirname(this.filePath), { recursive: true });

    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        await mkdir(lockPath);
        try {
          return await operation();
        } finally {
          await rm(lockPath, { recursive: true, force: true });
        }
      } catch (error) {
        if (error && typeof error === "object" && "code" in error &&
            (error as { code?: string }).code === "EEXIST") {
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
          continue;
        }
        throw error;
      }
    }

    throw new Error("Timed out acquiring kit store lock");
  }

  private async readPractice(): Promise<Record<string, PracticeState>> {
    const path = `${this.filePath}.practice`;
    try { const parsed: unknown = JSON.parse(await readFile(path, "utf8")); return parsed as Record<string, PracticeState>; }
    catch(error) { if(error && typeof error==="object" && "code" in error && (error as {code?:string}).code==="ENOENT") return {}; throw error; }
  }
  private async writePractice(data: Record<string, PracticeState>): Promise<void> { await writeFile(`${this.filePath}.practice.tmp`,JSON.stringify(data),"utf8"); await rename(`${this.filePath}.practice.tmp`,`${this.filePath}.practice`); }
  private async readPinned(): Promise<Record<string, PinnedQuestionState>> { const path = `${this.filePath}.pinned`; try { return JSON.parse(await readFile(path, "utf8")) as Record<string, PinnedQuestionState>; } catch(error) { if(error && typeof error==="object" && "code" in error && (error as {code?:string}).code==="ENOENT") return {}; throw error; } }
  private async writePinned(data: Record<string, PinnedQuestionState>): Promise<void> { await writeFile(`${this.filePath}.pinned.tmp`,JSON.stringify(data),"utf8"); await rename(`${this.filePath}.pinned.tmp`,`${this.filePath}.pinned`); }
  private async readProvenance(): Promise<Record<string, ResearchProvenance>> { const path = this.filePath + ".provenance"; try { return JSON.parse(await readFile(path, "utf8")) as Record<string, ResearchProvenance>; } catch(error) { if(error && typeof error==="object" && "code" in error && (error as {code?:string}).code==="ENOENT") return {}; throw error; } }
  private async writeProvenance(data: Record<string, ResearchProvenance>): Promise<void> { await writeFile(this.filePath + ".provenance.tmp", JSON.stringify(data), "utf8"); await rename(this.filePath + ".provenance.tmp", this.filePath + ".provenance"); }
  private async writeAll(kits: Record<string, Kit>): Promise<void> {
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(kits), "utf8");
    await rename(tempPath, this.filePath);
  }

  async withRequestLock<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const lockPath = `${this.filePath}.${stableHash(id)}.request.lock`;
    await mkdir(dirname(lockPath), { recursive: true });
    for (let attempt = 0; attempt < 300; attempt += 1) {
      try {
        await mkdir(lockPath);
        try {
          return await operation();
        } finally {
          await rm(lockPath, { recursive: true, force: true });
        }
      } catch (error) {
        if (error && typeof error === "object" && "code" in error &&
            (error as { code?: string }).code === "EEXIST") {
          await new Promise<void>((resolve) => setTimeout(resolve, 25));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Timed out acquiring request lock");
  }

  async save(id: string, kit: Kit): Promise<Kit> {
    return this.withLock(async () => {
      const kits = await this.readAll();
      kits[id] = structuredClone(kit);
      await this.writeAll(kits);
      return structuredClone(kit);
    });
  }

  async listForUser(userId: string): Promise<Array<{ id: string; kit: Kit }>> {
    const prefix = `user:${userId}:`;
    return Object.entries(await this.readAll()).filter(([key]) => key.startsWith(prefix)).map(([key, kit]) => ({ id: key.slice(prefix.length), kit }));
  }

  async getById(id: string): Promise<Kit | null> {
    const kits = await this.readAll();
    return kits[id] ? structuredClone(kits[id]) : null;
  }

  async update(id: string, kit: Kit): Promise<Kit> {
    return this.withLock(async () => {
      const kits = await this.readAll();
      if (!kits[id]) throw new Error(`Unknown kit: ${id}`);
      kits[id] = structuredClone(kit);
      await this.writeAll(kits);
      return structuredClone(kit);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withLock(async () => {
      const kits = await this.readAll();
      if (!kits[id]) return false;
      delete kits[id];
      await this.writeAll(kits);
      const practice = await this.readPractice(); delete practice[id]; await this.writePractice(practice);
      const pinned = await this.readPinned(); delete pinned[id]; await this.writePinned(pinned);
      const provenance = await this.readProvenance(); delete provenance[id]; await this.writeProvenance(provenance);
      return true;
    });
  }

  async getPractice(id: string): Promise<PracticeState> { const data = await this.readPractice(); return structuredClone(data[id] ?? { current_index: 0, results: [], completed: false }); }
  async savePractice(id: string, state: PracticeState): Promise<PracticeState> { const data = await this.readPractice(); data[id] = structuredClone(state); await this.writePractice(data); return structuredClone(state); }
  async getPinnedQuestions(id: string): Promise<PinnedQuestionState> { const data = await this.readPinned(); return structuredClone(data[id] ?? { question_ids: [], updated_at: new Date(0).toISOString() }); }
  async savePinnedQuestions(id: string, state: PinnedQuestionState): Promise<PinnedQuestionState> { const data = await this.readPinned(); data[id] = structuredClone(state); await this.writePinned(data); return structuredClone(state); }
  async getResearchProvenance(id: string): Promise<ResearchProvenance | null> { const data = await this.readProvenance(); return structuredClone(data[id] ?? null); }
  async saveResearchProvenance(id: string, state: ResearchProvenance): Promise<ResearchProvenance> { const data = await this.readProvenance(); data[id] = structuredClone(state); await this.writeProvenance(data); return structuredClone(state); }
}

export function createKitStore(): KitStore {
  if (process.env.MONGODB_URI?.trim()) return new MongoKitStore();
  const path = process.env.KIT_STORE_FILE?.trim() || ".data/kits.json";
  return new JsonFileKitStore(path);
}


export class UserScopedKitStore implements KitStore {
  constructor(private readonly base: KitStore, private readonly userId: string) {}

  private key(id: string): string { return `user:${this.userId}:${id}`; }

  listForUser(): Promise<Array<{ id: string; kit: Kit }>> { return this.base.listForUser?.(this.userId) ?? Promise.resolve([]); }
  save(id: string, kit: Kit): Promise<Kit> { return this.base.save(this.key(id), kit); }
  getById(id: string): Promise<Kit | null> { return this.base.getById(this.key(id)); }
  update(id: string, kit: Kit): Promise<Kit> { return this.base.update(this.key(id), kit); }
  delete(id: string): Promise<boolean> { return this.base.delete(this.key(id)); }
  withRequestLock<T>(id: string, operation: () => Promise<T>): Promise<T> { return this.base.withRequestLock(this.key(id), operation); }
  getPractice(id: string): Promise<PracticeState> { return this.base.getPractice(this.key(id)); }
  savePractice(id: string, state: PracticeState): Promise<PracticeState> { return this.base.savePractice(this.key(id), state); }
  getPinnedQuestions(id: string): Promise<PinnedQuestionState> { return this.base.getPinnedQuestions(this.key(id)); }
  savePinnedQuestions(id: string, state: PinnedQuestionState): Promise<PinnedQuestionState> { return this.base.savePinnedQuestions(this.key(id), state); }
  getResearchProvenance(id: string): Promise<ResearchProvenance | null> { return this.base.getResearchProvenance(this.key(id)); }
  saveResearchProvenance(id: string, state: ResearchProvenance): Promise<ResearchProvenance> { return this.base.saveResearchProvenance(this.key(id), state); }
}
