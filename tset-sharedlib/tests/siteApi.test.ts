import { getSiteApiRecipe } from '../src/site-api.utils';

// HAT-619: Stack Overflow shows every read a Cloudflare check; its public API names the question.
describe('getSiteApiRecipe', () => {
  test('asks Stack Exchange about a question on any of its sites', () => {
    expect(getSiteApiRecipe('https://stackoverflow.com/questions/13366083/why-does-the-arrow-operator-in-c-exist')?.endpoint).toBe(
      'https://api.stackexchange.com/2.3/questions/13366083?site=stackoverflow',
    );
    expect(getSiteApiRecipe('https://math.stackexchange.com/q/12345')?.endpoint).toBe('https://api.stackexchange.com/2.3/questions/12345?site=math');
    expect(getSiteApiRecipe('https://askubuntu.com/questions/1/x')?.endpoint).toContain('site=askubuntu');
  });

  test('nothing for a page it has no API for', () => {
    expect(getSiteApiRecipe('https://stackoverflow.com/users/1/x')).toBeNull();
    expect(getSiteApiRecipe('https://example.com/questions/1')).toBeNull();
  });

  test("reads the question's title and tags, entities decoded", () => {
    const recipe = getSiteApiRecipe('https://stackoverflow.com/questions/13366083')!;
    expect(recipe.parse({ items: [{ title: 'Why does the arrow (-&gt;) operator in C exist?', tags: ['c', 'pointers'] }] })).toEqual({
      title: 'Why does the arrow (->) operator in C exist?',
      description: 'Question tagged c, pointers',
    });
    expect(recipe.parse({ items: [] })).toBeNull();
  });
});
