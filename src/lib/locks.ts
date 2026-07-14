/**
 * Minimal per-key async mutex. Calls with the same key run strictly one
 * after another; different keys run independently.
 */
const chains = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  // Park a settled-safe tail so one failure doesn't poison the queue.
  chains.set(key, run.catch(() => undefined));
  return run;
}
