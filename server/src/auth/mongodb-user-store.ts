import { randomUUID } from "node:crypto";
import { getMongoCollection } from "../persistence/mongodb.js";
import type { AuthUser } from "./store.js";

type UserDocument = AuthUser & { _id: string };

export class MongoUserStore {
  private indexesPromise: Promise<void> | null = null;

  private async collection() {
    const collection = await getMongoCollection<UserDocument>("users");
    if (!this.indexesPromise) {
      this.indexesPromise = collection.createIndex({ email: 1 }, { unique: true, name: "email_unique" }).catch((error) => {
        this.indexesPromise = null;
        throw error;
      });
    }
    await this.indexesPromise;
    return collection;
  }

  async getByEmail(email: string): Promise<AuthUser | null> {
    const normalized = email.trim().toLowerCase();
    const user = await (await this.collection()).findOne({ email: normalized });
    return user ? { id: user.id, email: user.email, password_hash: user.password_hash, created_at: user.created_at, updated_at: user.updated_at } : null;
  }

  async getById(id: string): Promise<AuthUser | null> {
    const user = await (await this.collection()).findOne({ id });
    return user ? { id: user.id, email: user.email, password_hash: user.password_hash, created_at: user.created_at, updated_at: user.updated_at } : null;
  }

  async create(email: string, passwordHash: string): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase();
    const now = new Date().toISOString();
    const user: AuthUser = { id: `usr_${randomUUID()}`, email: normalized, password_hash: passwordHash, created_at: now, updated_at: now };
    try {
      await (await this.collection()).insertOne({ ...user, _id: user.id });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) throw new Error("EMAIL_ALREADY_REGISTERED");
      throw error;
    }
    return user;
  }
}
