export const DEFAULT_MAX_PER_PAGE = 200;

// Client-supplied perPage values reach `.limit()` in several list services.
// Unclamped, a single request can materialize an entire table into heap
// (see docs/reports/server-memory-audit-2026-08-11.md, finding 2i).
export function clampPerPage(perPage: unknown, defaultValue: number, max: number = DEFAULT_MAX_PER_PAGE): number {
  const n = Math.trunc(Number(perPage));
  if (!Number.isFinite(n) || n < 1) return Math.min(defaultValue, max);
  return Math.min(n, max);
}

// Postgres walks (and discards) every row an OFFSET skips, so an unbounded
// client-supplied offset is a full-table-scan primitive even with a clamped
// limit. High enough that no real pagination sweep hits it.
export const DEFAULT_MAX_OFFSET = 100_000;

export function clampOffset(offset: unknown, max: number = DEFAULT_MAX_OFFSET): number {
  const n = Math.trunc(Number(offset));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}
