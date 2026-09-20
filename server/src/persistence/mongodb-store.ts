import type { Kit } from "@trao/interview-prep-shared/kit.js";
import type { PracticeState } from "@trao/interview-prep-shared/practice.js";
import type { KitStore, PinnedQuestionState, ResearchProvenance } from "./store.js";
import { getMongoCollection } from "./mongodb.js";

type KitDocument = {
  _id: string;
  kit_id: string;
  user_id: string;
  kit: Kit;
  created_at: string;
  updated_at: string;
};

type PracticeDocument = { _id: string; user_id: string; kit_id: string; state: PracticeState };
type PinDocument = { _id: string; user_id: string; kit_id: string; state: PinnedQuestionState };
type ProvenanceDocument = { _id: string; user_id: string; kit_id: string; state: ResearchProvenance };

function scopeParts(scopedId: string): { userId: string; kitId: string } {
  const match = scopedId.match(/^user:([^:]+):(.+)$/);
  if (!match) return { userId: "legacy", kitId: scopedId };
  return { userId: match[1], kitId: match[2] };
}

export class MongoKitStore implements KitStore {
  private readonly locks = new Map<string, Promise<void>>();
  private indexesPromise: Promise<void> | null = null;

  private async ensureIndexes(): Promise<void> {
    if (!this.indexesPromise) {
      this.indexesPromise = (async () => {
        const kits = await getMongoCollection<KitDocument>("kits");
        const practice = await getMongoCollection<PracticeDocument>("practice_states");
        const pins = await getMongoCollection<PinDocument>("pinned_questions");
        const provenance = await getMongoCollection<ProvenanceDocument>("research_provenance");
        await Promise.all([
          kits.createIndex({ user_id: 1, kit_id: 1 }, { unique: true, name: "user_kit_unique" }),
          kits.createIndex({ user_id: 1, updated_at: -1 }, { name: "user_updated_at" }),
          practice.createIndex({ user_id: 1, kit_id: 1 }, { unique: true, name: "practice_user_kit_unique" }),
          pins.createIndex({ user_id: 1, kit_id: 1 }, { unique: true, name: "pins_user_kit_unique" }),
          provenance.createIndex({ user_id: 1, kit_id: 1 }, { unique: true, name: "provenance_user_kit_unique" }),
        ]);
      })().catch((error) => {
        this.indexesPromise = null;
        throw error;
      });
    }
    await this.indexesPromise;
  }

  private async kitCollection() { await this.ensureIndexes(); return getMongoCollection<KitDocument>("kits"); }
  private async practiceCollection() { await this.ensureIndexes(); return getMongoCollection<PracticeDocument>("practice_states"); }
  private async pinCollection() { await this.ensureIndexes(); return getMongoCollection<PinDocument>("pinned_questions"); }
  private async provenanceCollection() { await this.ensureIndexes(); return getMongoCollection<ProvenanceDocument>("research_provenance"); }

  async save(id: string, kit: Kit): Promise<Kit> {
    const { userId, kitId } = scopeParts(id);
    const collection = await this.kitCollection();
    const now = new Date().toISOString();
    await collection.updateOne(
      { user_id: userId, kit_id: kitId },
      { $set: { kit: structuredClone(kit), updated_at: now }, $setOnInsert: { _id: id, user_id: userId, kit_id: kitId, created_at: now } },
      { upsert: true },
    );
    return structuredClone(kit);
  }

  async listForUser(userId: string): Promise<Array<{ id: string; kit: Kit }>> {
    const docs = await (await this.kitCollection()).find({ user_id: userId }).sort({ updated_at: -1 }).toArray();
    return docs.map((doc) => ({ id: doc.kit_id, kit: structuredClone(doc.kit) }));
  }

  async getById(id: string): Promise<Kit | null> {
    const { userId, kitId } = scopeParts(id);
    const doc = await (await this.kitCollection()).findOne({ user_id: userId, kit_id: kitId });
    return doc ? structuredClone(doc.kit) : null;
  }

  async update(id: string, kit: Kit): Promise<Kit> {
    const { userId, kitId } = scopeParts(id);
    const result = await (await this.kitCollection()).updateOne({ user_id: userId, kit_id: kitId }, { $set: { kit: structuredClone(kit), updated_at: new Date().toISOString() } });
    if (!result.matchedCount) throw new Error(`Unknown kit: ${kitId}`);
    return structuredClone(kit);
  }

  async delete(id: string): Promise<boolean> {
    const { userId, kitId } = scopeParts(id);
    const result = await (await this.kitCollection()).deleteOne({ user_id: userId, kit_id: kitId });
    await Promise.all([
      (await this.practiceCollection()).deleteOne({ user_id: userId, kit_id: kitId }),
      (await this.pinCollection()).deleteOne({ user_id: userId, kit_id: kitId }),
      (await this.provenanceCollection()).deleteOne({ user_id: userId, kit_id: kitId }),
    ]);
    return result.deletedCount === 1;
  }

  async withRequestLock<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const queued = previous.then(() => current);
    this.locks.set(id, queued);
    await previous;
    try { return await operation(); }
    finally { release(); if (this.locks.get(id) === queued) this.locks.delete(id); }
  }

  async getPractice(id: string): Promise<PracticeState> {
    const { userId, kitId } = scopeParts(id);
    const doc = await (await this.practiceCollection()).findOne({ user_id: userId, kit_id: kitId });
    return structuredClone(doc?.state ?? { current_index: 0, results: [], completed: false });
  }

  async savePractice(id: string, state: PracticeState): Promise<PracticeState> {
    const { userId, kitId } = scopeParts(id);
    await (await this.practiceCollection()).updateOne({ user_id: userId, kit_id: kitId }, { $set: { state: structuredClone(state) }, $setOnInsert: { _id: id, user_id: userId, kit_id: kitId } }, { upsert: true });
    return structuredClone(state);
  }

  async getPinnedQuestions(id: string): Promise<PinnedQuestionState> {
    const { userId, kitId } = scopeParts(id);
    const doc = await (await this.pinCollection()).findOne({ user_id: userId, kit_id: kitId });
    return structuredClone(doc?.state ?? { question_ids: [], updated_at: new Date(0).toISOString() });
  }

  async savePinnedQuestions(id: string, state: PinnedQuestionState): Promise<PinnedQuestionState> {
    const { userId, kitId } = scopeParts(id);
    await (await this.pinCollection()).updateOne({ user_id: userId, kit_id: kitId }, { $set: { state: structuredClone(state) }, $setOnInsert: { _id: id, user_id: userId, kit_id: kitId } }, { upsert: true });
    return structuredClone(state);
  }

  async getResearchProvenance(id: string): Promise<ResearchProvenance | null> {
    const { userId, kitId } = scopeParts(id);
    const doc = await (await this.provenanceCollection()).findOne({ user_id: userId, kit_id: kitId });
    return doc ? structuredClone(doc.state) : null;
  }

  async saveResearchProvenance(id: string, state: ResearchProvenance): Promise<ResearchProvenance> {
    const { userId, kitId } = scopeParts(id);
    await (await this.provenanceCollection()).updateOne({ user_id: userId, kit_id: kitId }, { $set: { state: structuredClone(state) }, $setOnInsert: { _id: id, user_id: userId, kit_id: kitId } }, { upsert: true });
    return structuredClone(state);
  }
}
