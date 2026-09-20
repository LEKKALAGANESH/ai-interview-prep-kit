import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export type AuthUser = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

type UserFile = Record<string, AuthUser>;

export class UserStore {
  constructor(private readonly filePath = process.env.AUTH_STORE_FILE?.trim() || ".data/users.json") {}

  private async readAll(): Promise<UserFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("User store file must contain an object");
      }
      return parsed as UserFile;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error &&
          (error as { code?: string }).code === "ENOENT") return {};
      throw error;
    }
  }

  private async writeAll(users: UserFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    await writeFile(temp, JSON.stringify(users), "utf8");
    await rename(temp, this.filePath);
  }

  async getByEmail(email: string): Promise<AuthUser | null> {
    const users = await this.readAll();
    const normalized = email.trim().toLowerCase();
    return Object.values(users).find((user) => user.email === normalized) ?? null;
  }

  async getById(id: string): Promise<AuthUser | null> {
    const users = await this.readAll();
    return users[id] ?? null;
  }

  async create(email: string, passwordHash: string): Promise<AuthUser> {
    const users = await this.readAll();
    const normalized = email.trim().toLowerCase();
    if (Object.values(users).some((user) => user.email === normalized)) {
      throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    const now = new Date().toISOString();
    const user: AuthUser = {
      id: `usr_${randomUUID()}`,
      email: normalized,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    };
    users[user.id] = user;
    await this.writeAll(users);
    return user;
  }
}

export function publicUser(user: AuthUser) {
  return { id: user.id, email: user.email, created_at: user.created_at };
}
