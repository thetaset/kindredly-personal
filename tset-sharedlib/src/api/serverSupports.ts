/**
 * What this server's code accepts beyond the original routes.
 *
 * `/user/current` lists these as `serverSupports`, so a newer app talking to an older server — a
 * family's own box runs its own version — sends a new field only where it is understood. An older
 * server would ignore the field and do the old thing: make its own id for a new item, or save an
 * update without checking whether the item changed.
 */
export const SERVER_SUPPORTS = [
  /** `/item/save` and `/collection/create` take `newItemId` (OFS-1). */
  'item.newItemId',
  /** `/item/update` takes `ifUpdatedAt` and answers `updatedAt` (OFS-2). */
  'item.ifUpdatedAt',
] as const;

export type ServerSupport = (typeof SERVER_SUPPORTS)[number];
