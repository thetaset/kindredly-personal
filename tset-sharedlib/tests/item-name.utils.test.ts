import {
  cleanItemName,
  getSharedPageTitle,
  isPlaceholderItemName,
  isUrlEchoName,
  itemTextFirstLine,
  itemUrlLabel,
  resolveItemDisplayName,
  resolveItemName,
  resolveItemTitle,
} from '../src/item-name.utils';
import { createDisplayItem, createPublishedDisplayItem } from '../src/display.factory';

describe('resolveItemDisplayName', () => {
  it('uses the item name when it has a real one', () => {
    expect(resolveItemDisplayName({ name: 'My soup', meta: { title: 'Lentil Soup | Site' } })).toBe('My soup');
  });

  it('uses the page title when the name is missing, blank or a placeholder', () => {
    const meta = { title: 'Lentil Soup' };
    expect(resolveItemDisplayName({ meta })).toBe('Lentil Soup');
    expect(resolveItemDisplayName({ name: '   ', meta })).toBe('Lentil Soup');
    expect(resolveItemDisplayName({ name: 'Untitled', meta })).toBe('Lentil Soup');
    expect(resolveItemDisplayName({ name: 'untitled item', meta })).toBe('Lentil Soup');
  });

  it('prefers the page title over a name that only repeats the address', () => {
    const url = 'https://www.example.com/soup/';
    expect(resolveItemDisplayName({ name: 'www.example.com/soup', url, meta: { title: 'Lentil Soup' } })).toBe(
      'Lentil Soup',
    );
    expect(resolveItemDisplayName({ name: url, url })).toBe('example.com/soup');
  });

  it("uses the collection's own name for the item first", () => {
    expect(resolveItemDisplayName({ name: 'Soup' }, { relationName: 'Monday dinner' })).toBe('Monday dinner');
    expect(resolveItemDisplayName({ name: 'Soup' }, { relationName: 'Untitled' })).toBe('Soup');
  });

  it('falls back to the channel name, the text, then the file name', () => {
    expect(resolveItemDisplayName({ meta: { tsExtractedInfo: { channelName: 'SciShow Kids' } } })).toBe('SciShow Kids');
    expect(resolveItemDisplayName({ info: { value: '\n# Grocery list\n- eggs' } })).toBe('Grocery list');
    expect(resolveItemDisplayName({ meta: { fileInfo: { filename: 'report.pdf' } } })).toBe('report.pdf');
  });

  it('falls back to the address, then "Untitled"', () => {
    expect(resolveItemDisplayName({ url: 'https://www.example.com/recipes/soup' })).toBe('example.com/recipes/soup');
    expect(resolveItemDisplayName({})).toBe('Untitled');
    expect(resolveItemDisplayName(null, { fallback: 'Library item' })).toBe('Library item');
  });

  it('never shows leftover ciphertext', () => {
    expect(resolveItemDisplayName({ name: 'QUJDREVGR0hJSktMTU5PUA==', meta: { title: 'Real title' } })).toBe('Real title');
  });

  it('collapses whitespace in names', () => {
    expect(resolveItemDisplayName({ name: '  Lentil\n  Soup ' })).toBe('Lentil Soup');
  });
});

describe('resolveItemName and resolveItemTitle', () => {
  it('title never falls back to the address; name does', () => {
    const details = { url: 'https://example.com/a' };
    expect(resolveItemTitle(details)).toBe('');
    expect(resolveItemName(details)).toBe('example.com/a');
  });

  it("is '' when nothing names the item", () => {
    expect(resolveItemName({ name: 'Untitled' })).toBe('');
  });
});

describe('helpers', () => {
  it('recognises placeholders', () => {
    expect(isPlaceholderItemName('')).toBe(true);
    expect(isPlaceholderItemName('Untitled page')).toBe(true);
    expect(isPlaceholderItemName('(no title)')).toBe(true);
    expect(isPlaceholderItemName('Untitled document')).toBe(true);
    expect(isPlaceholderItemName('New Tab')).toBe(true);
    expect(isPlaceholderItemName('Untitled Goose Game')).toBe(false);
    expect(cleanItemName('No title')).toBe('');
  });

  it('recognises a name that repeats the address', () => {
    expect(isUrlEchoName('example.com/a', 'https://www.example.com/a/')).toBe(true);
    expect(isUrlEchoName('A page', 'https://example.com/a')).toBe(false);
  });

  it('labels an address by host and path', () => {
    expect(itemUrlLabel('https://example.com/')).toBe('example.com');
    expect(itemUrlLabel('not a url')).toBe('not a url');
    expect(itemUrlLabel(`https://example.com/${'a'.repeat(200)}`).length).toBe(80);
  });

  it('reads the first line of text without Markdown marks', () => {
    expect(itemTextFirstLine({ value: '> quoted line\nmore' })).toBe('quoted line');
    expect(itemTextFirstLine({ value: 42 })).toBe('');
  });
});

describe('display factory', () => {
  it('names a library item from its page title when the stored name is "Untitled"', () => {
    const display = createDisplayItem({
      itemId: 'i1',
      details: { _id: 'i1', type: 'link', name: 'Untitled', url: 'https://example.com', meta: { title: 'Lentil Soup' } },
    } as any);
    expect(display.name).toBe('Lentil Soup');
  });

  it('names a published item by the same rule', () => {
    const display = createPublishedDisplayItem({
      details: { _id: 'p1', type: 'link', name: '', meta: { title: 'Lentil Soup' }, data: { url: 'https://example.com' } },
    } as any);
    expect(display.name).toBe('Lentil Soup');
  });
});

// HAT-168: the title a phone's share sheet passes along becomes the link's name.
describe('getSharedPageTitle', () => {
  const url = 'https://docs.google.com/document/d/1AbCdEf/edit';

  it('takes the first line, tidied', () => {
    expect(getSharedPageTitle('  Quarterly   plan - Google Docs ', url)).toBe('Quarterly plan - Google Docs');
    expect(getSharedPageTitle('\nQuarterly plan\nshared from Drive', url)).toBe('Quarterly plan');
  });

  it('drops what is not a title', () => {
    expect(getSharedPageTitle(url, url)).toBe('');
    expect(getSharedPageTitle('docs.google.com/document/d/1AbCdEf/edit', url)).toBe('');
    expect(getSharedPageTitle('Look at this https://example.com', url)).toBe('');
    expect(getSharedPageTitle('Google Docs: Sign-in', url)).toBe('');
    expect(getSharedPageTitle('Untitled', url)).toBe('');
    expect(getSharedPageTitle('x'.repeat(301), url)).toBe('');
    expect(getSharedPageTitle(undefined, url)).toBe('');
    expect(getSharedPageTitle('', url)).toBe('');
  });
});

