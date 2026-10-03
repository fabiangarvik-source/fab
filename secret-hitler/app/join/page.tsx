"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JoinForm } from "@/client/JoinForm";
import { Footer } from "@/client/ui";

export default function JoinPage() {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => setCode(new URLSearchParams(location.search).get("code")?.toUpperCase() ?? ""), []);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link href="/" className="min-h-12 py-3 text-muted">
        ‹ Back
      </Link>
      <h1 className="font-display mb-4 text-5xl font-black">Join a room</h1>
      {code !== null && <JoinForm initialCode={code} />}
      <div className="flex-1" />
      <Footer />
    </div>
  );
}
