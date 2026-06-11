
import { ItemResourceType } from './constants';

// import { entityNameList, tagNameList, tagOptionsMap } from "tset-sharedlib/constants";
// 

// Content classification types
export type EduValue = 'eduval_educational' | 'eduval_edutainment' | 'eduval_fun' | 'eduval_task' | 'eduval_unknown' | 'eduval_junk';
export type MinAgeGroup = 'minage_na' | 'minage_prek' | 'minage_kids' | 'minage_preteen' | 'minage_teen' | 'minage_adult' | 'minage_unknown';
export type TargetAudience = 'ta_all' | 'ta_prek' | 'ta_kids' | 'ta_preteen' | 'ta_teen' | 'ta_adult' | 'ta_unknown';
export type Cost = 'cost_free' | 'cost_freewithpaid' | 'cost_paid' | 'cost_unknown';
export type Ads = 'ads_no' | 'ads_l' | 'ads_m' | 'ads_h' | 'ads_unknown';
export type CostDetails = 'costd_pay2rm' | 'costd_no3rdpartyads' | 'costd_nosignin' | 'costd_opensource' | 'costd_unknown';
export type ContentType = 'ct_app' | 'ct_article' | 'ct_cntcreator' | 'ct_game' | 'ct_music' | 'ct_org' | 'ct_phy_product' | 'ct_ref' | 'ct_video' | 'ct_unknown' | 'ct_other';

// Granular micro-tags (topics/genres/patterns) that can roll up into EduValue / ContentType.
// Stored as strings alongside other criteria in `useCriteria`.
export type TopicTag =
  | 'topic_streaming_tv'
  | 'topic_movies'
  | 'topic_kids_shows'
  | 'topic_anime'
  | 'topic_music_listening'
  | 'topic_music_creation'
  | 'topic_podcasts'
  | 'topic_video_games'
  | 'topic_sandbox_games'
  | 'topic_memes_humor'
  | 'topic_social_feed'
  | 'topic_forums'
  | 'topic_group_chat'
  | 'topic_creator_channels'
  | 'topic_short_video_infinite_scroll'
  | 'topic_clickbait_sensational_news'
  | 'topic_homework_help'
  | 'topic_math_practice'
  | 'topic_language_learning'
  | 'topic_coding_tutorials'
  | 'topic_science_learning'
  | 'topic_history_civics'
  | 'topic_reference_research'
  | 'topic_documentaries';

// Intent answers “how is this being used?”
// This is the missing piece for subtle distinctions like:
// - topic_video_games + intent_learn  (learning game dev)
// - topic_video_games + intent_play   (playing games)
export type IntentTag =
  | 'intent_learn'
  | 'intent_create'
  | 'intent_play'
  | 'intent_socialize'
  | 'intent_relax'
  | 'intent_news'
  | 'intent_task'
  | 'intent_doomscroll';

export type UseCriterias = Array<
  EduValue | MinAgeGroup | TargetAudience | Cost | Ads | CostDetails | ContentType | TopicTag | IntentTag
>;

export interface UseCriteriaData {
  eduValue?: EduValue;
  minAgeGroup?: MinAgeGroup;
  targetAudiences: TargetAudience[];
  cost?: Cost;
  ads?: Ads;
  costDetails: CostDetails[];
  contentTypes: ContentType[];
  topics?: TopicTag[];
  intent?: IntentTag;
}

/***********Item Types */
export const ITEM_TYPE_PRIMARY_VALUES = ['link', 'note', 'file_group', 'default', 'thing', 'col', 'tab'] as const;

export type ItemTypePrimary = (typeof ITEM_TYPE_PRIMARY_VALUES)[number];

export type ItemTypeSchemaField = {
  name: string;
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'select'
    | 'array'
    | 'textarea'
    | 'url'
    | 'email'
    | 'date'
    | 'multi_string';
  label?: string;
  description?: string;
  placeholder?: string;
  options?: ReadonlyArray<{ value: any; text: string }>;
  required?: boolean;
  rows?: number;
  maxRows?: number;
  uiGroup?: 'primary' | 'details' | 'hidden';
}

