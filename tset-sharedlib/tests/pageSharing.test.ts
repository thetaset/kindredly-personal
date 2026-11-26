import { categorySourceOf, MAX_SHARED_TEXT_CHARS, shareableAddress, sharedPageFrom } from '../src/classifiers/pageSharing';

// CLS-19: which pages a device may send, applied on the device and again on the server.
describe('shareableAddress', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abc123', 'https://www.youtube.com/watch?v=abc123'],
    ['https://www.youtube.com/@crashcourse', 'https://www.youtube.com/@crashcourse'],
    ['https://en.wikipedia.org/wiki/Maar#History', 'https://en.wikipedia.org/wiki/Maar'],
    ['https://example.com/a?utm_source=x&fbclid=y&page=2', 'https://example.com/a?page=2'],
    ['https://example.com/a?fbclid=IwAR0abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', 'https://example.com/a'],
  ])('keeps %s', (url, expected) => {
    expect(shareableAddress(url)).toBe(expected);
  });

  it.each([
    ['ftp://example.com/file'],
    ['https://mail.google.com/mail/u/0/#inbox'],
    ['https://docs.google.com/document/d/1abc/edit'],
    ['https://discord.com/channels/123/456'],
    ['https://accounts.example.com/settings'],
    ['https://app.slack.com/client/T1'],
    ['https://example.com/reset?token=abc'],
    ['https://example.com/welcome?email=kid%40example.com'],
    ['https://example.com/x?ref=friend@example.com'],
    ['https://example.com/x?id=0123456789abcdef0123456789abcdef01'],
    ['https://example.com/users/kid@example.com'],
    ['https://www.youtube.com/results?search_query=my+school+name'],
    ['https://www.bing.com/search?q=where+do+i+live'],
    ['https://user:pass@example.com/'],
    ['not a url'],
  ])('leaves out %s', (url) => {
    expect(shareableAddress(url)).toBeNull();
  });
});

describe('sharedPageFrom', () => {
  const page = { url: 'https://www.example.com/lesson', title: ' Fractions ', description: 'A lesson', text: 'Halves   and quarters', eduValue: 'eduval_educational' };

  it('keeps only the address, title, description, text, Category and its source', () => {
    expect(sharedPageFrom({ ...page, categoryFrom: 'library', userId: 'u1', visitedAt: 1, deviceId: 'd1' })).toEqual({
      url: 'https://www.example.com/lesson',
      title: 'Fractions',
      description: 'A lesson',
      text: 'Halves and quarters',
      eduValue: 'eduval_educational',
      categoryFrom: 'library',
    });
  });

  it('says whose answer the Category was', () => {
    expect(categorySourceOf({ srcType: 'classifier', srcId: 'mbert' })).toBe('classifier');
    expect(categorySourceOf({ srcType: 'metadata', itemId: 'item-1' })).toBe('library');
    expect(categorySourceOf({ srcType: 'made-up' })).toBeNull();
    expect(categorySourceOf(undefined)).toBeNull();
    expect(sharedPageFrom({ ...page, categoryFrom: 'made-up' })?.categoryFrom).toBeNull();
  });

  it('leaves out a signed-in page, even when the Sign out link is past the kept text', () => {
    expect(sharedPageFrom({ ...page, text: `${'word '.repeat(MAX_SHARED_TEXT_CHARS)} Sign out` })).toBeNull();
    expect(sharedPageFrom({ ...page, text: 'Welcome back · Log out' })).toBeNull();
  });

  it('leaves out an empty page and a personal address', () => {
    expect(sharedPageFrom({ ...page, title: '', text: '' })).toBeNull();
    expect(sharedPageFrom({ ...page, url: 'https://mail.google.com/' })).toBeNull();
  });

  it('cuts long text and drops an unknown Category', () => {
    const shared = sharedPageFrom({ ...page, text: 'a'.repeat(MAX_SHARED_TEXT_CHARS + 50), eduValue: 'eduval_made_up' });
    expect(shared?.text.length).toBe(MAX_SHARED_TEXT_CHARS);
    expect(shared?.eduValue).toBeNull();
  });
});
