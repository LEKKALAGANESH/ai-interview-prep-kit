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
};

export async function generateAndPersistKit(
  input: NormalizedKitInput,
  options: GenerateAndPersistKitOptions,
  store: KitStore,
): Promise<PersistedKitResult> {
  const kit = await buildValidatedKit(input, options);
  const saved = await store.save(kit);

  return {
    id: buildKitId(saved),
    kit: saved,
  };
}