// for adding structure to items
export const typeNameList = [
  { key: 'col', name: 'Collection', icon: 'folder', primary: true ,hide: false},
  { key: 'defaultQuickbar', name: 'Quickbar', icon: 'lightning', parent: "col" ,hide: true},
  { key: 'defaultSharedCollection', name: 'Shared Collection', icon: 'people', parent: "col" ,hide: true},
  { key: 'defaultShowcaseCollection', name: 'Showcase Collection', icon: 'stars', parent: "col" ,hide: true},
  { key: 'link', name: 'Link', icon: 'link-45deg', primary: true ,hide: false},
  { key: 'note', name: 'Note', icon: 'sticky', primary: true ,hide: false},
  { key: 'file_group', name: 'File(s)', icon: 'files', primary: true ,hide: false},
  { key: 'default', name: 'Default Type', icon: 'file-richtext', primary: true ,hide: true},
  { key: 'tab', name: 'Tab', icon: 'columns-gap', primary: true ,hide: true},
  { key: 'thing', name: 'Thing', icon: 'box', primary: true ,hide: true},
  { key: 'animal', name: 'Animal', icon: 'feather', parent: "thing" ,hide: true},
  { key: 'art_work', name: 'Art Work', icon: 'brush', parent: "thing" ,hide: true},
  { key: 'article', name: 'Article', icon: 'file-earmark-text', parent: "thing" ,hide: true},
  { key: 'artist', name: 'Artist', icon: 'person-lines-fill', parent: "thing" ,hide: true},
  { 
    key: 'book',
    name: 'Book',
    icon: 'book',
    parent: "thing" ,
    hide: true,
    schema: [
      { name: 'authors', type: 'multi_string', label: 'Author(s)', placeholder: 'Add an author', uiGroup: 'primary' },
      { name: 'publisher', type: 'string', label: 'Publisher', placeholder: 'Publisher (optional)', uiGroup: 'details' },
      { name: 'publishedDate', type: 'date', label: 'Published date', uiGroup: 'primary' },
      { name: 'isbn', type: 'string', label: 'ISBN', placeholder: 'ISBN (optional)', uiGroup: 'details' },
      { name: 'language', type: 'string', label: 'Language', placeholder: 'Language (optional)', uiGroup: 'details' },
      { name: 'edition', type: 'string', label: 'Edition', placeholder: 'Edition (optional)', uiGroup: 'details' },
      { name: 'series', type: 'string', label: 'Series', placeholder: 'Series (optional)', uiGroup: 'details' },
      { name: 'pageCount', type: 'number', label: 'Page count', placeholder: 'Pages (optional)', uiGroup: 'details' },
    ],
  },
  { 
    key: 'ebook',
    name: 'E-Book',
    icon: 'book',
    parent: "thing" ,
    hide: false,
    schema: [
      { name: 'authors', type: 'multi_string', label: 'Author(s)', placeholder: 'Add an author', uiGroup: 'primary' },
      { name: 'publisher', type: 'string', label: 'Publisher', placeholder: 'Publisher (optional)', uiGroup: 'details' },
      { name: 'publishedDate', type: 'date', label: 'Published date', uiGroup: 'primary' },
      { name: 'isbn', type: 'string', label: 'ISBN', placeholder: 'ISBN (optional)', uiGroup: 'details' },
      { name: 'language', type: 'string', label: 'Language', placeholder: 'Language (optional)', uiGroup: 'details' },
      { name: 'edition', type: 'string', label: 'Edition', placeholder: 'Edition (optional)', uiGroup: 'details' },
      { name: 'series', type: 'string', label: 'Series', placeholder: 'Series (optional)', uiGroup: 'details' },
      { name: 'pageCount', type: 'number', label: 'Page count', placeholder: 'Pages (optional)', uiGroup: 'details' },
    ],
  },
  // {key: 'concept', name: 'Concept', icon: 'triangle-fill, parent: "thing",hide: true},
  { key: 'content_creator', name: 'Content Creator', icon: 'person-lines-fill', parent: "thing" ,hide: true},
  // {key: 'electronic_device', name: 'Electronic Device', icon: 'phone, parent: "thing",hide: true},
  { key: 'event', name: 'Event', icon: 'calendar4-week', parent: "thing" ,hide: true},
  { key: 'film', name: 'Film', icon: 'film', parent: "thing" ,hide: true},
  // {key: 'feed', name: 'Feed', icon: 'rss, parent: "thing",hide: true},
  { key: 'food', name: 'Food', icon: 'cup', parent: "thing" ,hide: true},
  { key: 'game', name: 'Game', icon: 'controller', parent: "thing" ,hide: true},
  { key: 'generic', name: 'Generic', icon: 'file', parent: "thing" ,hide: true},
  { key: 'image', name: 'Image', icon: 'image', parent: "thing" ,hide: true},
  { key: 'information', name: 'Info', icon: 'info-circle', parent: "thing" ,hide: false},
  { key: 'location', name: 'Location', icon: 'geo', parent: "thing" ,hide: true},
  { key: 'memory', name: 'Memory', icon: 'journal-text', parent: "thing" ,hide: true},
  { key: 'music', name: 'Music', icon: 'music-note-beamed', parent: "thing" ,hide: true},
  { key: 'object', name: 'Object', icon: 'square-fill', parent: "thing" ,hide: true},
  { key: 'organization', name: 'Organization', icon: 'building', parent: "thing" ,hide: true},
  { key: 'other', name: 'Other', icon: 'circle-fill', parent: "thing" ,hide: false},
  { key: 'person', name: 'Person', icon: 'person-lines-fill', parent: "thing" ,hide: true},
  { key: 'plant', name: 'Plant', icon: 'tree', parent: "thing" ,hide: true},
  { key: 'product', name: 'Product', icon: 'cart', parent: "thing" ,hide: true},
  { key: 'project', name: 'Project', icon: 'folder', parent: "thing" ,hide: true},
  { key: 'task', name: 'Task', icon: 'check2-square', parent: "thing" ,hide: true},
  { key: 'song', name: 'Song', icon: 'music-note-beamed', parent: "thing" ,hide: true},
  { key: 'story', name: 'Story', icon: 'file-richtext', parent: "thing" ,hide: true},
  { key: 'video_game', name: 'Video Game', icon: 'controller', parent: "thing" ,hide: true},
  { key: 'video_series', name: 'Series (TV or Show)', icon: 'tv', parent: "thing" ,hide: true},
  { key: 'video', name: 'Video', icon: 'file-play', parent: "thing" ,hide: true},
  { key: 'written_work', name: 'Written Work', icon: 'journal-text', parent: "thing" ,hide: true},
  { key: 'feed_collection', name: 'Feed', icon: 'rss', parent: "link" ,hide: true},
   { key: 'pub_col_slink', name: 'Published Collection Link', icon: 'arrow-90deg-left', parent: "link" ,hide: true},

  {
    key: 'kin_app',
    name: 'Kindredly App',
    icon: 'play',
    parent: "thing",
    hide: false,
    schema: [
      {
        name: 'sourceKind',
        type: 'select',
        label: 'App source type',
        options: [
          { value: 'item', text: 'Library app' },
          { value: 'published', text: 'Published app' },
        ],
        uiGroup: 'primary',
      },
      {
        name: 'sourceId',
        type: 'string',
        label: 'App source ID',
        placeholder: 'Item ID or publish ID',
        uiGroup: 'primary',
      },
      {
        name: 'preferredOpenMode',
        type: 'select',
        label: 'Open in',
        options: [
          { value: 'website', text: 'Website' },
          { value: 'embedded', text: 'Kindredly' },
          { value: 'either', text: 'Either' },
        ],
        uiGroup: 'primary',
      },
      {
        name: 'launchPath',
        type: 'string',
        label: 'Launch path',
        placeholder: 'Optional app path',
        uiGroup: 'details',
      },
      {
        name: 'appRole',
        type: 'select',
        label: 'App role',
        options: [
          { value: 'firstParty', text: 'First-party' },
          { value: 'userHosted', text: 'User hosted' },
        ],
        uiGroup: 'details',
      },
    ],
  },
  { key: 'app', name: 'App', icon: 'phone', parent: "link" ,hide: true},
  { key: 'website', name: 'Website', icon: 'globe', parent: "link" ,hide: false},
  { key: 'podcast', name: 'Podcast', icon: 'headphones', parent: "link" ,hide: true},
  { key: 'yt_channel', name: 'YouTube Channel', icon: 'youtube', parent: "link" ,hide: true},
  { key: 'yt_video', name: 'YouTube Video', icon: 'youtube', parent: "link" ,hide: true}
] as const;

export type ItemTypeSecondary = (typeof typeNameList)[number]['key'];

type ItemTypeSelectorDescriptor = {
  description: string;
  extraDetails?: string;
};

const itemTypeSelectorDescriptors: Partial<Record<ItemTypeSecondary, ItemTypeSelectorDescriptor>> = {
  col: {
    description: 'A collection that groups related items together.',
    extraDetails: 'Best for folders, bundles, reading lists, and saved sets.',
  },
  link: {
    description: 'A web resource you usually open by URL.',
    extraDetails: 'Best for websites, online tools, channels, and destinations.',
  },
  note: {
    description: 'A text-first note stored and edited inside Kindredly.',
    extraDetails: 'Best for writing, scratch notes, and journal-style content.',
  },
  file_group: {
    description: 'A file or attachment-based item.',
    extraDetails: 'Best for uploads, PDFs, images, and grouped media files.',
  },
  book: {
    description: 'A book or long-form written work.',
    extraDetails: 'Best for titles with authors, publishing details, and reading metadata.',
  },
  ebook: {
    description: 'A digital book or downloadable reading item.',
    extraDetails: 'Best for EPUBs, PDFs, and other digital reading resources.',
  },
  information: {
    description: 'A general reference item with text details.',
    extraDetails: 'Best for facts, summaries, research notes, and structured knowledge.',
  },
  other: {
    description: 'A catch-all item when a more specific type does not fit well.',
    extraDetails: 'Use when you want to save the item now and refine its type later.',
  },
  kin_app: {
    description: 'A Kindredly app item with structured launch settings.',
    extraDetails: 'Best for first-party or published app experiences that run inside Kindredly.',
  },
  app: {
    description: 'An online app or interactive web tool.',
    extraDetails: 'Best for tools you use actively rather than mostly read or watch.',
  },
  website: {
    description: 'A standard website or web page.',
    extraDetails: 'Best for pages you mainly visit in a browser.',
  },
  podcast: {
    description: 'A podcast, audio show, or listening destination.',
    extraDetails: 'Best for audio-first content and recurring episodes.',
  },
  yt_channel: {
    description: 'A YouTube creator channel or subscription destination.',
    extraDetails: 'Best for channel-level browsing and creator follow lists.',
  },
  yt_video: {
    description: 'A specific YouTube video or single video destination.',
    extraDetails: 'Best for one-off videos instead of an entire channel.',
  },
  article: {
    description: 'A written article, essay, or reference page.',
    extraDetails: 'Best for text-heavy pieces you read more than interact with.',
  },
  video: {
    description: 'A video item centered on watching.',
    extraDetails: 'Best for standalone videos outside a channel or series.',
  },
  video_series: {
    description: 'A show, series, or recurring video program.',
    extraDetails: 'Best for multi-episode viewing and series-level organization.',
  },
  video_game: {
    description: 'A video game or game experience.',
    extraDetails: 'Best for individual games, titles, and play-focused content.',
  },
  music: {
    description: 'A music item centered on listening or musical identity.',
    extraDetails: 'Best for artists, albums, tracks, and music-focused references.',
  },
  song: {
    description: 'A single song or track.',
    extraDetails: 'Best for one specific piece of music rather than a broader artist or catalog.',
  },
  project: {
    description: 'A project with ongoing work, planning, or deliverables.',
    extraDetails: 'Best for multi-step efforts with notes, links, and attachments.',
  },
  task: {
    description: 'A discrete task or action item.',
    extraDetails: 'Best for one thing to do, finish, or track.',
  },
  person: {
    description: 'A person, creator, or individual profile.',
    extraDetails: 'Best for people you want to save as named reference items.',
  },
  organization: {
    description: 'A company, school, nonprofit, or other organization.',
    extraDetails: 'Best for named groups instead of a single person or page.',
  },
};

