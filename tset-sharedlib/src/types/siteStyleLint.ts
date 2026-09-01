/**
 * Rejects selector shapes that stop matching when a site redesigns.
 *
 * The rules come from comparing this repo's own stylesheets. The durable ones lean on
 * things a site maintains deliberately — custom element tags (`ytd-rich-shelf-renderer`,
 * `shreddit-comment-tree`), semantic attributes (`[page-subtype="home"]`,
 * `[aria-label]`), and ARIA landmarks. The brittle ones lean on things that change
 * without anyone noticing: `#t3_1hgkflm` was one Reddit post's id, dead the day after it
 * was written, and it sat in the shipped stylesheet for months because nothing checked.
 *
 * Shared rather than client-side so generation and save enforce the same rules — a
 * generator held to a looser standard than the validator just produces rejected output.
 */

export type SiteStyleLintIssue = {
  selector: string;
  rule: string;
  detail: string;
};

export type SiteStyleLintResult = {
  ok: boolean;
  issues: SiteStyleLintIssue[];
  /** Selectors that passed, for reporting how much of a stylesheet survived. */
  passed: number;
};

/** Every `#id` in a selector, so each can be judged on its own. */
const ID_TOKEN = /#([A-Za-z0-9_-]+)/g;

/**
 * Whether an id looks like it came from a row of content rather than the page's own
 * structure.
 *
 * The distinction is the suffix, not the shape: `#t3_1hgkflm` and `#movie_player` are
 * both `prefix_suffix`, but `1hgkflm` is an opaque generated token while `player` is a
 * word someone chose. Mixing letters and digits in a run of six or more is what separates
 * them — it catches `t3_1hgkflm` and `post_a8f3k2j` while leaving `movie_player`,
 * `ts_status_button`, and `watch7-sidebar` alone.
 *
 * A regex cannot express this cleanly, and the one that tried got both cases wrong.
 */
function isContentDerivedId(id: string): boolean {
  for (const segment of id.split(/[_-]/)) {
    if (segment.length < 6) continue;
    if (/\d/.test(segment) && /[a-z]/i.test(segment)) return true;
  }
  return false;
}

/** CSS-in-JS output: `css-1x2y3z`, `sc-bdVaJa`, `jsx-2381923`. Regenerated on every build. */
const HASHED_CLASS = /\.(?:css|sc|jsx|emotion|styled)-[a-z0-9]{4,}/i;

/** Four or more chained classes is a utility stack (`.flex.gap-sm.items-center.h-2xl`). */
const LONG_CLASS_CHAIN = /(?:\.[a-zA-Z0-9_-]+){4,}/;

/** nth-child pins a position in a list that reorders. */
const POSITIONAL = /:nth-(?:child|of-type)\(/i;

export function lintSiteStyleSelector(selector: string): SiteStyleLintIssue | null {
  const s = (selector || '').trim();
  if (!s) return null;

  for (const match of s.matchAll(ID_TOKEN)) {
    if (isContentDerivedId(match[1])) {
      return {
        selector: s,
        rule: 'content-derived-id',
        detail: 'Targets one post or row by id. It stops matching as soon as that content scrolls away.',
      };
    }
  }

  if (HASHED_CLASS.test(s)) {
    return {
      selector: s,
      rule: 'hashed-class',
      detail: 'A build-generated class name. It changes on the site’s next deploy.',
    };
  }

  if (LONG_CLASS_CHAIN.test(s)) {
    return {
      selector: s,
      rule: 'long-class-chain',
      detail: 'A chain of utility classes. Any styling tweak on the site breaks the whole selector.',
    };
  }

  if (POSITIONAL.test(s)) {
    return {
      selector: s,
      rule: 'positional',
      detail: 'Depends on where an element sits in a list, which reorders.',
    };
  }

  return null;
}

/**
 * Splits CSS into selectors well enough to lint. Deliberately textual: this runs in the
 * background and on the server-shaped path, where there is no DOM to parse with.
 */
export function extractSelectorsForLint(css: string): string[] {
  if (typeof css !== 'string') return [];

  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors: string[] = [];

  for (const match of withoutComments.matchAll(/(?:^|[}{;])\s*([^{}@;][^{}]*?)\s*\{/g)) {
    for (const part of match[1].split(',')) {
      const trimmed = part.trim();
      if (trimmed) selectors.push(trimmed);
    }
  }

  return selectors;
}

export function lintSiteStyleCss(css: string): SiteStyleLintResult {
  const selectors = extractSelectorsForLint(css);
  const issues: SiteStyleLintIssue[] = [];

  for (const selector of selectors) {
    const issue = lintSiteStyleSelector(selector);
    if (issue) issues.push(issue);
  }

  return { ok: issues.length === 0, issues, passed: selectors.length - issues.length };
}
