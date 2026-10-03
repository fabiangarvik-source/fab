import Link from "next/link";
import { RulesContent } from "@/client/Rules";
import { Footer } from "@/client/ui";

export const metadata = { title: "Rules · Secret Hitler" };

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link href="/" className="inline-block min-h-12 py-3 text-muted">
        ‹ Home
      </Link>
      <h1 className="font-display text-5xl font-black">How to play</h1>
      <div className="deco-rule my-3 w-32" />
      <RulesContent />
      <Footer />
    </div>
  );
}