export function getItemTypeSelectorInfo(type: ItemTypeSecondary): {
  value: ItemTypeSecondary;
  text: string;
  icon: string;
  parent?: string;
  primary?: boolean;
  hide?: boolean;
  description: string;
  extraDetails?: string;
} {
  const typeInfo = getItemTypeInfo(type) || {
    name: type,
    icon: 'file-richtext',
  };
  const descriptor = itemTypeSelectorDescriptors[type] || getGenericItemTypeSelectorDescriptor(type, typeInfo);

  return {
    value: type,
    text: typeInfo.name,
    icon: typeInfo.icon,
    parent: typeInfo.parent,
    primary: typeInfo.primary,
    hide: typeInfo.hide,
    description: descriptor.description,
    extraDetails: descriptor.extraDetails,
  };
}

export function getEditableItemTypeSelectorOptions(options: { onlyThing?: boolean } = {}): Array<ReturnType<typeof getItemTypeSelectorInfo>> {
  const hiddenSystemTypes = new Set<ItemTypeSecondary>([
    'col',
    'defaultQuickbar',
    'defaultSharedCollection',
    'defaultShowcaseCollection',
    'default',
    'tab',
    'thing',
    'feed_collection',
    'pub_col_slink',
  ]);

  return typeNameList
    .filter((entry) => !hiddenSystemTypes.has(entry.key))
    .filter((entry) => {
      if (!options.onlyThing) {
        return true;
      }

      const parentType = getItemTypeInfo(entry.key)?.parent;
      return parentType === 'thing' || entry.key === 'file_group';
    })
    .map((entry) => getItemTypeSelectorInfo(entry.key));
}

function getGenericItemTypeSelectorDescriptor(
  type: ItemTypeSecondary,
  typeInfo: ReturnType<typeof getItemTypeInfo>,
): ItemTypeSelectorDescriptor {
  const typeName = typeInfo?.name || type;

  if (typeInfo?.parent === 'link') {
    return {
      description: `A URL-based ${typeName.toLowerCase()} item you open online.`,
      extraDetails: 'Best for saved web destinations, services, media, and resources.',
    };
  }

  if (typeInfo?.parent === 'thing') {
    return {
      description: `A ${typeName.toLowerCase()} item with its own identity and details.`,
      extraDetails: 'Best for named references, media, people, projects, and saved knowledge.',
    };
  }

  return {
    description: `Use this when the item is mainly a ${typeName.toLowerCase()}.`,
    extraDetails: 'Pick the closest match for how the item should behave in Kindredly.',
  };
}

export const SYSTEM_DERIVED_SUB_TYPES = ['website', 'yt_video', 'yt_channel'] as const;

export type SystemDerivedItemSubType = (typeof SYSTEM_DERIVED_SUB_TYPES)[number];

export type ItemExperienceViewMode =
  | 'default-item'
  | 'gallery'
  | 'image'
  | 'reader'
  | 'audio'
  | 'video'
  | 'channel'
  | 'app-runner'
  | 'reference';

export type ItemExperienceKind =
  | 'generic-link'
  | 'gallery'
  | 'image'
  | 'reader'
  | 'audio'
  | 'video'
  | 'channel'
  | 'app-runner'
  | 'reference'
  | 'default-item';

export type ItemExperienceCapability =
  | 'supportsStructuredMetadata'
  | 'supportsProviderIdentity'
  | 'supportsFeedDiscovery'
  | 'prefersExternalOpen'
  | 'supportsAttachments'
  | 'supportsEmbeddedRun';

export interface ItemExperienceContract {
  id: string;
  label: string;
  icon: string;
  parentType?: string;
  experienceKind: ItemExperienceKind;
  semanticKinds: string[];
  provider?: string;
  resourceType?: string;
  defaultViewMode: ItemExperienceViewMode;
  defaultOpenAction: string;
  viewAction: string;
  capabilityFlags: ItemExperienceCapability[];
  pickerSummary: string;
  fallbackChain: string[];
  schemaSource: 'type' | 'subType' | 'none';
}

export function isSystemDerivedSubType(
  subType: string | null | undefined,
): subType is SystemDerivedItemSubType {
  return !!subType && (SYSTEM_DERIVED_SUB_TYPES as readonly string[]).includes(subType);
}

export function shouldAutoDeriveSubType(input: {
  currentType?: string | null;
  currentSubType?: string | null;
  derivedSubType?: ItemTypeSecondary | null;
}): boolean {
  const { currentType, currentSubType, derivedSubType } = input;

  if (!derivedSubType) {
    return false;
  }

  const normalizedCurrentSubType = normalizeSubTypeForType(currentType, currentSubType) || currentSubType || null;

  if (normalizedCurrentSubType === derivedSubType) {
    return true;
  }

  if (!normalizedCurrentSubType) {
    return !currentType || currentType === 'link';
  }

  return isSystemDerivedSubType(normalizedCurrentSubType);
}

