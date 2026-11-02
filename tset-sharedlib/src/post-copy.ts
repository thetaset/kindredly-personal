/**
 * A friend's own copy of something shared in a post (HAT-984).
 *
 * Within a family a post shares the one item. Someone in another family gets a copy of it instead,
 * owned by them and kept out of their library until they add it. The copy's id comes from who it is
 * for, the post and the attachment, so a second device, or the same post shown again, finds the
 * copy already made instead of making another. The server works the id out from the signed-in
 * person; a client never chooses it.
 */

/** cyrb53: a fast 53-bit string hash. Two seeds make the 106 bits an id needs. */
function cyrb53(text: string, seed: number): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** The attachment's own key in its post: the link's bundle id, else the item id it carries. */
export function postAttachmentCopyKey(attachment: any): string {
  const key = attachment?.bundleId ?? attachment?.itemId ?? '';
  return typeof key === 'string' ? key.trim() : '';
}

export function isPostCopyItemId(itemId: unknown): boolean {
  return typeof itemId === 'string' && itemId.startsWith('item_pc_');
}

/** The id of `userId`'s copy of the attachment `key` in post `postId`. */
export function postCopyItemId(userId: string, postId: string, key: string): string {
  const text = `${userId}\u0000${postId}\u0000${key}`;
  return `item_pc_${cyrb53(text, 1)}${cyrb53(text, 2)}`;
}
