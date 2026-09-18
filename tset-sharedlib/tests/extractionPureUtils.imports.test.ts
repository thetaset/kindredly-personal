import * as fs from 'fs';
import * as path from 'path';

// extraction.pure.utils.ts is imported on the boot path (display.factory, the userPrefs store,
// item requirement resolvers). A single runtime import of extraction.utils.ts would drag the
// cheerio HTML parser (~490KB) back into the iOS/Android/webapp boot bundle.
const read = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');

describe('extraction.pure.utils stays parser-free', () => {
  it('has only type-level imports', () => {
    const runtimeImports = read('extraction.pure.utils.ts').match(/^import (?!type )[^;]+;/gm) ?? [];
    expect(runtimeImports).toEqual([]);
  });

  it('never mentions cheerio outside comments', () => {
    const code = read('extraction.pure.utils.ts').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/cheerio/);
  });

  it('display.factory imports the pure module, not the parser module', () => {
    expect(read('display.factory.ts')).not.toMatch(/from '\.\/extraction\.utils'/);
  });
});