export function getItemExperienceContract(
  type: string,
  subType: string,
  openWithSettings: Record<string, string> = {},
): ItemExperienceContract {
  const normalizedSubType = normalizeSubTypeForType(type, subType) ?? subType ?? '';
  const lookupType = normalizedSubType || type || 'default';
  const typeInfo = getItemTypeInfo(lookupType) || getItemTypeInfo(type || 'default') || {
    name: lookupType || 'Item',
    icon: lookupType || 'file-richtext',
  };
  const defaultOpenAction = getDefaultOpenAction(type, normalizedSubType || undefined, openWithSettings);
  const viewAction = getDefaultViewAction(type, normalizedSubType || undefined);

  const baseContract: ItemExperienceContract = {
    id: lookupType,
    label: typeInfo.name,
    icon: typeInfo.icon,
    parentType: typeInfo.parent,
    experienceKind: 'default-item',
    semanticKinds: [lookupType],
    defaultViewMode: 'default-item',
    defaultOpenAction,
    viewAction,
    capabilityFlags: [],
    pickerSummary: `${typeInfo.name} item`,
    fallbackChain: [defaultOpenAction, viewAction],
    schemaSource: normalizedSubType ? 'subType' : 'type',
  };

  switch (lookupType) {
    case 'file_group':
      return {
        ...baseContract,
        experienceKind: 'gallery',
        semanticKinds: ['file_group', 'file'],
        defaultViewMode: 'gallery',
        capabilityFlags: ['supportsAttachments'],
        pickerSummary: 'File group with a gallery-first attachment experience.',
      };
    case 'website':
      return {
        ...baseContract,
        experienceKind: 'generic-link',
        semanticKinds: ['website', 'link'],
        resourceType: ItemResourceType.SITE_ROOT,
        capabilityFlags: ['prefersExternalOpen'],
        pickerSummary: 'Website link with generic open behavior.',
      };
    case 'yt_video':
      return {
        ...baseContract,
        experienceKind: 'video',
        semanticKinds: ['video', 'youtube'],
        provider: 'youtube',
        resourceType: ItemResourceType.YT_VIDEO,
        defaultViewMode: 'video',
        capabilityFlags: ['supportsProviderIdentity', 'prefersExternalOpen'],
        pickerSummary: 'YouTube video with provider-aware open behavior.',
      };
    case 'image':
      return {
        ...baseContract,
        experienceKind: 'image',
        semanticKinds: ['image', 'file'],
        defaultViewMode: 'image',
        capabilityFlags: ['supportsAttachments'],
        pickerSummary: 'Single image item backed by an attachment.',
      };
    case 'video':
      return {
        ...baseContract,
        experienceKind: 'video',
        semanticKinds: ['video', 'file'],
        defaultViewMode: 'video',
        capabilityFlags: ['supportsAttachments'],
        pickerSummary: 'Single video item backed by an attachment.',
      };
    case 'yt_channel':
      return {
        ...baseContract,
        experienceKind: 'channel',
        semanticKinds: ['channel', 'youtube'],
        provider: 'youtube',
        resourceType: ItemResourceType.YT_CHANNEL,
        defaultViewMode: 'channel',
        capabilityFlags: ['supportsProviderIdentity', 'supportsFeedDiscovery', 'prefersExternalOpen'],
        pickerSummary: 'YouTube channel with provider-aware open behavior.',
      };
    case 'podcast':
      return {
        ...baseContract,
        experienceKind: 'audio',
        semanticKinds: ['podcast', 'audio'],
        defaultViewMode: 'audio',
        capabilityFlags: ['supportsFeedDiscovery', 'supportsStructuredMetadata'],
        pickerSummary: 'Podcast link that can opt into audio/feed affordances.',
      };
    case 'book':
    case 'ebook':
      return {
        ...baseContract,
        experienceKind: 'reader',
        semanticKinds: ['book', 'reader'],
        defaultViewMode: 'reader',
        capabilityFlags: ['supportsStructuredMetadata', 'supportsAttachments'],
        pickerSummary: 'Book-like item that prefers reader-style experiences.',
      };
    case 'kin_app':
      return {
        ...baseContract,
        experienceKind: 'app-runner',
        semanticKinds: ['app'],
        defaultViewMode: 'app-runner',
        capabilityFlags: ['supportsEmbeddedRun', 'supportsStructuredMetadata'],
        pickerSummary: 'Kindredly app with runnable app behavior.',
      };
    case 'person':
    case 'organization':
    case 'location':
      return {
        ...baseContract,
        experienceKind: 'reference',
        semanticKinds: [lookupType, 'reference'],
        defaultViewMode: 'reference',
        capabilityFlags: ['supportsStructuredMetadata'],
        pickerSummary: `${typeInfo.name} reference with structured metadata.`,
      };
    case 'link':
      return {
        ...baseContract,
        experienceKind: 'generic-link',
        semanticKinds: ['link'],
        capabilityFlags: ['prefersExternalOpen'],
        pickerSummary: 'Generic link item.',
      };
    default:
      return baseContract;
  }
}

export function resolveItemOpenAction(
  type: string,
  subType: string,
  openWithSettings: Record<string, string> = {},
): string {
  return getItemExperienceContract(type, subType, openWithSettings).defaultOpenAction;
}

export function resolveItemViewAction(type: string, subType: string): string {
  return getItemExperienceContract(type, subType).viewAction;
}



export function getDefaultOpenAction(type: string, subType?: string,
  openWithSettings: Record<string, string> = {}) {


  if (openWithSettings && subType && subType in openWithSettings) {
    return openWithSettings[subType];
  }

  if ((subType && ['feed_collection'].includes(subType || ''))) {
    return 'openItem';
  }
  else if ((subType && ['yt_channel', 'yt_video'].includes(subType || ''))) {
    return 'openLink'; // 'openItem'
  }
    else if ((subType && ['kin_app'].includes(subType || ''))) {
    return 'runApp'; // 'openItem'
  }
  else if (['link'].includes(type)) {
    return 'openLink';
  }
  else if (type == 'col') {
    return 'openCol'
  }
  
  else if (type == 'tab') {
    return "openTab"
  }
  else {
    return 'openItem'
  }
}

export function getDefaultViewAction(type: string, subType?: string) {
  if (['col'].includes(type)) {

    return 'openCol';

  }
  else return 'openItem'


}

let typeNameMap: Record<string, any> | undefined = undefined;

function getTypeNameLookup(): Record<string, any> {
  if (!typeNameMap) {
    typeNameMap = Object.fromEntries(typeNameList.map((v) => [v.key, v]));
  }
  return typeNameMap;
}

export function getItemTypeInfo(type: string): {
  name: string;
  icon: string;
  parent?: string;
  primary?: boolean;
  hide?: boolean;
  schema?: ReadonlyArray<ItemTypeSchemaField>;
} {
  return getTypeNameLookup()[type];
}

export function normalizeSubTypeForType(type: string | null | undefined, subType: string | null | undefined): ItemTypeSecondary | null {
  if (type === 'thing' && (!subType || subType === 'thing')) {
    return 'information';
  }

  if (!subType) return null;
  if (subType === 'info') return 'information';
  if (type && subType === type) return null;
  if (!getItemTypeInfo(subType)) return null;

  return subType as ItemTypeSecondary;
}

export function isInformationItem(type: string | null | undefined, subType: string | null | undefined): boolean {
  if (type === 'information') return true;

  const normalizedSubType = normalizeSubTypeForType(type, subType);
  return normalizedSubType === 'information' || subType === 'info';
}

export function isBodyTextItem(type: string | null | undefined, subType: string | null | undefined): boolean {
  return type === 'note' || isInformationItem(type, subType);
}

export function isTaskItem(type: string | null | undefined, subType: string | null | undefined): boolean {
  return normalizeSubTypeForType(type, subType) === 'task';
}

/**
 * Derive item subType from metadata's tsExtractedInfo.pageType
 * Used at persistence time to set correct subType based on resource detection
 */
export function getSubTypeFromMeta(meta: { tsExtractedInfo?: { pageType?: string | null } } | null | undefined): ItemTypeSecondary | null {
  const pageType = meta?.tsExtractedInfo?.pageType;
  if (!pageType) return null;
  
  // Handle both enum values and legacy string values
  if (pageType === 'YOUTUBE_CHANNEL' || pageType === 'YT_CHANNEL') return 'yt_channel';
  if (pageType === 'YOUTUBE_VIDEO' || pageType === 'YT_VIDEO') return 'yt_video';
  if (pageType === 'SITE_ROOT') return 'website';
  return null;
}

export function getItemTypeDetails(type: string, subType: string, openWithSettings: Record<string, string> = {}): {
  name: string;
  icon: string;
  parent?: string;
  primary?: boolean;
  contractId?: string;
  defaultViewMode?: ItemExperienceViewMode;
  capabilityFlags?: ItemExperienceCapability[];
  provider?: string;
  resourceType?: string;
  openAction: string;
  viewAction: string;
} {
  let lookupType = subType || type || 'default';
  const typeInfo = getItemTypeInfo(lookupType);
  const contract = getItemExperienceContract(type, subType, openWithSettings);

  let details = {
    ...typeInfo,
    contractId: contract.id,
    defaultViewMode: contract.defaultViewMode,
    capabilityFlags: contract.capabilityFlags,
    provider: contract.provider,
    resourceType: contract.resourceType,
    openAction: contract.defaultOpenAction,
    viewAction: contract.viewAction,
  };

  return details
}


