"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createRoom, storage, tokenKey } from "@/client/api";
import { Dove, Serpent, Skull } from "@/client/icons";
import { Button, Footer } from "@/client/ui";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setName(storage("sh:name") ?? ""), []);

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await createRoom(name);
    setBusy(false);
    if (!res.ok) return setError(res.error === "offline" ? "You're offline." : res.error);
    storage(tokenKey(res.code), res.token);
    storage("sh:name", name.trim());
    router.push(`/room/${res.code}`);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mt-6 text-center">
        <div className="flex items-center justify-center gap-4 text-muted">
          <Dove className="h-8 w-8 text-lib-ink" />
          <Skull className="h-10 w-10 text-ink" />
          <Serpent className="h-8 w-8 text-fas-ink" />
        </div>
        <div className="deco-rule mx-auto mt-4 w-40" />
        <h1 className="font-display mt-3 text-6xl font-black leading-[0.9]">
          Secret
          <br />
          <span className="text-fas-ink">Hitler</span>
        </h1>
        <div className="deco-rule mx-auto mt-3 w-40" />
        <p className="font-type mt-4 text-sm tracking-widest text-muted">THE TABLE COMPANION · 5–12 PLAYERS</p>
      </header>

      <main className="mt-10 flex flex-col gap-4">
        <section className="card-surface rounded-xl p-4">
          <label htmlFor="name" className="font-display text-lg font-bold text-muted">
            Your nickname
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            autoComplete="nickname"
            placeholder="e.g. Alex"
            className="mt-1 min-h-12 w-full rounded-md border border-line bg-bg px-3 text-lg outline-none focus:border-gold"
            data-testid="home-name"
          />
          <Button size="lg" className="mt-3 w-full" disabled={!name.trim() || busy} onClick={create} data-testid="create-room">
            Create a room
          </Button>
          {error && <p className="mt-2 text-sm text-fas-ink">{error}</p>}
        </section>
        <Link href="/join" className="w-full">
          <Button size="lg" variant="ghost" className="w-full" tabIndex={-1}>
            Join a room
          </Button>
        </Link>
        <Link href="/solo" className="w-full" data-testid="play-solo">
          <Button size="lg" variant="ghost" className="w-full" tabIndex={-1}>
            Play solo vs bots
          </Button>
        </Link>
        <Link href="/rules" className="w-full">
          <Button variant="ghost" className="w-full" tabIndex={-1}>
            How to play
          </Button>
        </Link>
      </main>
      <div className="flex-1" />
      <Footer />
    </div>
  );
}
