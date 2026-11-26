import {createHash} from 'crypto';
import {bundledClassifierVersion} from 'tset-sharedlib/classifiers/bundledClassifierVersion';
import type {ClassifierVersion} from 'tset-sharedlib/classifiers/classifierVersion';
import {classifierVersionV1} from 'tset-sharedlib/classifiers/classifierVersionV1';
import type {ClassifierActiveVersion} from 'tset-sharedlib/api/api-types';

/**
 * A classifier version's hash is the sha256 hex of `JSON.stringify(version)`: the exact bytes the
 * server stores (CLS-3). An app that parses the document it downloads and stringifies it again gets
 * the same string, so it can check the hash the server named.
 *
 * Kept outside `services/_internal` because a self-hosted server, which has no versions of its own,
 * answers the device routes with its built-in ones through this file.
 */
export function classifierVersionJson(version: ClassifierVersion): string {
  return JSON.stringify(version);
}

export function classifierVersionHash(json: string): string {
  return createHash('sha256').update(json, 'utf8').digest('hex');
}

/**
 * The versions every server holds with no row: 'v1', which never changes, and the one this build
 * ships (`classify:bundle`, CLS-8), which is v1 until a release bundles another. An app whose
 * decisions name v1, or an admin going back to it, always finds it, on any server.
 */
const BUILT_IN: ReadonlyMap<string, ClassifierVersion> = new Map([
  [classifierVersionV1.id, classifierVersionV1],
  [bundledClassifierVersion.id, bundledClassifierVersion],
]);
const builtInActive = new Map<string, ClassifierActiveVersion>();

export function builtInClassifierVersion(id: unknown): ClassifierVersion | null {
  return (typeof id === 'string' && BUILT_IN.get(id)) || null;
}

/** The built-in versions, newest first. */
export function builtInClassifierVersions(): ClassifierVersion[] {
  return [...BUILT_IN.values()].reverse();
}

export function builtInClassifierActive(id: unknown): ClassifierActiveVersion | null {
  const version = builtInClassifierVersion(id);
  if (!version) return null;
  let active = builtInActive.get(version.id);
  if (!active) {
    active = {
      id: version.id,
      hash: classifierVersionHash(classifierVersionJson(version)),
      schema: version.schema,
      textModel: version.textModel,
    };
    builtInActive.set(version.id, active);
  }
  return active;
}

/** The version this build's apps ship with; active wherever nothing has been activated. */
export function bundledClassifierActive(): ClassifierActiveVersion {
  return builtInClassifierActive(bundledClassifierVersion.id)!;
}