/***********Tags */

export const tagTypes = {
  eduValue: { prefix: 'eduval', name: "Usage Type" },
  minAgeGroup: { prefix: 'minage', name: "Minimum Age Group" },
  targetAudiences: { prefix: 'ta', name: "Target Audience" },
  cost: { prefix: 'cost', name: "Cost" },
  ads: { prefix: 'ads', name: "Ads" },
  costDetails: { prefix: 'costd', name: "Cost Details" },
  content: { prefix: 'ct', name: "Format" },
  topics: { prefix: 'topic', name: 'Topics' },
  intent: { prefix: 'intent', name: 'Intent' },
  // warning: { prefix: 'wa', name: "Warning Flags" },
};

export const flagOptions = {
  "flag_sexual_content": "Sexual or provocative content",
  'flag_drugs': "Drugs or alcohol related content",
  "flag_mild_language": "Mild Language",
  "flag_strong_language": "Strong Language",
  "flag_violence": "Violence"
}
export interface TagOptionDetail<T> {
  key: T;
  name: string;
  selectedName?: string;
  description?: string;
  extraDetails?: string;
  hideFromSearch?: boolean;
  color?: string;
  icon?: string;
}

export interface UseCriteriaDataWithDetails {
  eduValue?: TagOptionDetail<EduValue>;
  minAgeGroup?: TagOptionDetail<MinAgeGroup>;
  targetAudiences: TagOptionDetail<TargetAudience>[];
  cost?: TagOptionDetail<Cost>;
  ads?: TagOptionDetail<Ads>;
  costDetails: TagOptionDetail<CostDetails>[];
  contentTypes: TagOptionDetail<ContentType>[];
  topics?: TagOptionDetail<TopicTag>[];
  intent?: TagOptionDetail<IntentTag>;
}

export type ContentTypeIngredient = {
  name: string;
  note?: string;
};

export type ContentTypeNutritionLabel = {
  title: string;
  tagline: string;
  description: string;
  ingredients?: ContentTypeIngredient[];
  dailyDietGuidance: string[];
  examples: string[];
};

export const normalizeEduValueAlias = (value?: string | null): EduValue | undefined => {
  if (!value) return undefined;
  if (value === 'eduval_academic') return 'eduval_educational';
  if (value === 'eduval_mixed') return 'eduval_edutainment';
  if (value === 'eduval_social') return 'eduval_junk';

  return [
    'eduval_educational',
    'eduval_edutainment',
    'eduval_fun',
    'eduval_task',
    'eduval_unknown',
    'eduval_junk',
  ].includes(value)
    ? (value as EduValue)
    : undefined;
};

export const withEduValueCompatibilityAliases = (values: ReadonlyArray<string>): EduValue[] => {
  const expanded = new Set<EduValue>();

  for (const value of values || []) {
    if (value === 'eduval_educational' || value === 'eduval_academic') {
      expanded.add('eduval_educational');
      continue;
    }

    if (value === 'eduval_mixed' || value === 'eduval_edutainment') {
      expanded.add('eduval_edutainment');
      continue;
    }

    if (value === 'eduval_social') {
      expanded.add('eduval_junk');
      continue;
    }

    if (
      [
        'eduval_fun',
        'eduval_task',
        'eduval_unknown',
        'eduval_junk',
      ].includes(value)
    ) {
      expanded.add(value as EduValue);
    }
  }

  return Array.from(expanded);
};

// "Food label" style metadata for content usage types.
// This is intentionally not item-specific; it describes what each type *means*.
export const eduValueNutritionLabels: Record<EduValue, ContentTypeNutritionLabel> = {
  eduval_unknown: {
    title: 'Unassigned',
    tagline: 'Not reviewed yet — will be auto-categorized as we learn more.',
    description:
      'Use when the content has not been reviewed yet, is newly added, or we do not have enough signal to classify it. Kindredly may auto-categorize over time as we observe patterns — you can always override it for clarity.',
    ingredients: [
      { name: 'Unknown intent', note: 'We do not know why the user is here yet.' },
      { name: 'Mixed signals', note: 'Some educational, some entertainment, unclear overall.' },
      { name: 'Low confidence classification', note: 'Site/app does not match known patterns.' },
    ],
    dailyDietGuidance: [
      'Treat as “needs labeling” — review soon after it appears in a child’s routine.',
      'If you notice repeated usage, assign a specific type for better limits and reporting.',
    ],
    examples: ['Newly discovered websites', 'New YouTube channels', 'Uncategorized apps'],
  },

  eduval_educational: {
    title: 'Educational',
    tagline: 'Primarily learning-oriented.',
    description:
      'Content created to teach, inform, or build skills. This can include creative learning activities like drawing, painting, crafting, and making — less structured than academic content, but still learning-first.',
    ingredients: [
      { name: 'Skill-building' },
      { name: 'Clear explanations' },
      { name: 'Helpful examples' },
    ],
    dailyDietGuidance: [
      'A strong default for “good internet”.',
      'Pair with reflection: “What did you learn?”',
    ],
    examples: ['Tutorials', 'Documentaries', 'How-to guides'],
  },

  eduval_edutainment: {
    title: 'Edu-tainment',
    tagline: 'Entertainment with some learning value.',
    description:
      'Designed to engage first and teach second. Can be a great bridge into deeper learning when guided.',
    ingredients: [
      { name: 'Engagement first' },
      { name: 'Teachable moments' },
      { name: 'Light facts and explanations' },
    ],
    dailyDietGuidance: [
      'Good in moderation; best used as a gateway to “Educational” or “Academic”.',
      'Watch for autoplay and endless feeds that erode the learning portion.',
    ],
    examples: ['Educational games', 'Light science videos', 'History “fun facts” content'],
  },

  eduval_fun: {
    title: 'Entertainment',
    tagline: 'Fun-first, low learning density.',
    description:
      'Primarily for enjoyment and relaxation. Healthy entertainment is real — but it should not crowd out sleep, school, and relationships.',
    ingredients: [
      { name: 'Relaxation and fun' },
      { name: 'Story and humor' },
      { name: 'Occasional learning (incidental)' },
    ],
    dailyDietGuidance: [
      'Plan it like dessert: enjoyable, intentional, and time-bounded.',
      'Prefer finite experiences over infinite scroll.',
    ],
    examples: ['Shows/movies', 'Non-educational games', 'Comedy videos'],
  },

  eduval_task: {
    title: 'Task-Related',
    tagline: 'Utility and productivity.',
    description:
      'Tools and resources used to complete a task: writing, planning, schoolwork logistics, creative projects, and communication for a purpose.',
    ingredients: [
      { name: 'Utility' },
      { name: 'Focus support' },
      { name: 'Clear end states', note: 'A task finishes; it’s not infinite.' },
    ],
    dailyDietGuidance: [
      'Great default for tools and work sessions.',
      'If a “task tool” becomes procrastination, reconsider its type.',
    ],
    examples: ['Docs and notes', 'Calendars', 'Research tools'],
  },

  eduval_junk: {
    title: 'Junk Content',
    tagline: 'Junk, high pull.',
    description:
      'Content that is misleading, clickbait, rage-bait, or designed to be compulsive. Not “evil”, but easy to overconsume and often leaves users feeling worse.',
    ingredients: [
      { name: 'Clickbait / compulsion loops' },
      { name: 'Low informational value' },
      { name: 'High monetization pressure', note: 'Heavy ads, tracking, or manipulative tactics.' },
    ],
    dailyDietGuidance: [
      'Treat as “rare and intentional” — use strong time limits or blocks.',
      'If it causes conflict, sleep loss, or mood issues, reduce further.',
    ],
    examples: ['Clickbait sites', 'Endless meme scrolling', 'Low-quality viral feeds'],
  },
};

