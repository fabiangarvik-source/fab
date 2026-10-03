"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CODE_ALPHABET } from "../protocol";
import { joinRoom, storage, tokenKey } from "./api";
import { Button } from "./ui";

export function JoinForm({ initialCode = "", onJoined }: { initialCode?: string; onJoined?: (code: string) => void }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setName(storage("sh:name") ?? ""), []);

  const clean = (s: string) =>
    s
      .toUpperCase()
      .split("")
      .filter((c) => CODE_ALPHABET.includes(c))
      .join("")
      .slice(0, 4);

  const join = async () => {
    setBusy(true);
    setError(null);
    const res = await joinRoom(code, name, storage(tokenKey(code)));
    setBusy(false);
    if (!res.ok) return setError(res.error === "offline" ? "You're offline." : res.error);
    storage(tokenKey(code), res.token);
    storage("sh:name", name.trim());
    if (onJoined) onJoined(code);
    else router.push(`/room/${code}`);
  };

  return (
    <form
      className="card-surface flex flex-col gap-3 rounded-xl p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void join();
      }}
    >
      <label className="font-display text-lg font-bold text-muted" htmlFor="code">
        Room code
      </label>
      <input
        id="code"
        value={code}
        onChange={(e) => setCode(clean(e.target.value))}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        placeholder="ABCD"
        className="font-display min-h-16 w-full rounded-md border border-line bg-bg px-3 text-center text-5xl font-black tracking-[0.4em] outline-none focus:border-gold"
        data-testid="join-code"
      />
      <label className="font-display text-lg font-bold text-muted" htmlFor="jname">
        Your nickname
      </label>
      <input
        id="jname"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={16}
        autoComplete="nickname"
        className="min-h-12 w-full rounded-md border border-line bg-bg px-3 text-lg outline-none focus:border-gold"
        data-testid="join-name"
      />
      <Button size="lg" type="submit" disabled={code.length !== 4 || !name.trim() || busy} data-testid="join-room">
        Join
      </Button>
      {error && <p className="text-sm text-fas-ink" data-testid="join-error">{error}</p>}
      <p className="text-center text-xs text-muted">Got a QR code? Just scan it with your phone camera.</p>
    </form>
  );
}

