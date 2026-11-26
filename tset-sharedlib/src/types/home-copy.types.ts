/**
 * The Home copy: what the web app hands the native Home so it can draw before the web view is up.
 *
 * ONE definition, three consumers — the web app builds it (`tset-client/src/app/nativeHomeCopy.ts`),
 * the iPhone app reads it from Application Support (`HomeCopyStore.swift`), and the Android app from
 * `filesDir` (`HomeCopyStore.kt`). The three used to be the same JSON written three times by hand,
 * which is the drift `desktop-status.types.ts` was created to stop.
 *
 * What it carries is what must be on the screen at the first frame: the person, the theme and
 * wallpaper, the chips, Quickbar, every pinned item and Recent (decision 9). The audio card and the
 * restrictions status change while the app runs and are sent live instead (`nativeHomeLive.ts`).
 *
 * Pictures are named, not embedded. `wallpaper.image` and `pinned[].thumb` are file names written
 * beside the copy; a null means draw the colour or the type icon instead. Nothing here is encrypted:
 * it never leaves the phone (tracker decision 5, 2026-11-13).
 */

export const HOME_COPY_VERSION = 1;

/** The copy's file name in app-private storage. */
export const HOME_COPY_FILE = "home-copy.json";

/** The wallpaper image beside it, when there is one. */
export const HOME_COPY_WALLPAPER_FILE = "home-wallpaper.jpg";

/**
 * How many chips, pinned items and Recent items the copy carries. Chips: every shortcut Home can
 * show (14 today), with room to spare; at 8, Home's shortcuts past the eighth were missing.
 */
export const HOME_COPY_MAX_CHIPS = 24;
export const HOME_COPY_MAX_PINNED = 30;
export const HOME_COPY_MAX_RECENT = 12;
export const HOME_COPY_MAX_QUICKBAR = 12;

export type HomeCopyWallpaperTone = "dark" | "mid" | "light" | "none";

export type HomeCopyChip = {
  id: string;
  label: string;
  /** The shortcut's Bootstrap icon name (`sticky`, `calendar3`), for a shortcut with no drawing. */
  icon: string;
  /**
   * The shortcut's drawing (`notepad`), as Home's tile shows it (HAT-483). The phones carry each one
   * as a picture (`scripts/renderHomeArt.ts`); null when it has none, and the icon is shown.
   */
  drawing: string | null;
  /** Where it goes, as an app route (`/notes`). Null when the chip runs an action instead. */
  to: string | null;
};

/** A pinned or Recent item. */
export type HomeCopyPinned = {
  id: string;
  title: string;
  /** The item type's Bootstrap icon name (`folder`, `link-45deg`), drawn on the picture. */
  icon: string | null;
  to: string | null;
  /** A file name beside the copy, or null for no picture. */
  thumb: string | null;
};

export type HomeCopy = {
  v: typeof HOME_COPY_VERSION;
  /** Whose Home this is. A copy for someone else is never drawn. */
  userId: string;
  isChild: boolean;
  /**
   * Whether the phone draws its own Home from this copy: the off switch. On in a phone's layout,
   * off in a tablet's (`isNativeHomeOn`, HAT-1136).
   */
  nativeHome: boolean;
  theme: "light" | "dark";
  bigAndSimple: boolean;
  /** "Search or ask" when Kinbot can take what is typed, "Search" otherwise. */
  searchPlaceholder: string;
  /** Kinbot can take what is typed: the field offers Ask Kinbot (HAT-1128). */
  canAsk: boolean;
  /**
   * `tone` is how bright the picture is, as Home.vue measures it (`wallpaperTone.ts`), so the glass
   * over it takes the same tint; "none" when there is no picture.
   */
  wallpaper: { color: string; image: string | null; tone: HomeCopyWallpaperTone };
  chips: HomeCopyChip[];
  pinned: HomeCopyPinned[];
  /** The library items used last, as Home's Recent row has them; empty when Recent is off. */
  recent: HomeCopyPinned[];
  /** Quickbar's items and the collection that holds them; null when Home shows no Quickbar. */
  quickbar: { collectionId: string | null; items: HomeCopyPinned[] } | null;
  /** When the web app wrote it, ms since the epoch. */
  savedAt: number;
};

/** The image file name for a pinned or Recent item's picture. Kept out of the item id's own characters. */
export function homeCopyPinnedThumbFile(itemId: string): string {
  const safe = itemId.replace(/[^A-Za-z0-9_-]/g, "");
  return `home-pinned-${safe || "item"}.jpg`;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function route(value: unknown): string | null {
  const to = text(value, 300);
  return to && to.startsWith("/") ? to : null;
}

/**
 * Read a copy off disk, or null when there is nothing usable there.
 *
 * Strict about the version and the person, forgiving about everything else: a copy written by a
 * newer web app, or one with a field missing, must draw nothing rather than half a Home.
 */
export function normalizeHomeCopy(raw: unknown): HomeCopy | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, any>;
  if (input.v !== HOME_COPY_VERSION) return null;
  const userId = text(input.userId, 100);
  if (!userId) return null;

  const chips: HomeCopyChip[] = [];
  for (const chip of Array.isArray(input.chips) ? input.chips : []) {
    if (chips.length >= HOME_COPY_MAX_CHIPS) break;
    const id = text(chip?.id, 60);
    const label = text(chip?.label, 40);
    if (!id || !label) continue;
    chips.push({ id, label, icon: text(chip?.icon, 60), drawing: text(chip?.drawing, 60) || null, to: route(chip?.to) });
  }

  const items = (list: unknown, max: number): HomeCopyPinned[] => {
    const out: HomeCopyPinned[] = [];
    for (const item of Array.isArray(list) ? list : []) {
      if (out.length >= max) break;
      const id = text(item?.id, 60);
      const title = text(item?.title, 120);
      if (!id || !title) continue;
      out.push({
        id,
        title,
        icon: text(item?.icon, 60) || null,
        to: route(item?.to),
        thumb: text(item?.thumb, 120) || null,
      });
    }
    return out;
  };
  const pinned = items(input.pinned, HOME_COPY_MAX_PINNED);
  const recent = items(input.recent, HOME_COPY_MAX_RECENT);
  const quickbarItems = items(input.quickbar?.items, HOME_COPY_MAX_QUICKBAR);
  const quickbar = quickbarItems.length
    ? { collectionId: text(input.quickbar?.collectionId, 100) || null, items: quickbarItems }
    : null;

  return {
    v: HOME_COPY_VERSION,
    userId,
    isChild: input.isChild === true,
    nativeHome: input.nativeHome === true,
    theme: input.theme === "dark" ? "dark" : "light",
    bigAndSimple: input.bigAndSimple === true,
    searchPlaceholder: text(input.searchPlaceholder, 40) || "Search",
    canAsk: input.canAsk === true,
    wallpaper: {
      color: text(input.wallpaper?.color, 40),
      image: text(input.wallpaper?.image, 120) || null,
      tone: (["dark", "mid", "light"] as const).find((tone) => tone === input.wallpaper?.tone) ?? "none",
    },
    chips,
    pinned,
    recent,
    quickbar,
    savedAt: typeof input.savedAt === "number" && Number.isFinite(input.savedAt) ? input.savedAt : 0,
  };
}