let colorLookup = {
  'blue': "#3b82f6", // Blue
  'blueDark': "#1d4ed8", // Dark Blue
  'red': "#ef4444", // Red
  'redDark': "#dc2626", // Dark Red
  'green': "#10b981", // Green
  'greenDark': "#16a34a", // Dark Green
  'yellow': "#f59e0b", // Yellow
  'yellowDark': "#d97706", // Dark Amber
  'purple': "#8b5cf6", // Purple
  'cyan': "#06b6d4", // Cyan
  'orange': "#f97316", // Orange
  'orangeDark': "#ea580c", // Dark Orange
  'lime': "#84cc16", // Lime
  'pink': "#ec4899", // Pink
  'indigo': "#6366f1", // Indigo
  'teal': "#14b8a6", // Teal
  'rose': "#f43f5e", // Rose
  'violet': "#a855f7", // Violet
  'sky': "#0ea5e9", // Sky
  'emerald': "#22c55e", // Emerald
  'gray': "#6b7280", // Gray
};

let defaultIcon = null;// 'activity'
export const eduTagList: TagOptionDetail<EduValue>[] = [

    {
      key: 'eduval_unknown', name: 'Unassigned (auto)', selectedName: 'Unknown', description: 'Not assigned or unknown.'
      , extraDetails: 'Unassigned or unknown value',
      hideFromSearch: true,
      color: colorLookup['gray'], icon: defaultIcon || 'question-circle'
    },
    {
      key: 'eduval_task',
      name: 'Task-Related',
      description: 'Productivity or task-related',
      extraDetails: 'Content or tools designed to help users complete tasks, improve organization, or boost efficiency. Includes document management,productivity apps and resources.'
      , color: colorLookup['sky'], icon: defaultIcon || 'check2-square'
    },
    {
      key: 'eduval_educational',
      name: 'Educational',
      description: 'Primarily educational',
      extraDetails: 'Content created to teach, inform, or instruct the audience. Examples include tutorials, how-to guides, and instructional materials commonly used in schools, training programs, and online courses.'
      , color: colorLookup['blueDark'], icon: defaultIcon || 'book'
    },
    {
      key: 'eduval_edutainment',
      name: 'Edu-tainment',
      description: 'Contains some educational value',
      extraDetails: 'A mix of education and entertainment. Designed to inform while engaging the audience, such as educational games, documentaries, or educational TV shows.'
      , color: colorLookup['greenDark'], icon: defaultIcon || 'journal-text'
    },
    {
      key: 'eduval_fun',
      name: 'Entertainment',
      description: 'Wholesome entertainment',
      extraDetails: 'Content focused on entertainment and enjoyment, suitable for general audiences.'
      , color: colorLookup['orange'], icon: defaultIcon || 'emoji-smile'
    },
    {
      key: 'eduval_junk',
      name: 'Junk Content',
      selectedName: 'Junk',
      description: 'Potentially unhealthy or low-value',
      extraDetails: 'Content considered addictive, misleading, clickbait, or lacking substantive value. Acceptable occasionally, but best consumed in moderation.',
      hideFromSearch: true,
      color: colorLookup['redDark'], icon: defaultIcon || 'exclamation-triangle'
    },


    // { key:'eduval_sexual', name: 'Sexual Content', description: 'Sexual or suggestive content',
    //   extraDetails: 'Sexual content includes material that is sexually suggestive or explicit.'
    // },
    // {
    //   key:'eduval_harmful', name: 'Harmful Content', description: 'Harmful or dangerous content',
    //   extraDetails: 'Harmful content includes material that promotes violence, hate speech, or other dangerous activities. This type of content is typically not suitable for any audience and may violate community guidelines'
    // }

  ]


export const minAgeTagList: TagOptionDetail<MinAgeGroup>[] = [
  { key: 'minage_na', name: 'NA' },
  { key: 'minage_unknown', name: 'Unassigned' },
  { key: 'minage_prek', name: 'Pre-K (0-5)' },
  { key: 'minage_kids', name: 'Young Kids (5-10)' },
  { key: 'minage_preteen', name: 'Pre-Teens (10-12)' },
  { key: 'minage_teen', name: 'Teens (13-17)' },
  { key: 'minage_adult', name: 'Adults' },
];

export const targetAudienceTagList: TagOptionDetail<TargetAudience>[] = [
  { key: 'ta_all', name: 'All' },
  { key: 'ta_prek', name: 'Pre-K (0-5)' },
  { key: 'ta_kids', name: 'Young Kids (5-10)' },
  { key: 'ta_preteen', name: 'Pre-Teens (10-12)' },
  { key: 'ta_teen', name: 'Teens (13-17)' },
  { key: 'ta_adult', name: 'Adults' },
];

export const costTagList = [
  { key: 'cost_free', name: 'Free' },
  { key: 'cost_freewithpaid', name: 'Partially Free' },
  { key: 'cost_paid', name: 'Paid' },
];

export const adsTagList: TagOptionDetail<Ads>[] = [
  { key: 'ads_no', name: 'No Ads' },
  { key: 'ads_l', name: 'Low' },
  { key: 'ads_m', name: 'Medium' },
  { key: 'ads_h', name: 'High' },
];

export const costDetailsTagList: TagOptionDetail<CostDetails>[] = [
  { key: 'costd_pay2rm', name: 'Pay to remove Ads' },
  { key: 'costd_no3rdpartyads', name: 'No 3rd party Ads' },
  { key: 'costd_nosignin', name: 'No account needed' },
  { key: 'costd_opensource', name: 'Open Source' },
];

export const contentTypeTagList: TagOptionDetail<ContentType>[] = [
  { key: 'ct_app', name: 'App or tool' },
  { key: 'ct_article', name: 'Article' },
  { key: 'ct_cntcreator', name: 'Content Creator' },
  { key: 'ct_game', name: 'Game' },
  { key: 'ct_music', name: 'Music' },
  { key: 'ct_org', name: 'Organzation' },
  { key: 'ct_phy_product', name: 'Physical Product' },
  { key: 'ct_ref', name: 'Reference/Data Resource' },
  { key: 'ct_video', name: 'Video' },
];

