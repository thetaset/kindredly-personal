/**
 * Device folders (HAT-1321, docs/proposals/device-folders.md): a folder on a computer running the
 * Companion, shared with the family or chosen people. Experimental, and Plus only.
 *
 * The server carries sealed frames between a member's app and the host Companion and reads none of
 * them; the sealing is in `tset-electron/src/deviceFolder/folderFrames.ts`.
 */

export type DeviceFolderRole = 'manage' | 'add' | 'view';

/** What crosses the server, either way. `ct` is AES-256-GCM with the tag appended, base64. */
export type DeviceFolderSealedFrame = { folderId: string; userId: string; iv: string; ct: string };

/** A folder as a person who may open it sees it. */
export type DeviceFolderView = {
  _id: string;
  name: string;
  hostDeviceId: string;
  /** The computer's name, e.g. "Family Mac", or null when its Companion did not say. */
  hostName: string | null;
  role: DeviceFolderRole;
  uploadsAllowed: boolean;
  /** The host's Companion holds its stream now. */
  online: boolean;
  /**
   * The folder key, sealed by the host to this person's public key (`DeviceFolderWrappedKey` as
   * JSON), or null while the host has not delivered it yet.
   */
  wrappedKey: string | null;
};

/**
 * A folder key sealed to one person. `wrappedKey` is RSA-OAEP (SHA-256) over the key as a JWK in
 * JSON, base64 — the same form the client's own `CryptoUtils.wrapKey` produces, so the person's
 * private key opens it as it opens any key wrapped to them.
 */
export type DeviceFolderWrappedKey = {
  v: 1;
  alg: 'RSA-OAEP-256';
  wrappedKey: string;
  /** Names which folder key this is a copy of (SHA-256, 16 hex), so the host can tell an old copy. */
  keyId?: string;
};

/** A folder as its host serves it: everyone who may open it, with their role. */
export type DeviceFolderHostView = {
  _id: string;
  name: string;
  uploadsAllowed: boolean;
  members: Array<{
    userId: string;
    /** Their name in the family, for the folder their uploads land in (`Uploads from <name>/`). */
    name: string;
    role: DeviceFolderRole;
    /** The person's public key as a JWK string, or null when they have none yet. */
    publicKey: string | null;
    /** The server already holds this person's sealed copy of the folder key. */
    hasKey: boolean;
    /** Which key that copy holds (`DeviceFolderWrappedKey.keyId`), or null for none or unknown. */
    keyId: string | null;
  }>;
};

export type DeviceFolderShareRequest = {
  /** The guardian's approval, typed at this computer (`/auth/desktopCompanionAuthorize`). */
  approval: string;
  name: string;
  /** Set when the whole family may open it. */
  wholeFamilyRole?: 'view' | 'add' | null;
  uploadsAllowed?: boolean;
  members?: Array<{ userId: string; role: DeviceFolderRole }>;
};

/** Someone a folder can be shared with, for the Companion's people picker. */
export type DeviceFolderPerson = { userId: string; name: string; child: boolean };

/** Who a folder is shared with now: the whole family's role, or named people, and uploads. */
export type DeviceFolderSharing = {
  wholeFamilyRole: 'view' | 'add' | null;
  uploadsAllowed: boolean;
  members: Array<{ userId: string; role: DeviceFolderRole }>;
};

/** A change to a shared folder, made at its computer with the same approval as sharing it. */
export type DeviceFolderUpdateRequest = {
  approval: string;
  folderId: string;
  wholeFamilyRole?: 'view' | 'add' | null;
  uploadsAllowed?: boolean;
  members?: Array<{ userId: string; role: DeviceFolderRole }>;
};

/** Why the server refused. */
export type DeviceFolderRefusalReason =
  | 'not_plus'
  | 'no_approval'
  | 'bad_request'
  | 'too_many'
  | 'not_found'
  | 'not_allowed'
  | 'offline'
  | 'timeout'
  | 'too_large'
  /** The host would not open the frame: a removed member, or a replayed or unreadable frame. */
  | 'host_refused'
  /** The host refused the frame as too old: this device's clock and the host's disagree (HAT-1373). */
  | 'stale_frame';

/** One frame the server wrote to the host's stream. */
export type DeviceFolderStreamFrame = { frameId: string; replyTo: string; sealed: DeviceFolderSealedFrame };

/** A folder as the app's own pages see it: the sealed key stays in the background. */
export type DeviceFolderListItem = Omit<DeviceFolderView, 'wrappedKey'> & {
  /**
   * `ready`: this device holds the folder key. `waiting`: the computer has not sealed one for this
   * person yet (it does when its Companion next reads the list). `locked`: a copy is here but this
   * device's own keys could not open it.
   */
  keyState: 'ready' | 'waiting' | 'locked';
};

/** One file in a folder, as the host lists it. */
export type DeviceFolderEntry = {
  relPath: string;
  name: string;
  sizeBytes: number;
  modifiedMs: number;
  kind: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
};

/** Why a search has no list to show. */
export type DeviceFolderSearchRefusal =
  | DeviceFolderRefusalReason
  | 'indexing'
  | 'index_failed'
  | 'no_key'
  | 'unreachable'
  /** The folder inside the shared one is no longer there on the computer (HAT-1373). */
  | 'dir_missing';

/** How a folder's listing is ordered (HAT-1347); folders come first in each. */
export type DeviceFolderSort = 'name' | 'newest' | 'oldest' | 'largest' | 'type';

/** A folder inside a shared one, with how many files are anywhere under it (HAT-1338). */
export type DeviceFolderDir = { relPath: string; name: string; files: number };

export type DeviceFolderSearchResult =
  | { ok: true; items: DeviceFolderEntry[]; total: number; truncated: boolean; folders: DeviceFolderDir[] }
  | { ok: false; reason: DeviceFolderSearchRefusal };

/** A STUN or TURN server for a direct connection, as browsers take it (HAT-1321). */
export type DeviceFolderIceServer = { urls: string[]; username?: string; credential?: string };

/**
 * Whether a connection may fall back to Cloudflare's TURN when two devices can't connect directly:
 * `on`, `off` (not set up, or this person's use couldn't be read), or `used_up` (this month's allowance).
 */
export type DeviceFolderRelayState = 'on' | 'off' | 'used_up';
