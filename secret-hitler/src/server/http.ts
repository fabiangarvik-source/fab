// Wraps a route handler so unexpected failures (e.g. no database configured)
// reach the player as a readable message instead of a bare 500.
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error && e.message.startsWith("DATABASE_URL") ? e.message : "Server error, try again";
      return Response.json({ ok: false, error: msg }, { status: 503, headers: { "cache-control": "no-store" } });
    }
  };
}