export const topicTagList: TagOptionDetail<TopicTag>[] = [
  { key: 'topic_streaming_tv', name: 'Streaming TV', description: 'Shows and streaming TV content', icon: 'tv' },
  { key: 'topic_movies', name: 'Movies', description: 'Movie watching and film content', icon: 'film' },
  { key: 'topic_kids_shows', name: 'Kids Shows', description: 'Child-focused shows and series', icon: 'emoji-smile' },
  { key: 'topic_anime', name: 'Anime', description: 'Anime shows and films', icon: 'tv' },
  { key: 'topic_music_listening', name: 'Music (Listening)', description: 'Listening to music and playlists', icon: 'music-note-beamed' },
  { key: 'topic_music_creation', name: 'Music (Creating)', description: 'Making, composing, or producing music', icon: 'music-note' },
  { key: 'topic_podcasts', name: 'Podcasts', description: 'Podcast listening', icon: 'mic' },
  { key: 'topic_video_games', name: 'Video Games', description: 'Gaming (general)', icon: 'controller' },
  { key: 'topic_sandbox_games', name: 'Sandbox / Builder Games', description: 'Minecraft-like sandbox play', icon: 'box' },
  { key: 'topic_memes_humor', name: 'Memes & Humor', description: 'Humor, memes, comedy content', icon: 'emoji-laughing' },

  { key: 'topic_social_feed', name: 'Social Feed', description: 'Algorithmic social feeds and timelines', icon: 'people' },
  { key: 'topic_forums', name: 'Forums / Communities', description: 'Forums, message boards, community threads', icon: 'chat-dots' },
  { key: 'topic_group_chat', name: 'Group Chat', description: 'Messaging and group chat apps', icon: 'chat-square-text' },
  { key: 'topic_creator_channels', name: 'Creator Channels', description: 'Creator channels and subscriptions', icon: 'person-video3' },

  { key: 'topic_short_video_infinite_scroll', name: 'Short Video (Infinite Scroll)', description: 'Endless short-form video feeds', icon: 'arrow-repeat' },
  { key: 'topic_clickbait_sensational_news', name: 'Clickbait / Sensational News', description: 'Sensational, rage-bait, or clickbait news', icon: 'newspaper' },

  { key: 'topic_homework_help', name: 'Homework Help', description: 'Homework assistance and study help', icon: 'mortarboard' },
  { key: 'topic_math_practice', name: 'Math Practice', description: 'Math drills, practice, and tutoring', icon: 'calculator' },
  { key: 'topic_language_learning', name: 'Language Learning', description: 'Language learning tools and lessons', icon: 'translate' },
  { key: 'topic_coding_tutorials', name: 'Coding Tutorials', description: 'Programming tutorials and lessons', icon: 'code-slash' },
  { key: 'topic_science_learning', name: 'Science Learning', description: 'Science education and experiments', icon: 'beaker' },
  { key: 'topic_history_civics', name: 'History & Civics', description: 'History, civics, and society learning', icon: 'book' },
  { key: 'topic_reference_research', name: 'Reference & Research', description: 'Reference and research resources', icon: 'search' },
  { key: 'topic_documentaries', name: 'Documentaries', description: 'Educational documentaries', icon: 'camera-reels' },
];

export const intentTagList: TagOptionDetail<IntentTag>[] = [
  { key: 'intent_learn', name: 'Learn', description: 'Learning, studying, skill-building', icon: 'mortarboard' },
  { key: 'intent_create', name: 'Create', description: 'Making/building something (projects, art, game dev)', icon: 'brush' },
  { key: 'intent_task', name: 'Task', description: 'Getting something done (planning, docs, logistics)', icon: 'check2-square' },
  { key: 'intent_play', name: 'Play', description: 'Playing games / play-first', icon: 'controller' },
  { key: 'intent_relax', name: 'Relax', description: 'Unwinding, entertainment, leisure', icon: 'emoji-smile' },
  { key: 'intent_socialize', name: 'Socialize', description: 'Chatting, posting, social interaction', icon: 'people' },
  { key: 'intent_news', name: 'News', description: 'Reading news and current events', icon: 'newspaper' },
  { key: 'intent_doomscroll', name: 'Doomscroll', description: 'Endless feed scrolling / high-pull consumption', icon: 'arrow-repeat' },
];

export interface UseCriteriaDataOptions {
  eduValue?: EduValue[];
  minAgeGroup?: MinAgeGroup[];
  targetAudiences?: TargetAudience[];
  cost?: Cost[];
  ads?: Ads[];
  costDetails?: CostDetails[];
  contentTypes?: ContentType[];
  topics?: TopicTag[];
  intent?: IntentTag[];
}
export const tagOptionsMap: UseCriteriaDataOptions = {
  eduValue: eduTagList.map((tag) => tag.key) as EduValue[],
  minAgeGroup: minAgeTagList.map((tag) => tag.key) as MinAgeGroup[],
  targetAudiences: targetAudienceTagList.map((tag) => tag.key) as TargetAudience[],
  cost: costTagList.map((tag) => tag.key) as Cost[],
  ads: adsTagList.map((tag) => tag.key) as Ads[],
  costDetails: costDetailsTagList.map((tag) => tag.key) as CostDetails[],
  contentTypes: contentTypeTagList.map((tag) => tag.key) as ContentType[],
  topics: topicTagList.map((tag) => tag.key) as TopicTag[],
  intent: intentTagList.map((tag) => tag.key) as IntentTag[],
};

export const tagOptionsWithDetailsMap = {
  eduValue: eduTagList,
  minAgeGroup: minAgeTagList,
  targetAudiences: targetAudienceTagList,
  cost: costTagList,
  ads: adsTagList,
  costDetails: costDetailsTagList,
  contentTypes: contentTypeTagList,
  topics: topicTagList,
  intent: intentTagList,
};


const eduValTagMap = Object.fromEntries(eduTagList.map((v) => [v.key, v]));

const critTagMap =  Object.fromEntries(
  Object.values(tagOptionsWithDetailsMap).flat().map((v) => [v.key, v])
);

function getTagOptionsMapWithDetails() {
  return tagOptionsWithDetailsMap;
}

function getTagName(tag: string) {
  return critTagMap[tag]?.name;
}
export function getEduValueInfoFromTag(tag: string) {
  const normalized = normalizeEduValueAlias(tag);
  return eduValTagMap[normalized || tag];
}
export function getEduValueTagNameSelected(tag: string) {
  const normalized = normalizeEduValueAlias(tag);
  return eduValTagMap[normalized || tag]?.selectedName || eduValTagMap[normalized || tag]?.name;
}

export const isEducationalValue = (tag: string) => {

  return [
    'eduval_educational']
    .includes(tag);
};



export function getUseCriteriaObjWithKeys(tags: Array<string>) {
  const result = {
    eduValue: undefined as EduValue | undefined,
    minAgeGroup: undefined as MinAgeGroup | undefined,
    targetAudiences: [] as Array<TargetAudience>,
    cost: undefined as Cost | undefined,
    ads: undefined as Ads | undefined,
    costDetails: [] as Array<CostDetails>,
    contentTypes: [] as Array<ContentType>,
    topics: [] as Array<TopicTag>,
    intent: undefined as IntentTag | undefined,

  } satisfies UseCriteriaData;
  try {
    for (const tagKey of tags) {

      const tagVal = tagKey;
      if (tagKey.startsWith('eduval_')) {
        result.eduValue = normalizeEduValueAlias(tagVal) || (tagVal as EduValue);
      } else if (tagKey.startsWith('minage_')) {
        result.minAgeGroup = tagVal as MinAgeGroup;
      } else if (tagKey.startsWith('ta_')) {

        result.targetAudiences.push(tagVal as TargetAudience);
      } else if (tagKey.startsWith('cost_')) {
        result.cost = tagVal as Cost;
      } else if (tagKey.startsWith('ads_') || tagKey.startsWith('ad_')) {
        result.ads = tagVal as Ads;
      } else if (tagKey.startsWith('costd_')) {
        result.costDetails.push(tagVal as CostDetails);
      } else if (tagKey.startsWith('ct_')) {
        result.contentTypes.push(tagVal as ContentType);
      } else if (tagKey.startsWith('topic_')) {
        result.topics.push(tagVal as TopicTag);
      } else if (tagKey.startsWith('intent_')) {
        result.intent = tagVal as IntentTag;
      }
    }
  } catch (e) {
    return result;
    //
  }

  return result;
}

export function isEligibleForRestrictedLibraryHide(tags?: Array<string> | null): boolean {
  if (!Array.isArray(tags) || tags.length === 0) {
    return false;
  }

  const criteria = getUseCriteriaObjWithKeys(tags);
  return !!criteria.eduValue && criteria.eduValue !== 'eduval_unknown';
}


