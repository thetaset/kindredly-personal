import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SOCIAL_MEDIA_DOMAINS } from '../src/url.utils';
import {
  SOCIAL_MEDIA_EXCEPTIONS_MAX,
  classifySocialMediaUrl,
  isSocialTimeLimitRule,
  socialBlockedByTimeLimits,
  withSocialAppCategory,
  withSocialTimeLimitForBlock,
  isSameSocialPost,
  isShortLinkToResolve,
  tidyResolvedUrl,
  normalizeExceptionEntry,
  normalizeSocialMediaSettings,
  socialEmbedUrl,
  socialExceptionMatches,
  socialSiteForHost,
  socialSiteInScope,
  untranslatedHost,
} from '../src/restrictions/socialMedia';

describe('socialSiteForHost', () => {
  it('names each site once, subdomains and aliases included', () => {
    expect(socialSiteForHost('www.tiktok.com')).toBe('tiktok.com');
    expect(socialSiteForHost('m.facebook.com')).toBe('facebook.com');
    expect(socialSiteForHost('fb.com')).toBe('facebook.com');
    expect(socialSiteForHost('twitter.com')).toBe('x.com');
    expect(socialSiteForHost('old.reddit.com')).toBe('reddit.com');
    expect(socialSiteForHost('threads.net')).toBe('threads.com');
    expect(socialSiteForHost('xcancel.com')).toBe('xcancel.com');
  });

  it('is not fooled by a name that only ends the same way', () => {
    expect(socialSiteForHost('nottiktok.com')).toBeNull();
    expect(socialSiteForHost('tiktok.com.evil.io')).toBeNull();
  });

  it('leaves messaging apps and YouTube out', () => {
    expect(socialSiteForHost('web.whatsapp.com')).toBeNull();
    expect(socialSiteForHost('messenger.com')).toBeNull();
    expect(socialSiteForHost('youtube.com')).toBeNull();
    expect(socialSiteForHost('discord.com')).toBe('discord.com');
  });

  it('sees through a Google Translate copy', () => {
    expect(untranslatedHost('www-tiktok-com.translate.goog')).toBe('tiktok.com');
    expect(untranslatedHost('my--site-example-com.translate.goog')).toBe('my-site.example.com');
    expect(socialSiteForHost('www-reddit-com.translate.goog')).toBe('reddit.com');
  });
});

