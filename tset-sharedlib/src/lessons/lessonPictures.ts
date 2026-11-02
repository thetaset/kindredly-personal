// Pictures for Kindredly's built-in lessons (HAT-534, DCL-15, HAT-580). Each one is an SVG drawn in
// code (the kit is ./pictures/kit.ts, the pictures one file per pack beside it). A picture travels in
// the lesson as a data: URL, so it shows offline and on every platform with no file to fetch, and an
// SVG inside <img> cannot run script. A picture is drawn the first time it is shown, not at start.

import type { LessonMediaRef } from "../lesson.utils";
import { PICTURES_4_TO_7 } from "./pictures/ages4to7";
import { PICTURES_8_TO_10 } from "./pictures/ages8to10";
import { PICTURES_11_TO_13 } from "./pictures/ages11to13";
import { PICTURES_14_TO_17 } from "./pictures/ages14to17";

const PICTURES = {
  ...PICTURES_4_TO_7,
  ...PICTURES_8_TO_10,
  ...PICTURES_11_TO_13,
  ...PICTURES_14_TO_17,
};

export type LessonPictureKey = keyof typeof PICTURES;

export const LESSON_PICTURE_KEYS = Object.keys(PICTURES) as LessonPictureKey[];

/** The picture's SVG text, for tests and for looking at a drawing. */
export function lessonPictureSvg(key: LessonPictureKey): string {
  return PICTURES[key].svg();
}

/**
 * The SVG as a data: URL. Quotes become apostrophes and only the characters a URL cannot hold are
 * escaped, which keeps it about a third smaller than base64.
 */
export function svgDataUrl(svg: string): string {
  return (
    "data:image/svg+xml," +
    svg
      .replace(/"/g, "'")
      .replace(/[\r\n%#{}<>]/g, (c) => encodeURIComponent(c))
  );
}

/**
 * A lesson media entry for one picture. Its alt is read aloud, not printed under it. The address is
 * worked out when it is first read, so a lesson's pictures are drawn only when it is shown.
 */
export function lessonPicture(key: LessonPictureKey): LessonMediaRef {
  const entry = PICTURES[key];
  let url: string | null = null;
  return {
    kind: "image",
    get externalUrl() {
      return (url ??= svgDataUrl(entry.svg()));
    },
    alt: entry.alt,
    hideCaption: true,
  };
}
