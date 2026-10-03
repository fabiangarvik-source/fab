// Room persistence. Vercel functions share no memory, so production keeps rooms
// in Postgres (Neon). Local dev without DATABASE_URL uses an in-process map.
// Writes are compare-and-set on `version`, so concurrent requests never clobber
// each other: the loser re-reads and retries.

import { neon } from "@neondatabase/serverless";
import type { StoredRoom } from "./rooms";

export interface RoomStore {
  get(code: string): Promise<StoredRoom | null>;
  /** Insert a new room; false if the code is taken. */
  insert(room: StoredRoom): Promise<boolean>;
  /** Write if the stored version still equals `expected`; false on conflict. */
  replace(room: StoredRoom, expected: number): Promise<boolean>;
  delete(code: string): Promise<void>;
  sweep(olderThanMs: number): Promise<void>;
}

class MemoryStore implements RoomStore {
  rooms = new Map<string, string>();
  async get(code: string) {
    const s = this.rooms.get(code);
    return s ? (JSON.parse(s) as StoredRoom) : null;
  }
  async insert(room: StoredRoom) {
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, JSON.stringify(room));
    return true;
  }
  async replace(room: StoredRoom, expected: number) {
    // Check and write synchronously so concurrent callers can't interleave.
    const s = this.rooms.get(room.code);
    if (!s || (JSON.parse(s) as StoredRoom).version !== expected) return false;
    this.rooms.set(room.code, JSON.stringify(room));
    return true;
  }
  async delete(code: string) {
    this.rooms.delete(code);
  }
  async sweep(olderThanMs: number) {
    const cutoff = Date.now() - olderThanMs;
    for (const [code, s] of this.rooms) if ((JSON.parse(s) as StoredRoom).lastActivity < cutoff) this.rooms.delete(code);
  }
}

class PostgresStore implements RoomStore {
  private sql: ReturnType<typeof neon>;
  private ready: Promise<unknown> | null = null;
  constructor(url: string) {
    this.sql = neon(url);
  }
  private init() {
    this.ready ??= this.sql`
      CREATE TABLE IF NOT EXISTS sh_rooms (
        code text PRIMARY KEY,
        version integer NOT NULL,
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`.catch((e) => {
      this.ready = null; // retry on the next request
      throw e;
    });
    return this.ready;
  }
  async get(code: string) {
    await this.init();
    const rows = (await this.sql`SELECT data FROM sh_rooms WHERE code = ${code}`) as { data: StoredRoom }[];
    return rows[0]?.data ?? null;
  }
  async insert(room: StoredRoom) {
    await this.init();
    const rows = (await this.sql`
      INSERT INTO sh_rooms (code, version, data) VALUES (${room.code}, ${room.version}, ${JSON.stringify(room)}::jsonb)
      ON CONFLICT (code) DO NOTHING RETURNING code`) as unknown[];
    return rows.length === 1;
  }
  async replace(room: StoredRoom, expected: number) {
    await this.init();
    const rows = (await this.sql`
      UPDATE sh_rooms SET version = ${room.version}, data = ${JSON.stringify(room)}::jsonb, updated_at = now()
      WHERE code = ${room.code} AND version = ${expected} RETURNING code`) as unknown[];
    return rows.length === 1;
  }
  async delete(code: string) {
    await this.init();
    await this.sql`DELETE FROM sh_rooms WHERE code = ${code}`;
  }
  async sweep(olderThanMs: number) {
    await this.init();
    const cutoff = new Date(Date.now() - olderThanMs).toISOString();
    await this.sql`DELETE FROM sh_rooms WHERE updated_at < ${cutoff}`;
  }
}

const g = globalThis as unknown as { __shStore?: RoomStore };

export function getStore(): RoomStore {
  if (!g.__shStore) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (url) g.__shStore = new PostgresStore(url);
    else if (process.env.VERCEL) throw new Error("DATABASE_URL is not set. Connect a Postgres (Neon) store to this Vercel project.");
    else g.__shStore = new MemoryStore();
  }
  return g.__shStore;
}

export function setStoreForTests(store: RoomStore) {
  g.__shStore = store;
}

export { MemoryStore };
