import type { Kit } from "@trao/interview-prep-shared/kit.js";

export interface KitStore {
  save(kit: Kit): Promise<Kit>;
  getById(id: string): Promise<Kit | null>;
}

export class InMemoryKitStore implements KitStore {
  private readonly kits = new Map<string, Kit>();

  async save(kit: Kit): Promise<Kit> {
    const id = kit.source.company_url + "|" + kit.source.role + "|" + kit.source.jd_chars;
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
