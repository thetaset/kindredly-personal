import { getItemPresentation } from '../src/content.types';

describe('getItemPresentation', () => {
  const URL = 'https://example.com/x';

  test('bare link with a url leads with the URL and labels "Link"', () => {
    const pres = getItemPresentation('link', null, URL);
    expect(pres.label).toBe('Link');
    expect(pres.experienceKind).toBe('generic-link');
    expect(pres.leadWith).toBe('url');
  });

  test('website leads with the URL', () => {
    const pres = getItemPresentation('link', 'website', URL);
    expect(pres.experienceKind).toBe('generic-link');
    expect(pres.leadWith).toBe('url');
  });

  test('content feed leads with the label', () => {
    const pres = getItemPresentation('link', 'content_feed', URL);
    expect(pres.label).toBe('Content Feed');
    expect(pres.experienceKind).toBe('reader');
    expect(pres.leadWith).toBe('label');
  });

  test('podcast leads with the label (audio)', () => {
    const pres = getItemPresentation('link', 'podcast', URL);
    expect(pres.label).toBe('Podcast');
    expect(pres.experienceKind).toBe('audio');
    expect(pres.leadWith).toBe('label');
  });

  test('youtube video leads with the label (video)', () => {
    const pres = getItemPresentation('link', 'yt_video', URL);
    expect(pres.experienceKind).toBe('video');
    expect(pres.leadWith).toBe('label');
  });

  test('a generic link with no url falls back to label-led', () => {
    const pres = getItemPresentation('link', null, undefined);
    expect(pres.leadWith).toBe('label');
  });

  test('icon comes from the resolved type (rss for a content feed)', () => {
    expect(getItemPresentation('link', 'content_feed', URL).icon).toBe('rss');
    expect(getItemPresentation('link', 'podcast', URL).icon).toBe('headphones');
  });
});