describe('classifySocialMediaUrl', () => {
  const post = (url: string | null) => classifySocialMediaUrl(url);

  it('recognises one post or video on each site', () => {
    expect(post('https://www.tiktok.com/@cat/video/7301234567890')).toEqual({ site: 'tiktok.com', kind: 'post', postId: '7301234567890' });
    expect(post('https://www.tiktok.com/@cat/photo/7301234567890')?.kind).toBe('post');
    expect(post('https://www.instagram.com/reel/C1a2B3c4D5e/')).toEqual({ site: 'instagram.com', kind: 'post', postId: 'C1a2B3c4D5e' });
    expect(post('https://www.instagram.com/p/C1a2B3c4D5e/?igsh=abc')?.postId).toBe('C1a2B3c4D5e');
    expect(post('https://twitter.com/nasa/status/1790000000000000000')).toEqual({ site: 'x.com', kind: 'post', postId: '1790000000000000000' });
    expect(post('https://www.facebook.com/nasa/posts/pfbid0abc')?.postId).toBe('pfbid0abc');
    expect(post('https://www.facebook.com/nasa/videos/123456789')?.postId).toBe('123456789');
    expect(post('https://www.facebook.com/groups/parents/posts/987654321')?.postId).toBe('987654321');
    expect(post('https://www.facebook.com/reel/555')?.postId).toBe('555');
    expect(post('https://www.facebook.com/watch/?v=777')?.postId).toBe('777');
    expect(post('https://www.facebook.com/permalink.php?story_fbid=42&id=1')?.postId).toBe('42');
    expect(post('https://www.reddit.com/r/aww/comments/1ABcd2/cute_dog/')).toEqual({ site: 'reddit.com', kind: 'post', postId: '1abcd2' });
    expect(post('https://www.pinterest.com/pin/123456/')?.postId).toBe('123456');
    expect(post('https://www.threads.net/@nasa/post/C9xYz')).toEqual({ site: 'threads.com', kind: 'post', postId: 'C9xYz' });
    expect(post('https://bsky.app/profile/nasa.gov/post/3kabc')?.postId).toBe('3kabc');
    expect(post('https://www.linkedin.com/posts/nasa_space-activity-123')?.kind).toBe('post');
    expect(post('https://nasa.tumblr.com/post/12345/moon')?.postId).toBe('12345');
  });

  it('calls everything else on a social site the site', () => {
    for (const url of [
      'https://www.tiktok.com/',
      'https://www.tiktok.com/foryou',
      'https://www.tiktok.com/@cat',
      'https://www.tiktok.com/tag/cats',
      'https://www.instagram.com/explore/',
      'https://www.instagram.com/nasa/',
      'https://x.com/home',
      'https://www.reddit.com/r/aww/',
      'https://www.facebook.com/watch/',
      'https://www.pinterest.com/search/pins/?q=cats',
      'https://discord.com/channels/@me',
    ]) {
      expect(classifySocialMediaUrl(url)?.kind).toBe('site');
    }
  });

  it('counts YouTube Shorts and nothing else on YouTube', () => {
    expect(post('https://www.youtube.com/shorts/abc123XYZ_-')).toEqual({ site: 'youtube.com', kind: 'post', postId: 'abc123XYZ_-' });
    expect(post('https://m.youtube.com/shorts/')).toEqual({ site: 'youtube.com', kind: 'site' });
    expect(post('https://www.youtube.com/watch?v=abc')).toBeNull();
    expect(post('https://www.youtube.com/')).toBeNull();
  });

  it('marks embed pages as the same post', () => {
    expect(post('https://www.tiktok.com/embed/v2/7301234567890')).toEqual({ site: 'tiktok.com', kind: 'post', postId: '7301234567890', isEmbed: true });
    expect(post('https://www.tiktok.com/player/v1/7301234567890')?.isEmbed).toBe(true);
    expect(post('https://www.instagram.com/p/C1a2B3c4D5e/embed/')).toEqual({ site: 'instagram.com', kind: 'post', postId: 'C1a2B3c4D5e', isEmbed: true });
    expect(isSameSocialPost('https://www.tiktok.com/@cat/video/7301234567890', 'https://www.tiktok.com/embed/v2/7301234567890')).toBe(true);
    expect(isSameSocialPost('https://www.tiktok.com/@cat/video/7301234567890', 'https://www.tiktok.com/@cat/video/73012345678901')).toBe(false);
    expect(isSameSocialPost('https://x.com/a/status/1', 'https://twitter.com/b/status/1')).toBe(true);
    expect(isSameSocialPost('https://www.tiktok.com/@cat', 'https://www.tiktok.com/@cat')).toBe(false);
  });

  it('holds short links until they are followed', () => {
    expect(post('https://vm.tiktok.com/ZMabc/')).toEqual({ site: 'tiktok.com', kind: 'shortLink' });
    expect(post('https://www.tiktok.com/t/ZTabc/')).toEqual({ site: 'tiktok.com', kind: 'shortLink' });
    expect(post('https://pin.it/1abc')).toEqual({ site: 'pinterest.com', kind: 'shortLink' });
    expect(post('https://fb.watch/abc/')).toEqual({ site: 'facebook.com', kind: 'shortLink' });
    expect(post('https://www.facebook.com/share/r/abc123/')).toEqual({ site: 'facebook.com', kind: 'shortLink' });
    expect(post('https://www.reddit.com/r/aww/s/AbC123')).toEqual({ site: 'reddit.com', kind: 'shortLink' });
    expect(post('https://redd.it/1ABcd2')).toEqual({ site: 'reddit.com', kind: 'post', postId: '1abcd2' });
  });

  it('reads a translated copy as the site it copies', () => {
    expect(post('https://www-tiktok-com.translate.goog/@cat/video/123?_x_tr_sl=auto')).toEqual({ site: 'tiktok.com', kind: 'post', postId: '123' });
    expect(post('https://www-tiktok-com.translate.goog/foryou')?.kind).toBe('site');
  });

  it('is null for anything that is not social media', () => {
    expect(post('https://www.nytimes.com/2026/10/12/tiktok.html')).toBeNull();
    expect(post('https://example.com/?u=https://tiktok.com')).toBeNull();
    expect(post('chrome://settings')).toBeNull();
    expect(post('')).toBeNull();
    expect(post(null)).toBeNull();
  });
});

