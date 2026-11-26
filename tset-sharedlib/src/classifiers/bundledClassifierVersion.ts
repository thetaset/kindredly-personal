import type {ClassifierVersion} from './classifierVersion';
import {classifierVersionV1} from './classifierVersionV1';

/**
 * The classifier version every app ships with, and falls back to when it can't reach the server or
 * the server's active version doesn't fit (CLS-2). Written by `npm run classify:bundle` (CLS-8),
 * which copies the server's active version here before a release; never edit it by hand.
 */
export const bundledClassifierVersion: ClassifierVersion = classifierVersionV1;
