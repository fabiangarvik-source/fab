"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS } from "../engine/config";
import type { RoomSnapshot } from "../protocol";
import { op, storage, tokenKey } from "./api";
import { GameScreen } from "./Game";
import { Crown, Question } from "./icons";
import { RulesContent } from "./Rules";
import { useRoom } from "./useRoom";
import { Banner, Button, Footer, Sheet, cx } from "./ui";

function QR({ url }: { url: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#15120e", light: "#f0e7d3" } }).then(setSvg, () => setSvg(""));
  }, [url]);
  return <div className="h-40 w-40 overflow-hidden rounded-md" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Lobby({ snap, offline }: { snap: RoomSnapshot; offline: boolean }) {
  const isHost = snap.meId === snap.hostId;
  const n = snap.members.length;
  const canStart = n >= MIN_PLAYERS && n <= MAX_PLAYERS;
  const [rules, setRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  const joinUrl = `${origin}/join?code=${snap.code}`;

  const run = async (req: Parameters<typeof op>[1]) => {
    const r = await op(snap.code, req);
    if (!r.ok) setError(r.error === "offline" ? "You're offline." : r.error);
    else setError(null);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-[env(safe-area-inset-bottom)] pt-[max(1rem,env(safe-area-inset-top))]">
      {offline && <Banner tone="warn">Reconnecting…</Banner>}
      <header className="flex items-center justify-between">
        <Link href="/" className="min-h-12 py-3 text-muted">
          ‹ Home
        </Link>
        <button onClick={() => setRules(true)} className="flex min-h-12 items-center gap-1 text-muted" aria-label="Rules">
          <Question className="h-6 w-6" /> Rules
        </button>
      </header>

      <section className="card-surface flex flex-col items-center rounded-xl p-4 text-center">
        <div className="font-type text-xs tracking-[0.3em] text-muted">ROOM CODE</div>
        <div className="font-display text-7xl font-black tracking-[0.2em] text-gold" data-testid="room-code">
          {snap.code}
        </div>
        {origin && <QR url={joinUrl} />}
        <p className="mt-2 break-all text-xs text-muted">{joinUrl}</p>
      </section>

      <section className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-extrabold">Players</h2>
          <span className={cx("text-sm font-semibold", canStart ? "text-gold" : "text-muted")} data-testid="player-count">
            {n}/{MAX_PLAYERS} · Need {MIN_PLAYERS}–{MAX_PLAYERS}
          </span>
        </div>
        <ul className="mt-2 flex flex-col gap-1.5" data-testid="lobby-players">
          {snap.members.map((m) => (
            <li key={m.id} className="anim-fade-up flex min-h-12 items-center gap-2 rounded-md border border-line bg-surface px-3">
              <span className={cx("h-2.5 w-2.5 rounded-full", m.connected ? "bg-[#4caf50]" : "bg-fas")} title={m.connected ? "Connected" : "Disconnected"} />
              <span className="flex-1 truncate font-semibold">
                {m.name}
                {m.id === snap.meId && <span className="text-muted"> (you)</span>}
              </span>
              {m.id === snap.hostId && <Crown className="h-5 w-5 text-gold" title="Host" />}
              {isHost && m.id !== snap.meId && (
                <button className="min-h-11 rounded px-2 text-sm text-fas-ink" onClick={() => run({ op: "kick", playerId: m.id })} data-testid={`kick-${m.name}`}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="anim-shake mt-3 text-center text-sm text-fas-ink">{error}</p>}

      <section className="mt-4 flex flex-col gap-2">
        {isHost ? (
          <>
            <label className="flex min-h-12 items-center justify-between rounded-md border border-line px-3">
              <span>Show full history at game end</span>
              <input
                type="checkbox"
                className="h-6 w-6 accent-[var(--gold)]"
                checked={snap.settings.showHistory}
                onChange={(e) => run({ op: "settings", settings: { showHistory: e.target.checked } })}
              />
            </label>
            <Button size="lg" disabled={!canStart} onClick={() => run({ op: "start" })} data-testid="start-game">
              {canStart ? `Start game · ${n} players` : `Waiting for ${Math.max(0, MIN_PLAYERS - n)} more`}
            </Button>
            {snap.botsAllowed && (
              <div className="rounded-md border border-dashed border-line p-3">
                <div className="font-type text-xs tracking-widest text-muted">DEV MODE · BOT PLAYERS</div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[1, 5, 10, 12].map((target, i) => (
                    <Button
                      key={target}
                      variant="ghost"
                      className="px-1 text-base"
                      disabled={n >= (i === 0 ? MAX_PLAYERS : target)}
                      onClick={() => run({ op: "addBots", count: i === 0 ? 1 : target - n })}
                      data-testid={`bots-${i === 0 ? "add" : target}`}
                    >
                      {i === 0 ? "+1" : `→${target}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="py-3 text-center text-muted">Waiting for the host to start the game…</p>
        )}
        <div className="flex gap-2">
          <Link href={`/table/${snap.code}`} target="_blank" className="flex-1">
            <Button variant="ghost" className="w-full text-base" tabIndex={-1}>
              Table screen
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="flex-1 text-base"
            onClick={async () => {
              if (!confirm("Leave this room?")) return;
              await op(snap.code, { op: "leave" });
              storage(tokenKey(snap.code), null);
              location.href = "/";
            }}
          >
            Leave
          </Button>
        </div>
      </section>
      <div className="flex-1" />
      <Footer />
      <Sheet open={rules} onClose={() => setRules(false)} title="Rules">
        <div className="px-4">
          <RulesContent />
        </div>
      </Sheet>
    </div>
  );
}

function NameGate({ code, join, error }: { code: string; join: (name: string) => Promise<string | null>; error: string | null }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(storage("sh:name") ?? ""), []);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="font-type text-center text-xs tracking-[0.3em] text-muted">ROOM</div>
      <div className="font-display text-center text-7xl font-black tracking-[0.2em] text-gold">{code}</div>
      <form
        className="card-surface mt-6 flex flex-col gap-3 rounded-xl p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(await join(name));
          setBusy(false);
        }}
      >
        <label htmlFor="gname" className="font-display text-lg font-bold text-muted">
          Your nickname
        </label>
        <input
          id="gname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          className="min-h-12 rounded-md border border-line bg-bg px-3 text-lg outline-none focus:border-gold"
          data-testid="gate-name"
        />
        <Button size="lg" type="submit" disabled={!name.trim() || busy} data-testid="gate-join">
          Join room
        </Button>
        {(err || error) && <p className="text-sm text-fas-ink">{err || error}</p>}
      </form>
      <Link href="/" className="mt-4 min-h-12 py-3 text-center text-muted">
        ‹ Home
      </Link>
    </div>
  );
}

export function RoomClient({ code }: { code: string }) {
  const { snap, offline, error, needsName, left, joinWithName } = useRoom(code, "player");

  if (left)
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-4xl font-black">You&apos;re not in this room</h1>
        <p className="mt-2 text-muted">You left, were removed by the host, or the room closed.</p>
        <Link href="/" className="mt-6">
          <Button size="lg">Home</Button>
        </Link>
      </div>
    );
  if (error && !snap)
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-4xl font-black">{error}</h1>
        <p className="mt-2 text-muted">Rooms close after a few hours without activity.</p>
        <Link href="/" className="mt-6">
          <Button size="lg">Home</Button>
        </Link>
      </div>
    );
  if (needsName && !snap) return <NameGate code={code} join={joinWithName} error={error} />;
  if (!snap)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-display animate-pulse text-2xl text-muted">{offline ? "Reconnecting…" : "Entering the chamber…"}</p>
      </div>
    );
  if (snap.view) return <GameScreen snap={snap} reconnecting={offline} />;
  return <Lobby snap={snap} offline={offline} />;
}
