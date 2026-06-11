/**
 * Shared types for content moderation
 * Used across server and potentially client for consistency
 */

/**
 * Content types that can be moderated
 */
export type ModerationContentType = 
  | 'text'
  | 'image'
  | 'username'
  | 'profile_picture'
  | 'published_content'
  | 'user_generated_content';

/**
 * Severity levels for moderation flags
 */
export enum ModerationSeverity {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Moderation flag types aligned with existing content.types.ts
 */
export enum ModerationFlagType {
  SEXUAL_CONTENT = 'flag_sexual_content',
  DRUGS = 'flag_drugs',
  MILD_LANGUAGE = 'flag_mild_language',
  STRONG_LANGUAGE = 'flag_strong_language',
  VIOLENCE = 'flag_violence',
  HATE_SPEECH = 'flag_hate_speech',
  SPAM = 'flag_spam',
  INAPPROPRIATE = 'flag_inappropriate',
  HARASSMENT = 'flag_harassment'
}

/**
 * Result of a moderation check
 */
export interface ModerationResult {
  approved: boolean;
  severity: ModerationSeverity;
  flags: ModerationFlag[];
  confidence: number; // 0-1, how confident we are in this result
  method: 'rules' | 'ai' | 'hybrid';
  details?: string;
  suggestedAction?: 'allow' | 'review' | 'block' | 'remove';
}

/**
 * Individual flag from moderation
 */
export interface ModerationFlag {
  type: ModerationFlagType;
  severity: ModerationSeverity;
  confidence: number; // 0-1
  reason?: string;
  ruleMatched?: string; // Which rule triggered this
}

/**
 * Input for moderation checks
 */
export interface ModerationInput {
  contentType: ModerationContentType;
  text?: string;
  imageUrl?: string;
  imageData?: Buffer | string; // base64 or buffer
  metadata?: {
    userId?: string;
    publishId?: string;
    url?: string;
    extractedText?: string;
    [key: string]: any;
  };
}
