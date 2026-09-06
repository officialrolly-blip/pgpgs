/**
 * Runs a best-effort database cleanup (usually deleting a session row so a
 * login is revoked) with one automatic retry. Serverless Postgres providers
 * such as Neon occasionally fail with transient network errors
 * ("TypeError: fetch failed"); a single short retry removes most of them.
 *
 * Returns true when the cleanup succeeded. Callers should treat `false` as
 * "cleanup will happen when the session expires" and continue gracefully —
 * e.g. still clearing the session cookie so the user is logged out.
 */
export async function bestEffortDbCleanup(run: () => Promise<unknown>): Promise<boolean> {
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await run();
      return true;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        console.error("Database cleanup failed after retry:", error);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return false;
}