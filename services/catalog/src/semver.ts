/** Compare two semver strings (`a.b.c`). Returns >0 when `a` is newer. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Pick the highest-semver unit from a list, or undefined if empty. */
export function latestBySemver<T extends { version: string }>(units: T[]): T | undefined {
  if (units.length === 0) return undefined;
  return [...units].sort((a, b) => compareSemver(b.version, a.version))[0];
}