export function getUseCriteriaObjWithInfo(tags: Array<string>) {
  const result = {
    eduValue: undefined as TagOptionDetail<EduValue> | undefined,
    minAgeGroup: undefined as TagOptionDetail<MinAgeGroup> | undefined,
    targetAudiences: [] as Array<TagOptionDetail<TargetAudience>>,
    cost: undefined as TagOptionDetail<Cost> | undefined,
    ads: undefined as TagOptionDetail<Ads> | undefined,
    costDetails: [] as Array<TagOptionDetail<CostDetails>>,
    contentTypes: [] as Array<TagOptionDetail<ContentType>>,
    topics: [] as Array<TagOptionDetail<TopicTag>>,
    intent: undefined as TagOptionDetail<IntentTag> | undefined,

  } satisfies UseCriteriaDataWithDetails;
  try {
    for (const tagKey of tags) {

      const tagVal =  {
        ...critTagMap[normalizeEduValueAlias(tagKey) || tagKey],
        key: normalizeEduValueAlias(tagKey) || tagKey,
      };

      if (tagKey.startsWith('eduval_')) {
        result.eduValue = tagVal as TagOptionDetail<EduValue>;
      } else if (tagKey.startsWith('minage_')) {
        result.minAgeGroup = tagVal as TagOptionDetail<MinAgeGroup>;
      } else if (tagKey.startsWith('ta_')) {

        result.targetAudiences.push(tagVal as TagOptionDetail<TargetAudience>);
      } else if (tagKey.startsWith('cost_')) {
        result.cost = tagVal as TagOptionDetail<Cost>;
      } else if (tagKey.startsWith('ads_') || tagKey.startsWith('ad_')) {
        result.ads = tagVal as TagOptionDetail<Ads>;
      } else if (tagKey.startsWith('costd_')) {
        result.costDetails.push(tagVal as TagOptionDetail<CostDetails>);
      } else if (tagKey.startsWith('ct_')) {
        result.contentTypes.push(tagVal as TagOptionDetail<ContentType>);
      } else if (tagKey.startsWith('topic_')) {
        result.topics.push(tagVal as TagOptionDetail<TopicTag>);
      } else if (tagKey.startsWith('intent_')) {
        result.intent = tagVal as TagOptionDetail<IntentTag>;
      }
    }
  } catch (e) {
    return result;
    //
  }

  return result;
}

function getUseCriteriaObject(tags: Array<string>) {
  return getUseCriteriaObjWithKeys(tags);
}

export type TopicRollup = {
  eduValue?: EduValue;
  contentTypes?: ReadonlyArray<ContentType>;
};

// Default rollup mapping. This is intentionally conservative and can be expanded over time.
export const topicRollupMap: Record<TopicTag, TopicRollup> = {
  topic_streaming_tv: { eduValue: 'eduval_fun', contentTypes: ['ct_video'] },
  topic_movies: { eduValue: 'eduval_fun', contentTypes: ['ct_video'] },
  topic_kids_shows: { eduValue: 'eduval_fun', contentTypes: ['ct_video'] },
  topic_anime: { eduValue: 'eduval_fun', contentTypes: ['ct_video'] },
  topic_music_listening: { eduValue: 'eduval_fun', contentTypes: ['ct_music'] },
  topic_music_creation: { eduValue: 'eduval_educational', contentTypes: ['ct_music', 'ct_app'] },
  topic_podcasts: { eduValue: 'eduval_edutainment', contentTypes: ['ct_music'] },
  topic_video_games: { eduValue: 'eduval_fun', contentTypes: ['ct_game'] },
  topic_sandbox_games: { eduValue: 'eduval_edutainment', contentTypes: ['ct_game'] },
  topic_memes_humor: { eduValue: 'eduval_fun', contentTypes: ['ct_article', 'ct_video'] },
  topic_social_feed: { eduValue: 'eduval_junk', contentTypes: ['ct_cntcreator', 'ct_video', 'ct_article'] },
  topic_forums: { eduValue: 'eduval_junk', contentTypes: ['ct_article', 'ct_org'] },
  topic_group_chat: { eduValue: 'eduval_junk', contentTypes: ['ct_app'] },
  topic_creator_channels: { eduValue: 'eduval_junk', contentTypes: ['ct_cntcreator', 'ct_video'] },
  topic_short_video_infinite_scroll: { eduValue: 'eduval_junk', contentTypes: ['ct_video'] },
  topic_clickbait_sensational_news: { eduValue: 'eduval_junk', contentTypes: ['ct_article'] },
  topic_homework_help: { eduValue: 'eduval_educational', contentTypes: ['ct_ref', 'ct_article'] },
  topic_math_practice: { eduValue: 'eduval_educational', contentTypes: ['ct_app', 'ct_ref'] },
  topic_language_learning: { eduValue: 'eduval_educational', contentTypes: ['ct_app'] },
  topic_coding_tutorials: { eduValue: 'eduval_educational', contentTypes: ['ct_article', 'ct_video', 'ct_app'] },
  topic_science_learning: { eduValue: 'eduval_educational', contentTypes: ['ct_article', 'ct_video', 'ct_ref'] },
  topic_history_civics: { eduValue: 'eduval_educational', contentTypes: ['ct_article', 'ct_video', 'ct_ref'] },
  topic_reference_research: { eduValue: 'eduval_task', contentTypes: ['ct_ref', 'ct_article'] },
  topic_documentaries: { eduValue: 'eduval_educational', contentTypes: ['ct_video'] },
};

export function deriveRollupFromCriteria(input: {
  topics?: ReadonlyArray<TopicTag> | null;
  intent?: IntentTag | null;
}): {
  recommendedEduValue?: EduValue;
  recommendedContentTypes: ContentType[];
} {
  const topics = (input.topics || []) as ReadonlyArray<TopicTag>;
  const intent = input.intent || null;
  const recommendedContentTypes = new Set<ContentType>();
  const eduValueCounts = new Map<EduValue, number>();

  for (const topic of topics) {
    const rollup = topicRollupMap[topic];
    if (!rollup) continue;

    if (rollup.contentTypes) {
      for (const ct of rollup.contentTypes) recommendedContentTypes.add(ct);
    }

    if (rollup.eduValue) {
      eduValueCounts.set(rollup.eduValue, (eduValueCounts.get(rollup.eduValue) ?? 0) + 1);
    }
  }

  // Intent is a strong signal about rollup. Treat as an override when present.
  // This is what allows distinctions like:
  // - topic_video_games + intent_learn   -> educational
  // - topic_video_games + intent_play    -> fun
  // - topic_video_games + intent_create  -> educational/task
  const intentEduValue: Record<IntentTag, EduValue> = {
    intent_learn: 'eduval_educational',
    intent_create: 'eduval_educational',
    intent_task: 'eduval_task',
    intent_play: 'eduval_fun',
    intent_relax: 'eduval_fun',
    intent_socialize: 'eduval_junk',
    intent_news: 'eduval_educational',
    intent_doomscroll: 'eduval_junk',
  };

  if (intent) {
    // Bias the counts heavily so it wins ties and usually wins outright.
    const v = intentEduValue[intent];
    eduValueCounts.set(v, (eduValueCounts.get(v) ?? 0) + 100);
  }

  // If multiple values are present, choose the most frequent. Tie-breaker order is conservative.
  const tieBreaker: EduValue[] = [
    'eduval_junk',
    'eduval_fun',
    'eduval_edutainment',
    'eduval_task',
    'eduval_educational',
    'eduval_unknown',
  ];

  let recommendedEduValue: EduValue | undefined;
  let bestCount = 0;
  for (const value of tieBreaker) {
    const count = eduValueCounts.get(value) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      recommendedEduValue = value;
    }
  }

  return {
    recommendedEduValue: bestCount > 0 ? recommendedEduValue : undefined,
    recommendedContentTypes: Array.from(recommendedContentTypes),
  };
}

export {

  getTypeNameLookup as getEntityNameMap,

  getTagOptionsMapWithDetails,
  getTagName,
  getUseCriteriaObject
};

