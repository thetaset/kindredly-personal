import { containLinksInternallyFor, isYouTubeAppHost, personAllowsOtherApps, personAllowsYouTubeApp } from '../src/other-apps';

describe('Open other apps', () => {
  it('is off for a child nobody has set', () => {
    expect(personAllowsOtherApps({ type: 'restricted', options: {} })).toBe(false);
    expect(personAllowsOtherApps({ type: 'restricted', options: null })).toBe(false);
  });

  it('is on for a child a guardian allowed', () => {
    expect(personAllowsOtherApps({ type: 'restricted', options: { containLinksInternally: false } })).toBe(true);
  });

  it('is on for an adult nobody has set', () => {
    expect(personAllowsOtherApps({ type: 'admin', options: {} })).toBe(true);
  });

  it('is off for an adult who turned it off', () => {
    expect(personAllowsOtherApps({ type: 'admin', options: { containLinksInternally: true } })).toBe(false);
  });

  it('treats an unknown person as a child', () => {
    expect(personAllowsOtherApps(undefined)).toBe(false);
    expect(personAllowsOtherApps({ options: {} })).toBe(false);
    expect(personAllowsOtherApps({ type: 'restricted', options: { containLinksInternally: true } })).toBe(false);
  });

  it('stores the switch inverted', () => {
    expect(containLinksInternallyFor(true)).toBe(false);
    expect(containLinksInternallyFor(false)).toBe(true);
  });
});

// HAT-109: YouTube stays in Kindredly unless an adult turned the YouTube app on.
describe('Open YouTube in the YouTube app', () => {
  it('is off for an adult nobody has set', () => {
    expect(personAllowsYouTubeApp({ type: 'admin', options: {} })).toBe(false);
  });

  it('is on for an adult who turned it on', () => {
    expect(personAllowsYouTubeApp({ type: 'admin', options: { openYouTubeInApp: true } })).toBe(true);
  });

  it('does nothing while other apps are off', () => {
    expect(personAllowsYouTubeApp({ type: 'admin', options: { openYouTubeInApp: true, containLinksInternally: true } })).toBe(false);
  });

  it('is never on for a child, whatever is stored', () => {
    expect(personAllowsYouTubeApp({ type: 'restricted', options: { openYouTubeInApp: true, containLinksInternally: false } })).toBe(false);
    expect(personAllowsYouTubeApp({ options: { openYouTubeInApp: true } })).toBe(false);
  });
});

describe('YouTube app hosts', () => {
  it('covers YouTube and its subdomains', () => {
    for (const host of ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtubekids.com', 'WWW.YOUTUBE.COM.']) {
      expect(isYouTubeAppHost(host)).toBe(true);
    }
  });

  it('does not cover lookalikes', () => {
    for (const host of ['notyoutube.com', 'youtube.com.evil.test', 'chess.com', '', null, undefined]) {
      expect(isYouTubeAppHost(host)).toBe(false);
    }
  });
});
