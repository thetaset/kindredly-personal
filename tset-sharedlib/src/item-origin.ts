/**
 * Where an item came from: which AI app or Kinbot chat added it, what the person asked, and whether
 * an AI wrote its content (HAT-973, docs/trackers/ai-made-items-tracker.md).
 *
 * Kept in `info.schemas[ITEM_ORIGIN_SCHEMA_ID]`, inside the item's encrypted `info`; the server never
 * reads it. Shown only in the item's Details, never on a tile or a row.
 */
import type { ItemDetailsInfo } from './types/item.types';

export const ITEM_ORIGIN_SCHEMA_ID = 'kindredly.origin.v1';

/** Who wrote the content. `unknown` is a link an AI saved to someone else's page. */
export type ItemOriginContent = 'ai' | 'person' | 'unknown';

export type ItemOriginAddedBy = 'ai-app' | 'kinbot' | 'app-builder' | 'person';

export interface ItemOriginV1 {
  schemaVersion: 1;
  content: ItemOriginContent;
  addedBy: ItemOriginAddedBy;
  /** From the connection or the chat, never from a tool call's arguments. */
  appName?: string;
  appVersion?: string;
  connectionId?: string;
  kinbotSessionId?: string;
  /** What the person asked, as the AI app reports it. */
  request?: string;
  createdAt: string;
  /** People who changed the content since; one entry per person, their latest change. */
  editedBy?: Array<{ userId: string; at: string }>;
}

const CONTENT: readonly ItemOriginContent[] = ['ai', 'person', 'unknown'];
const ADDED_BY: readonly ItemOriginAddedBy[] = ['ai-app', 'kinbot', 'app-builder', 'person'];

export const ORIGIN_TEXT_MAX = 500;
const ORIGIN_NAME_MAX = 100;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** A well-formed record from anything, or null. Drops unknown fields and over-long text. */
export function normalizeItemOrigin(raw: unknown): ItemOriginV1 | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.schemaVersion !== 1) return null;
  if (!CONTENT.includes(r.content as ItemOriginContent)) return null;
  if (!ADDED_BY.includes(r.addedBy as ItemOriginAddedBy)) return null;
  const createdAt = text(r.createdAt, 40);
  if (!createdAt) return null;

  const origin: ItemOriginV1 = {
    schemaVersion: 1,
    content: r.content as ItemOriginContent,
    addedBy: r.addedBy as ItemOriginAddedBy,
    createdAt,
  };
  const appName = text(r.appName, ORIGIN_NAME_MAX);
  if (appName) origin.appName = appName;
  const appVersion = text(r.appVersion, 40);
  if (appVersion) origin.appVersion = appVersion;
  const connectionId = text(r.connectionId, ORIGIN_NAME_MAX);
  if (connectionId) origin.connectionId = connectionId;
  const kinbotSessionId = text(r.kinbotSessionId, ORIGIN_NAME_MAX);
  if (kinbotSessionId) origin.kinbotSessionId = kinbotSessionId;
  const request = text(r.request, ORIGIN_TEXT_MAX);
  if (request) origin.request = request;
  if (Array.isArray(r.editedBy)) {
    const editedBy = r.editedBy
      .map((e: any) => ({ userId: text(e?.userId, ORIGIN_NAME_MAX), at: text(e?.at, 40) }))
      .filter((e): e is { userId: string; at: string } => !!e.userId && !!e.at);
    if (editedBy.length) origin.editedBy = editedBy;
  }
  return origin;
}

export function getItemOrigin(source: {
  info?: ItemDetailsInfo | null;
  details?: { info?: ItemDetailsInfo | null } | null;
} | null | undefined): ItemOriginV1 | null {
  const raw =
    source?.info?.schemas?.[ITEM_ORIGIN_SCHEMA_ID] ||
    source?.details?.info?.schemas?.[ITEM_ORIGIN_SCHEMA_ID];
  return normalizeItemOrigin(raw);
}

/** An AI wrote the content, whether or not a person edited it since. */
export function isAiMade(source: Parameters<typeof getItemOrigin>[0]): boolean {
  return getItemOrigin(source)?.content === 'ai';
}

export function setItemOriginOnInfo(
  info: ItemDetailsInfo | null | undefined,
  origin: ItemOriginV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas) ? info.schemas : {};
  return { ...(info || {}), schemas: { ...schemas, [ITEM_ORIGIN_SCHEMA_ID]: origin } };
}

/**
 * Records a person's change to an AI-made item's content. Returns the same record when there is
 * nothing to record: no origin, content an AI did not write, or no user.
 */
export function withOriginEditor(
  origin: ItemOriginV1 | null,
  userId: string | null | undefined,
  at: string,
): ItemOriginV1 | null {
  if (!origin || origin.content !== 'ai' || !userId) return origin;
  const others = (origin.editedBy || []).filter((e) => e.userId !== userId);
  return { ...origin, editedBy: [...others, { userId, at }] };
}
