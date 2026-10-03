"use client";

import { useEffect, useRef, useState } from "react";
import { NAMES } from "../engine/config";
import type { Party, Policy, Role } from "../engine/types";
import { Dove, Serpent, Skull } from "./icons";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "lib" | "fas";
  size?: "md" | "lg";
};

export function Button({ variant = "primary", size = "md", className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        "font-display inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 font-extrabold transition active:translate-y-px disabled:opacity-40 disabled:active:translate-y-0",
        size === "lg" ? "min-h-14 text-2xl" : "text-xl",
        variant === "primary" && "bg-gold text-[#15120e] shadow-[0_3px_0_rgb(0_0_0/0.35)]",
        variant === "ghost" && "border border-line bg-transparent text-ink",
        variant === "danger" && "bg-fas text-white shadow-[0_3px_0_rgb(0_0_0/0.35)]",
        variant === "lib" && "bg-lib text-white shadow-[0_3px_0_rgb(0_0_0/0.35)]",
        variant === "fas" && "bg-fas text-white shadow-[0_3px_0_rgb(0_0_0/0.35)]",
        className,
      )}
    />
  );
}

export function PartyIcon({ party, className }: { party: Party | Role; className?: string }) {
  if (party === "hitler") return <Skull className={className} />;
  if (party === "fascist") return <Serpent className={className} />;
  return <Dove className={className} />;
}

/** A policy tile. Text + icon so colour is never the only signal. */
export function PolicyCard({
  policy,
  faceDown,
  selected,
  label,
  className,
  onClick,
  small,
}: {
  policy?: Policy;
  faceDown?: boolean;
  selected?: boolean;
  label?: string;
  className?: string;
  onClick?: () => void;
  small?: boolean;
}) {
  const lib = policy === "L";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      data-testid={label ? `card-${label}` : undefined}
      className={cx(
        "no-select relative flex flex-col items-center justify-center rounded-md border-2 font-display",
        small ? "h-16 w-12 text-[10px]" : "h-36 w-24 text-sm sm:h-40 sm:w-28",
        faceDown
          ? "border-line bg-surface-2 text-muted [background-image:repeating-linear-gradient(45deg,transparent_0_6px,rgb(255_255_255/0.035)_6px_12px)]"
          : lib
            ? "anim-flip border-[#9cc3ec] bg-lib text-white"
            : "anim-flip border-[#f2a08f] bg-fas text-white",
        selected && "ring-4 ring-gold ring-offset-2 ring-offset-bg -translate-y-2",
        onClick && "transition",
        className,
      )}
    >
      {faceDown ? (
        <>
          <span className="text-3xl opacity-60">{label}</span>
          <span className="mt-1 text-[10px] tracking-widest opacity-60">POLICY</span>
        </>
      ) : (
        <>
          <PartyIcon party={lib ? "liberal" : "fascist"} className={small ? "h-6 w-6" : "h-12 w-12"} />
          <span className={cx("mt-1 font-extrabold", small ? "" : "text-base")}>{NAMES.policies[policy ?? "L"]}</span>
          {!small && <span className="text-[10px] tracking-[0.3em] opacity-80">ARTICLE</span>}
        </>
      )}
    </Tag>
  );
}

/**
 * Shows secret content only while the player presses and holds.
 * The content is not rendered at all otherwise.
 */
export function HoldToReveal({
  children,
  prompt = "Tap and hold to reveal",
  onReveal,
  testId,
  hint,
}: {
  children: React.ReactNode;
  prompt?: string;
  onReveal?: () => void;
  testId?: string;
  hint?: React.ReactNode;
}) {
  const [held, setHeld] = useState(false);
  const revealedOnce = useRef(false);
  const start = (e: React.PointerEvent | React.KeyboardEvent) => {
    if ("button" in e && e.button !== 0) return;
    setHeld(true);
    if (!revealedOnce.current) {
      revealedOnce.current = true;
      onReveal?.();
    }
  };
  const stop = () => setHeld(false);
  useEffect(() => {
    const hide = () => setHeld(false);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={testId}
      aria-label={prompt}
      className={cx(
        "no-select relative flex min-h-48 w-full touch-none flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center",
        held ? "border-gold bg-surface" : "border-line bg-surface-2",
      )}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && start(e)}
      onKeyUp={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {held ? (
        children
      ) : (
        <>
          <span className="font-type text-xs tracking-[0.3em] text-fas-ink">TOP SECRET</span>
          <span className="font-display mt-2 text-2xl font-extrabold">{prompt}</span>
          {hint && <span className="mt-2 text-sm text-muted">{hint}</span>}
        </>
      )}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="anim-fade-up card-surface flex max-h-[88dvh] flex-col rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-2xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="min-h-12 min-w-12 text-3xl text-muted" aria-label="Close">
            ×
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

export function Banner({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" | "error" }) {
  return (
    <div
      className={cx(
        "px-4 py-2 text-center text-sm font-semibold",
        tone === "warn" && "bg-gold text-[#15120e]",
        tone === "error" && "bg-fas text-white",
        tone === "info" && "bg-surface-2 text-ink",
      )}
    >
      {children}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="px-4 py-6 text-center text-xs leading-relaxed text-muted">
      Based on <em>Secret Hitler</em> by Max Temkin, Mike Boxleiter and Tommy Maranges, published by Goat, Wolf &amp; Cabbage. Used under{" "}
      <a className="underline" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-NC-SA 4.0
      </a>
      . Fan-made, non-commercial, original artwork.
    </footer>
  );
}
