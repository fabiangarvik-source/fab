// One Node process serves the Next.js app and the socket.io game server.

import { createServer } from "node:http";
import next from "next";
import { Server, type Socket } from "socket.io";
import type { ClientToServer, ServerToClient } from "../src/protocol";
import { RoomManager, type Room } from "./rooms";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const botsAllowed = dev || process.env.ENABLE_BOTS === "1";

interface SocketData {
  code?: string;
  memberId?: string | null; // null = table screen
}
type IO = Server<ClientToServer, ServerToClient, object, SocketData>;
type Sock = Socket<ClientToServer, ServerToClient, object, SocketData>;

const app = next({ dev, dir: process.cwd() });
await app.prepare();
const handle = app.getRequestHandler();

const http = createServer((req, res) => handle(req, res));
const io: IO = new Server(http, { pingInterval: 10_000, pingTimeout: 20_000 });

function broadcast(room: Room) {
  for (const s of io.sockets.sockets.values()) {
    if (s.data.code !== room.code) continue;
    s.emit("room", rooms.snapshot(room, s.data.memberId ?? null));
  }
}

const rooms = new RoomManager(broadcast, botsAllowed);
setInterval(() => rooms.sweep(), 10 * 60 * 1000).unref();

function detach(socket: Sock) {
  const { code, memberId } = socket.data;
  socket.data = {};
  if (!code) return;
  socket.leave(code);
  const room = rooms.get(code);
  const m = room?.members.find((x) => x.id === memberId);
  if (room && m) {
    m.sockets = Math.max(0, m.sockets - 1);
    broadcast(room);
  }
}

function attach(socket: Sock, room: Room, memberId: string | null) {
  detach(socket);
  socket.data = { code: room.code, memberId };
  socket.join(room.code);
  const m = room.members.find((x) => x.id === memberId);
  if (m) m.sockets++;
  broadcast(room);
}

io.on("connection", (socket: Sock) => {
  const ctx = () => {
    const room = socket.data.code ? rooms.get(socket.data.code) : undefined;
    const memberId = socket.data.memberId;
    if (!room || !memberId || !room.members.some((m) => m.id === memberId)) return null;
    return { room, memberId };
  };
  const safe = <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
    try {
      fn(...args);
    } catch (e) {
      console.error(e);
      const ack = args[args.length - 1];
      if (typeof ack === "function") ack({ ok: false, error: "Server error" });
    }
  };
  const noRoom = { ok: false as const, error: "You are not in a room" };

  socket.on("create", safe((p, ack) => {
    const r = rooms.create(p?.name);
    if (!r.ok) return ack(r);
    attach(socket, r.room, r.member.id);
    ack({ ok: true, code: r.room.code, token: r.member.token, playerId: r.member.id });
  }));

  socket.on("join", safe((p, ack) => {
    const r = rooms.join(String(p?.code ?? ""), p?.name, p?.token);
    if (!r.ok) return ack(r);
    attach(socket, r.room, r.member.id);
    ack({ ok: true, token: r.member.token, playerId: r.member.id });
  }));

  socket.on("watch", safe((p, ack) => {
    const room = rooms.get(String(p?.code ?? ""));
    if (!room) return ack({ ok: false, error: "No room with that code" });
    attach(socket, room, null);
    ack({ ok: true });
  }));

  socket.on("leave", safe((ack) => {
    const c = ctx();
    if (!c) return ack(noRoom);
    const r = rooms.leave(c.room, c.memberId);
    if (r.ok) detach(socket);
    ack(r);
  }));

  socket.on("kick", safe((p, ack) => {
    const c = ctx();
    if (!c) return ack(noRoom);
    const target = String(p?.playerId);
    const r = rooms.kick(c.room, c.memberId, target);
    if (r.ok) {
      for (const s of io.sockets.sockets.values()) {
        if (s.data.code === c.room.code && s.data.memberId === target) {
          s.data = {};
          s.leave(c.room.code);
          s.emit("kicked");
        }
      }
    }
    ack(r);
  }));

  socket.on("settings", safe((p, ack) => {
    const c = ctx();
    ack(c ? rooms.settings(c.room, c.memberId, p ?? {}) : noRoom);
  }));
  socket.on("start", safe((ack) => {
    const c = ctx();
    ack(c ? rooms.start(c.room, c.memberId) : noRoom);
  }));
  socket.on("playAgain", safe((ack) => {
    const c = ctx();
    ack(c ? rooms.start(c.room, c.memberId) : noRoom);
  }));
  socket.on("endGame", safe((ack) => {
    const c = ctx();
    ack(c ? rooms.endGame(c.room, c.memberId) : noRoom);
  }));
  socket.on("action", safe((a, ack) => {
    const c = ctx();
    ack(c ? rooms.action(c.room, c.memberId, a) : noRoom);
  }));
  socket.on("addBots", safe((p, ack) => {
    const c = ctx();
    ack(c ? rooms.addBots(c.room, c.memberId, Number(p?.count ?? 0)) : noRoom);
  }));

  socket.on("disconnect", () => detach(socket));
});

http.listen(port, () => {
  console.log(`> Secret Hitler ready on http://localhost:${port} (${dev ? "dev" : "production"}${botsAllowed ? ", bots on" : ""})`);
});