// SMB-15: Android and iOS keep a social site's links in their browsers from their own copies of the list.
describe('the native copies of the social site list', () => {
  const quoted = (block: string) => [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]).sort();
  const client = resolve(__dirname, '../../tset-client');

  it('Android has the same list as SOCIAL_MEDIA_DOMAINS', () => {
    const kotlin = readFileSync(`${client}/android/app/src/main/java/com/thetaset/kindred/OtherAppsRules.kt`, 'utf8');
    const block = /private val socialHosts = listOf\(([\s\S]*?)\)/.exec(kotlin)?.[1] ?? '';
    expect(quoted(block)).toEqual([...SOCIAL_MEDIA_DOMAINS].sort());
  });

  it('iOS has the same list as SOCIAL_MEDIA_DOMAINS', () => {
    const swift = readFileSync(`${client}/ios/App/App/BrowserPrivacySettings.swift`, 'utf8');
    const block = /private static let socialHosts = \[([\s\S]*?)\]/.exec(swift)?.[1] ?? '';
    expect(quoted(block)).toEqual([...SOCIAL_MEDIA_DOMAINS].sort());
  });
});

// SMB-4: short links are followed when an item is saved, and stored as the post's own address.
describe('short links', () => {
  it('follows social short links and t.co, nothing else', () => {
    expect(isShortLinkToResolve('https://vm.tiktok.com/ZMabc123/')).toBe(true);
    expect(isShortLinkToResolve('https://www.tiktok.com/t/ZTabc123/')).toBe(true);
    expect(isShortLinkToResolve('https://pin.it/3xYz')).toBe(true);
    expect(isShortLinkToResolve('https://t.co/AbC123')).toBe(true);
    expect(isShortLinkToResolve('https://t.co/')).toBe(false);
    expect(isShortLinkToResolve('https://redd.it/abc12')).toBe(false); // already the post's id
    expect(isShortLinkToResolve('https://www.tiktok.com/@kid/video/123')).toBe(false);
    expect(isShortLinkToResolve('https://bit.ly/abc')).toBe(false);
    expect(isShortLinkToResolve(null)).toBe(false);
  });

  it('drops the share tracking when the post is the same without it', () => {
    expect(tidyResolvedUrl('https://www.tiktok.com/@kid/video/7300000000000000001?_r=1&_t=8abc'))
      .toBe('https://www.tiktok.com/@kid/video/7300000000000000001');
    expect(tidyResolvedUrl('https://www.instagram.com/reel/Cx1abc/?igsh=xyz')).toBe('https://www.instagram.com/reel/Cx1abc/');
    expect(tidyResolvedUrl('https://www.facebook.com/watch?v=12345&ref=share')).toBe('https://www.facebook.com/watch?v=12345&ref=share');
    expect(tidyResolvedUrl('https://news.example.com/story?id=4')).toBe('https://news.example.com/story?id=4');
  });
});

describe('socialEmbedUrl', () => {
  it('gives TikTok and Instagram posts their just-the-post page', () => {
    expect(socialEmbedUrl('https://www.tiktok.com/@cat/video/7301234567890?is_from_webapp=1')).toBe('https://www.tiktok.com/embed/v2/7301234567890');
    expect(socialEmbedUrl('https://www.instagram.com/p/C1a2B3c4D5e/')).toBe('https://www.instagram.com/p/C1a2B3c4D5e/embed');
    expect(socialEmbedUrl('https://www.instagram.com/reel/C1a2B3c4D5e/')).toBe('https://www.instagram.com/reel/C1a2B3c4D5e/embed');
  });

  it('has none for an embed page, the site, or other sites', () => {
    expect(socialEmbedUrl('https://www.tiktok.com/embed/v2/7301234567890')).toBeNull();
    expect(socialEmbedUrl('https://www.tiktok.com/@cat')).toBeNull();
    expect(socialEmbedUrl('https://x.com/nasa/status/1')).toBeNull();
    expect(socialEmbedUrl('https://example.com/')).toBeNull();
  });
});

