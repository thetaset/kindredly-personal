import { getTagName, moveRetiredTopicTags, topicTagList } from '../src/content.types';
import { sanitizeAuthoredTags, validateCollectionRecords } from '../src/collection-authoring';
import { validateFeedManifest } from '../src/feed-manifest.utils';

// CLS-11: what a page is about is its Topics tree topic; topic tags are how a site is built.
describe('retired topic tags', () => {
  it('offers only the six patterns a site is built with', () => {
    expect(topicTagList.map((t) => t.key)).toEqual([
      'topic_social_feed',
      'topic_forums',
      'topic_group_chat',
      'topic_creator_channels',
      'topic_short_video_infinite_scroll',
      'topic_clickbait_sensational_news',
    ]);
  });

  it("still names a retired tag an item carries", () => {
    expect(getTagName('topic_movies')).toBe('Movies');
    expect(getTagName('ct_podcast')).toBe('Podcast');
  });

  it('moves a subject tag to its tree topic and a podcast tag to its format, once', () => {
    const first = moveRetiredTopicTags({
      useCriteria: ['eduval_educational', 'topic_science_learning', 'topic_podcasts', 'topic_forums', 'topic_math_practice'],
      categories: ['gen_science'],
    });
    expect(first).toEqual({
      useCriteria: ['eduval_educational', 'ct_podcast', 'topic_forums'],
      categories: ['gen_science', 'gen_math'],
      moved: ['topic_science_learning', 'topic_podcasts', 'topic_math_practice'],
    });
    expect(moveRetiredTopicTags(first)).toEqual({ useCriteria: first.useCriteria, categories: first.categories, moved: [] });
  });

  it('moves them in collections an AI writes, with a warning instead of dropping them', () => {
    expect(sanitizeAuthoredTags({ useCriteria: ['topic_video_games', 'nonsense'], categories: [] })).toEqual({
      useCriteria: [],
      categories: ['gen_gaming'],
    });
    const result = validateCollectionRecords([
      { type: 'link', name: 'A game', url: 'https://example.org/', useCriteria: ['topic_video_games'] },
    ]);
    expect(result.unknownCriteria).toEqual([]);
    expect(result.warnings.join('\n')).toContain('"topic_video_games" is retired');
  });

  it('warns about a retired tag in a feed file, since the loader moves it', () => {
    const result = validateFeedManifest({
      records: [{ localId: 'a', type: 'link', name: 'A', url: 'https://example.org/', useCriteria: ['topic_documentaries'] }],
    });
    expect(result.errors.join('\n')).not.toContain('topic_documentaries');
    expect(result.warnings.join('\n')).toContain('"topic_documentaries" is retired');
  });
});
