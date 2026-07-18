/**
 * Minimal per-key async mutex. Calls with the same key run strictly one
 * after another; different keys run independently.
 */
const chains = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  // Park a settled-safe tail so one failure doesn't poison the queue.
  const tail = run.catch(() => undefined);
  chains.set(key, tail);
  // Evict the entry once this tail settles, unless a newer caller has already
  // queued behind it — otherwise `chains` grows without bound (one entry per
  // key forever, e.g. every SKU and every idempotency key).
  void tail.finally(() => {
    if (chains.get(key) === tail) chains.delete(key);
  });
  return run;
}
