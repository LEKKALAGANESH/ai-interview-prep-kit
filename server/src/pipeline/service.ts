import type { Kit, CompanyBrief, Flashcard, Role } from "@trao/interview-prep-shared/kit.js";
import type { NormalizedKitInput } from "@trao/interview-prep-shared/input-model.js";
import { buildValidatedKit, type BuildKitOptions } from "./assembler.js";
import { buildKitId, type KitStore } from "../persistence/store.js";

export type GenerateAndPersistKitOptions = Omit<BuildKitOptions, "role" | "company" | "companyBrief" | "research"> & {
  role: Role;
  company: string;
  companyBrief: CompanyBrief;
  research: BuildKitOptions["research"];
  flashcards?: Flashcard[];
};

export type PersistedKitResult = {
  id: string;
  kit: Kit;
  reused: boolean;
};

const inFlightByStore = new WeakMap<KitStore, Map<string, Promise<PersistedKitResult>>>();

async function generateAndPersistOnce(
  id: string,
  input: NormalizedKitInput,
  options: GenerateAndPersistKitOptions,
  store: KitStore,
): Promise<PersistedKitResult> {
  const existing = await store.getById(id);

  if (existing) {
    return { id, kit: existing, reused: true };
  }

  const kit = await buildValidatedKit(input, options);
  const saved = await store.save(id, kit);

  return {
    id,
    kit: saved,
    reused: false,
  };
}

export async function generateAndPersistKit(
  input: NormalizedKitInput,
  options: GenerateAndPersistKitOptions,
  store: KitStore,
): Promise<PersistedKitResult> {
  const id = buildKitId(input);
  let inFlight = inFlightByStore.get(store);

  if (!inFlight) {
    inFlight = new Map();
    inFlightByStore.set(store, inFlight);
  }

  const active = inFlight.get(id);
  if (active) {
    const result = await active;
    return { ...result, reused: true };
  }

  const promise = generateAndPersistOnce(id, input, options, store);
  inFlight.set(id, promise);

  try {
    return await promise;
  } finally {
    if (inFlight.get(id) === promise) {
      inFlight.delete(id);
    }
    if (inFlight.size === 0) {
      inFlightByStore.delete(store);
    }
  }
}