describe('Exceptions', () => {
  it('keeps social sites only, in one form', () => {
    expect(normalizeExceptionEntry('https://www.Reddit.com/r/Aww/?a=1')).toBe('reddit.com/r/aww');
    expect(normalizeExceptionEntry('twitter.com')).toBe('x.com');
    expect(normalizeExceptionEntry('  pinterest.com/  ')).toBe('pinterest.com');
    expect(normalizeExceptionEntry('youtube.com/shorts')).toBe('youtube.com/shorts');
    expect(normalizeExceptionEntry('youtube.com')).toBeNull();
    expect(normalizeExceptionEntry('school.org')).toBeNull();
    expect(normalizeExceptionEntry(42)).toBeNull();
  });

  it('matches the site and its subdomains, or a part of it and below', () => {
    expect(socialExceptionMatches(['pinterest.com'], 'https://www.pinterest.com/search/pins/?q=cats')).toBe(true);
    expect(socialExceptionMatches(['x.com'], 'https://twitter.com/home')).toBe(true);
    expect(socialExceptionMatches(['reddit.com/r/aww'], 'https://old.reddit.com/r/aww/comments/1/x')).toBe(true);
    expect(socialExceptionMatches(['reddit.com/r/aww'], 'https://www.reddit.com/r/awwards')).toBe(false);
    expect(socialExceptionMatches(['reddit.com/r/aww'], 'https://www.reddit.com/')).toBe(false);
    expect(socialExceptionMatches(['tiktok.com'], 'https://www.instagram.com/')).toBe(false);
    expect(socialExceptionMatches(['youtube.com/shorts'], 'https://www.youtube.com/shorts/abc')).toBe(true);
    expect(socialExceptionMatches([], 'https://www.tiktok.com/')).toBe(false);
    expect(socialExceptionMatches(null, 'https://www.tiktok.com/')).toBe(false);
  });
});

describe('normalizeSocialMediaSettings', () => {
  it('is null until a guardian has chosen', () => {
    expect(normalizeSocialMediaSettings(undefined)).toBeNull();
    expect(normalizeSocialMediaSettings({})).toBeNull();
    expect(normalizeSocialMediaSettings({ blocked: 'yes' })).toBeNull();
  });

  it('keeps the one-time notice only when it is one it knows (SMB-16)', () => {
    expect(normalizeSocialMediaSettings({ blocked: true, exceptions: [], notice: 'sites' })).toEqual({ blocked: true, exceptions: [], notice: 'sites' });
    expect(normalizeSocialMediaSettings({ blocked: true, exceptions: [], notice: 'nope' })).toEqual({ blocked: true, exceptions: [] });
  });

  it('cleans, dedupes and caps the Exceptions', () => {
    expect(normalizeSocialMediaSettings({ blocked: true })).toEqual({ blocked: true, exceptions: [] });
    expect(normalizeSocialMediaSettings({ blocked: true, exceptions: ['Pinterest.com', 'pinterest.com/', 'school.org', null] }))
      .toEqual({ blocked: true, exceptions: ['pinterest.com'] });
    const many = Array.from({ length: 80 }, (_, i) => `reddit.com/r/s${i}`);
    expect(normalizeSocialMediaSettings({ blocked: false, exceptions: many })!.exceptions).toHaveLength(SOCIAL_MEDIA_EXCEPTIONS_MAX);
  });
});

