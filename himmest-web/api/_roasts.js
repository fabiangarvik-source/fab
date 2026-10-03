/* Hand-written roast lines, used when no Claude API key is set (or Claude declines). */
export const TEMPLATES = {
  nom: [
    "{name} is not on trial. {name} is the evidence.",
    "Somewhere a golden retriever just felt smarter than {name}.",
    "{name} had one brain cell today and it called in sick.",
    "Honestly? {name} looked at this charge and said \"fair.\"",
    "{name}'s brain is running on airplane mode.",
    "The prosecution rests. So does {name}'s last thought.",
    "{name} didn't just do it. {name} committed to the bit with zero awareness.",
    "If confidence was IQ, {name} would be a genius. Tragic.",
    "Scientists are studying {name}. Not in a good way.",
    "{name} out here playing life on easy mode and still losing.",
    "Even autocorrect couldn't fix {name}'s decisions today.",
    "{name} is the reason shampoo has instructions.",
  ],
  moment: [
    "This photo should be in a museum. The Museum of Bad Decisions.",
    "{name} has the energy of a dog that just saw a door open.",
    "Frame this. Show it at {name}'s wedding.",
    "Zoom in. You can see the thought leaving {name}'s head.",
    "{name} woke up and chose chaos. Chaos said \"no thanks.\"",
    "Caught in 4K. No lawyer can save {name} now.",
    "{name}'s mom is getting this one printed.",
    "This is {name}'s villain origin story, but dumber.",
    "Evidence exhibit A. And B. And C. It's all {name}.",
    "Somebody check on {name}. Actually, don't. This is funnier.",
  ],
  quote: [
    "{name} said this out loud. On purpose.",
    "Put it on a t-shirt. Sell it. Make {name} pay for the first one.",
    "Philosophers wept. Not because it was deep.",
    "{name} speaks fluent nonsense and we're all bilingual now.",
    "That's not a quote, that's a cry for help from {name}'s last brain cell.",
    "Socrates who? We have {name}.",
    "{name} thought about this for zero seconds and it shows.",
    "The words are English. The logic is not.",
  ],
  appeal: [
    "{name} is appealing? Bold move for someone with no defense.",
    "Objection: {name}'s whole personality.",
    "{name}'s lawyer just quit. Not even mad.",
    "This defense has the structural integrity of wet cardboard.",
    "{name} pleading innocent is the himmest thing {name} did today.",
  ],
  crown: [
    "All hail {name}, ruler of nothing, champion of vibes.",
    "{name} earned this crown the only way {name} knows how: by accident.",
    "The people have spoken, and they said {name}. Loudly.",
    "{name} is the Himmest. Nobody is surprised. Least of all {name}'s teachers.",
    "Crown fits perfectly. It's the only thing in {name}'s head.",
    "History will remember this day. {name} will forget it by lunch.",
  ],
  week: [
    "Another week, another collective IQ drop. Proud of you, boys.",
    "This week's highlights would get you all banned from a library.",
    "Seven days. Zero thoughts. Incredible consistency.",
    "If this group chat was a company, it would be bankrupt and somehow on fire.",
    "Scientists say brains peak at 25. You all peaked early.",
  ],
};

export function templateRoast(kind, ctx, seed) {
  const pool = TEMPLATES[kind] || TEMPLATES.nom;
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length].replaceAll("{name}", (ctx && ctx.name) || "This guy");
}
