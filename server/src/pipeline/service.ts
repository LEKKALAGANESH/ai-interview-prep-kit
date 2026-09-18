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

export async function generateAndPersistKit(
  input: NormalizedKitInput,
  options: GenerateAndPersistKitOptions,
  store: KitStore,
): Promise<PersistedKitResult> {
  const id = buildKitId(input);
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