describe('the Social media time limit, written with the setting', () => {
  const social = (timeLimits: Array<{ hours: number; daysOfWeek: number[] }>, id = 'simple-social') => ({
    id, name: 'Social media', type: 'usage_only' as const,
    conditions: [{ type: 'socialDesignation' as const, values: ['social'] }],
    timeLimits,
  });
  const overall = { id: 'simple-overall', name: 'All Content', type: 'all' as const, timeLimits: [{ hours: 2, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }] };
  const weekdays = [1, 2, 3, 4, 5];
  const weekend = [0, 6];

  it('knows a social limit by its condition, never a custom limit', () => {
    expect(isSocialTimeLimitRule(social([]))).toBe(true);
    expect(isSocialTimeLimitRule(social([], 'weekdays-social'))).toBe(true);
    expect(isSocialTimeLimitRule(social([], 'simple-custom-abc'))).toBe(false);
    expect(isSocialTimeLimitRule(overall)).toBe(false);
  });

  it('reads blocked only when every day is at 0', () => {
    expect(socialBlockedByTimeLimits([social([{ hours: 0, daysOfWeek: weekdays }, { hours: 0, daysOfWeek: weekend }])])).toBe(true);
    expect(socialBlockedByTimeLimits([social([{ hours: 0, daysOfWeek: weekdays }, { hours: 0.5, daysOfWeek: weekend }])])).toBe(false);
    expect(socialBlockedByTimeLimits([social([{ hours: 0, daysOfWeek: weekdays }])])).toBe(false);
    expect(socialBlockedByTimeLimits([overall])).toBe(false);
    expect(socialBlockedByTimeLimits(null)).toBe(false);
  });

  it('blocks: 0 on every day, adding the rule above the overall limit when there is none', () => {
    const added = withSocialTimeLimitForBlock([overall], true);
    expect(added.map((r) => r.id)).toEqual(['simple-social', 'simple-overall']);
    expect(added[0].timeLimits).toEqual([{ hours: 0, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }]);
    expect(socialBlockedByTimeLimits(added)).toBe(true);

    const capped = withSocialTimeLimitForBlock([social([{ hours: 0.5, daysOfWeek: weekdays }]), overall], true);
    expect(capped[0].timeLimits).toEqual([{ hours: 0, daysOfWeek: weekdays }, { hours: 0, daysOfWeek: weekend }]);
    expect(capped[1]).toEqual(overall);
  });

  it('unblocks: 10 minutes where it was 0 or missing, and a set limit kept', () => {
    const fromZero = withSocialTimeLimitForBlock([social([{ hours: 0, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }])], false);
    expect(fromZero[0].timeLimits).toEqual([{ hours: 10 / 60, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }]);

    const fromNone = withSocialTimeLimitForBlock([], false);
    expect(fromNone).toEqual([expect.objectContaining({ id: 'simple-social', timeLimits: [{ hours: 10 / 60, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }] })]);

    const set = [social([{ hours: 0.5, daysOfWeek: weekdays }, { hours: 1, daysOfWeek: weekend }])];
    expect(withSocialTimeLimitForBlock(set, false)).toEqual(set);
  });

  it("a guardian's own: off takes the 0 minutes away and adds nothing; a limit they set is kept", () => {
    const blockedRules = withSocialTimeLimitForBlock([], true);
    expect(withSocialTimeLimitForBlock(blockedRules, false, 'noLimit')).toEqual([]);
    const ownLimit = withSocialTimeLimitForBlock(withSocialTimeLimitForBlock([], false), false, 'noLimit');
    expect(ownLimit.map((rule) => rule.timeLimits[0].hours)).toEqual([10 / 60]);
  });

  it('never changes the rules it was given', () => {
    const rules = [social([{ hours: 0.5, daysOfWeek: weekdays }]), overall];
    const before = JSON.stringify(rules);
    withSocialTimeLimitForBlock(rules, true);
    expect(JSON.stringify(rules)).toBe(before);
  });

  it('adds or removes the Social app type', () => {
    expect(withSocialAppCategory(['games'], true)).toEqual(['games', 'social']);
    expect(withSocialAppCategory(['games', 'social'], true)).toEqual(['games', 'social']);
    expect(withSocialAppCategory(['games', 'social'], false)).toEqual(['games']);
    expect(withSocialAppCategory(null, false)).toEqual([]);
  });
});

describe('socialSiteInScope (SMB-10)', () => {
  it('finds a site, a profile, a feed or a search in the address or any pattern', () => {
    expect(socialSiteInScope({ url: 'https://www.tiktok.com/@cat' })).toEqual({ site: 'tiktok.com', name: 'TikTok' });
    expect(socialSiteInScope({ url: 'https://www.reddit.com/r/aww/' })).toEqual({ site: 'reddit.com', name: 'Reddit' });
    expect(socialSiteInScope({ url: 'https://www.youtube.com/shorts/' })).toEqual({ site: 'youtube.com', name: 'YouTube Shorts' });
    expect(socialSiteInScope({ url: 'https://www.tiktok.com/@cat/video/123', patterns: ['*.tiktok.com/*'] })).toEqual({ site: 'tiktok.com', name: 'TikTok' });
    expect(socialSiteInScope({ patterns: 'school.org/*\n*.instagram.com/nasa*' })).toEqual({ site: 'instagram.com', name: 'Instagram' });
  });

  it('lets one post or video through, and everything that is not social media', () => {
    expect(socialSiteInScope({ url: 'https://www.tiktok.com/@cat/video/123', patterns: ['*.tiktok.com/@cat/video/123*'] })).toBeNull();
    expect(socialSiteInScope({ url: 'https://www.youtube.com/shorts/abc' })).toBeNull();
    expect(socialSiteInScope({ url: 'https://vm.tiktok.com/ZMabc/' })).toBeNull();
    expect(socialSiteInScope({ url: 'https://www.youtube.com/', patterns: ['*.youtube.com/*'] })).toBeNull();
    expect(socialSiteInScope({ url: 'https://school.org/', patterns: [] })).toBeNull();
    expect(socialSiteInScope({})).toBeNull();
  });
});
