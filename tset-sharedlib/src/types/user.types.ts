import type { TokenData } from '../api';
import type User from '../schemas/public/User';
import type { DateString, DynObj } from './common.types';
import type { ContentOpenBehaviorOverrides } from './client.types';
import { RuleOverrideSettings } from './usage-limits.types';
import type { RewardSettings, DailyRewardStates } from './reward.types';
import { AccountOptions, SystemOptions } from '../schemas/public/Account';
import type { CategorySet } from './categoryExplorer.types';

export enum UserType {
  admin = 'admin',
  restricted = 'restricted',
}

export enum AccountType {
  standard = 'standard',
  plus = 'plus',
  superplus = 'superplus',
}

export enum LoginType {
  google = 'google',
  apple = 'apple',
  internal = 'internal',
}

export enum VerificationType {
  loginToken = 'loginToken',
  joinFamily = 'joinFamily',
  passwordReset = 'passwordReset',
  accountRecovery = 'accountRecovery',
  regToken = 'regToken',
  confirmEmail = 'confirmEmail',
}

export interface UserOptions {
  whitelistingEnabled: boolean;
  codeInjectionEnabled: boolean;
  contentFilteringEnabled: boolean;
  usageLimitsData?: any;
  logActivity: boolean;
  aiChatEnabled?: boolean;
  accessControlSettings?: any;
  ruleOverrideSettings?: RuleOverrideSettings;
  /** Reward rules and categories configured for this user. */
  rewardSettings?: RewardSettings;
  /** Per-day earned/claimed state for the reward rules above. */
  dailyRewardStates?: DailyRewardStates;
}



export interface UserView extends User {
  _id: string;
  localUser?: boolean;
  profileImage?: Record<string, any> | null;
  encEnabled?: boolean;
  encSettings?: DynObj;
  options?: UserOptions;
  lastLoginAt?: Date;
  accountType?: AccountType;
  hasPassword?: boolean;
  hasPin?: boolean;
  hasPasswordCopy?: boolean;
  hasRecoveryKeyStored?: boolean;
  publicId?: string;
}



export interface AccountView {
  _id: string;
  accountType: AccountType;
  subscriptionInfo?: any;
  sysOptions?: SystemOptions;
  options?: AccountOptions;
}

export interface UserAuthInfo {
  user: User;
  userId: string;
  sessionId: string;
  accountId: string;
}

export interface UserPreferences {
  [key: string]: any;
}

export interface UserPrefsData {
  pinnedToHome?: string[];
  taskbar?: TaskButtonEntry[];
  notificationSettings?: any;
  uiWelcome?: boolean;
  'ui.addGlobal.mode'?: 'auto' | 'kidFirst' | 'adultFirst' | null;
  contentOpenBehaviorOverrides?: ContentOpenBehaviorOverrides | null;
  youtubeVideoOpenBehavior?: 'inApp' | 'external' | null;
  youtubeHideSearch?: boolean | null;
  youtubeHideComments?: boolean | null;
  youtubeHideRecommendations?: boolean | null;
  youtubeHideOtherDistractions?: boolean | null;
  redditHideSearch?: boolean | null;
  redditHideComments?: boolean | null;
  redditHideOtherDistractions?: boolean | null;
  customCategorySets?: CategorySet[];
}

export interface TaskButtonEntry {
  name: string;
  label: string;
  icon: string;
  enabled: boolean;
  type: string;
  builtin: boolean;
  items: any[];
  itemCache: any[];
  tabs: any[];
  order: number;
}

export interface ClientInfoView {
  clientId: string;
  clientVersion: string;
  appId: string;
  appVersion: string;
  appType: string;
}

export type ManagedSessionStatus = 'offline' | 'stale' | 'online-unverified' | 'verified-live';

export type RemoteActionCommandKind = 'openUrl' | 'forceSyncSettings' | 'syncActivity' | 'getScreenshot';

export type RemoteActionCommandStatus = 'sent' | 'completed' | 'failed' | 'expired';

export interface ManagedClientSessionView extends ClientInfoView {
  deviceName?: string | null;
  deviceType?: string | null;
  lastSeen?: DateString | null;
  lastLogin?: DateString | null;
  lastHeartbeatAt?: DateString | null;
  lastVerifiedAt?: DateString | null;
  status: ManagedSessionStatus;
  supportsRemoteCommands: boolean;
  remoteCommandReady: boolean;
}

export interface ManagedRemoteActionCommandView {
  actionId: string;
  targetUserId: string;
  requestedByUserId: string;
  clientId: string;
  kind: RemoteActionCommandKind;
  status: RemoteActionCommandStatus;
  createdAt: DateString;
  updatedAt: DateString;
  completedAt?: DateString | null;
  errorMessage?: string | null;
  screenshotDataUrl?: string | null;
}

export interface AuthInfo {
  user?: UserView;
  tokenData?: TokenData;
  lastUpdated?: Date;
  passwordForClient?: string;
  recoveryKeyForClient?: string;
  success: boolean;
}
