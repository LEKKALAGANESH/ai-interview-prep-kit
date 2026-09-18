import type { Kit } from "@trao/interview-prep-shared/kit.js";

export interface KitStore {
  save(kit: Kit): Promise<Kit>;
  getById(id: string): Promise<Kit | null>;
}

export function buildKitId(kit: Kit): string {
  return [
    kit.source.company_url,
    kit.source.role,
    kit.source.jd_chars,
  ].join("|");
}

export class InMemoryKitStore implements KitStore {
  private readonly kits = new Map<string, Kit>();

  async save(kit: Kit): Promise<Kit> {
    const id = buildKitId(kit);
    this.kits.set(id, structuredClone(kit));
    return structuredClone(kit);
  }

  async getById(id: string): Promise<Kit | null> {
    const kit = this.kits.get(id);
    return kit ? structuredClone(kit) : null;
  }
}

export function createKitStore(): KitStore {
  return new InMemoryKitStore();
}
