export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Handy for deterministic tests. */
export function fixedClock(iso: string): Clock {
  return { now: () => new Date(iso) };
}
