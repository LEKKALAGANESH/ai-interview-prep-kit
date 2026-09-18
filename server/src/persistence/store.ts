import type { NormalizedKitInput } from "@trao/interview-prep-shared/input-model.js";
import type { Kit } from "@trao/interview-prep-shared/kit.js";

export interface KitStore {
  save(id: string, kit: Kit): Promise<Kit>;
  getById(id: string): Promise<Kit | null>;
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
  return `kit_${stableHash(
    JSON.stringify([
      input.company_url,
      input.job_description,
      input.days_available,
    ]),
  )}`;
}

export class InMemoryKitStore implements KitStore {
  private readonly kits = new Map<string, Kit>();

  async save(id: string, kit: Kit): Promise<Kit> {
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
