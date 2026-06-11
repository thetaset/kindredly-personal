import type { UserType } from './user.types';
import type { AccountType } from '../schemas/public/Account';

export type StandaloneAppRuntimeKind = 'bundled' | 'same_origin_hosted';

export type StandaloneAppDiscoverability = 'hidden' | 'listed';

export type StandaloneAppPublicInfo = {
  slug: string;
  title: string;
  summary?: string | null;
  canonicalPath: string;
  runtimeKind: StandaloneAppRuntimeKind;
  runtimeEntryPath?: string | null;
};

export type StandaloneAppManifest = StandaloneAppPublicInfo & {
  discoverability: StandaloneAppDiscoverability;
  requiresLogin: boolean;
  featureGate?: string | null;
  allowedRoles?: UserType[];
  allowedAccountTypes?: AccountType[];
  extensionEmbeddingAllowed?: boolean;
};

export type StandaloneAppCatalogEntry = StandaloneAppPublicInfo & {
  requiresLogin: boolean;
};

export type StandaloneAppBootstrapAllowed = {
  access: 'allowed';
  app: StandaloneAppManifest;
};

export type StandaloneAppBootstrapLoginRequired = {
  access: 'login_required';
  app: StandaloneAppPublicInfo;
  loginUrl: string;
  message: string;
};

export type StandaloneAppBootstrapUpgradeRequired = {
  access: 'upgrade_required';
  app: StandaloneAppPublicInfo;
  message: string;
};

export type StandaloneAppBootstrapForbidden = {
  access: 'forbidden';
  app: StandaloneAppPublicInfo;
  message: string;
};

export type StandaloneAppBootstrapNotFound = {
  access: 'not_found';
  message: string;
};

export type StandaloneAppBootstrapResult =
  | StandaloneAppBootstrapAllowed
  | StandaloneAppBootstrapLoginRequired
  | StandaloneAppBootstrapUpgradeRequired
  | StandaloneAppBootstrapForbidden
  | StandaloneAppBootstrapNotFound;