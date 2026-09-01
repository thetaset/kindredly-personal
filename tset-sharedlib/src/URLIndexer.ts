import { ItemInfoView } from "./shared.types";
import { getItemDetailPatterns } from "./url.utils";

function parseURLPattern(value: string) {
  value = value.replace(/https?:\/\//, '');

  const parts = value.split('/');
  const [hostname, port] = parts[0].split(':');

  const pathname = parts.slice(1).join('/');

  //TODO remove protocol and port, etc
  return {
    hostname: hostname,
    pathname: pathname,
    port: port,
  };
}

function getLookupHostnames(hostname: string) {
  const parts = hostname.split('.');

  let curr = '';
  let lookupnames = [];
  lookupnames.push('*');
  for (let i = parts.length - 1; i >= 0; i--) {
    if (curr == '') {
      curr = parts[i];
    } else {
      curr = parts[i] + '.' + curr;
    }

    lookupnames.push('*.' + curr);

    lookupnames.push(curr);

  }
  return lookupnames;
}

function getLookupPathnames(path: string) {
  const parts = path.split('');

  let lookupnames = [];
  lookupnames.push('*');
  // `i <= parts.length - 1` so the last prefix-glob is generated too. Stopping one
  // short meant a pattern of `docs/*` never matched `docs/x` (it did match `docs/xy`),
  // because `docs/*` was the one prefix the visited path never produced.
  for (let i = 0; i <= parts.length - 1; i++) {
    lookupnames.push(path.substring(0, i) + '*');

    if (/[\%\&\?\#\=]/.test(parts[i])) {
      lookupnames.push(path.substring(0, i));
    }
  }

  if (path.length > 0) {
    lookupnames.push(path);
    lookupnames.push(path + '*');
    lookupnames.push(path + '/*');
  }
  return lookupnames;
}
function getLookupHostnamesMain(hostname: string) {
  let lookupnames = [];
  lookupnames.push(hostname);
  lookupnames.push('*.' + hostname);

  if (hostname.startsWith('www.')) lookupnames.push('*.' + hostname.replace('www.', ''));

  return lookupnames;
}

function getLookupPathnamesMain(path: string) {
  let lookupnames = [];

  if (path.length > 0) {
    lookupnames.push(path);
    lookupnames.push(path + '*');
    lookupnames.push(path + '/*');
  } else {
    lookupnames.push('*');
  }
  return lookupnames;
}

class URLIndexer {




  static getItemLookupInstance(itemInfo: ItemInfoView): URLIndexer | null {
  const allPatterns = getItemDetailPatterns(itemInfo?.details);

  if (allPatterns.length == 0) return null;

  let idx = new URLIndexer();
  idx.add("ok", allPatterns);
  return idx;
}

  public lookup: Record<string, Record<string, string[]>> = {};
  public _revLookup: Record<string, any> = {};
  /**
   * `_revLookup` starts as a truthy `{}`, so the old `if (!this._revLookup)` guard
   * never fired and `remove` silently did nothing. Track the build explicitly, and
   * keep it current in `add` so a batch of removes pays the O(index) walk once.
   */
  private _revLookupBuilt = false;

  constructor(lookup = {}) {
    this.lookup = lookup || {};
  }

  add(entryval: string, patterns: Array<string>) {
    for (let patternValue of patterns) {
      if (!patternValue) continue;
      const pattern = parseURLPattern(patternValue);
      let pathLookup = this.lookup[pattern.hostname] || {};
      if (!pathLookup[pattern.pathname]) {
        pathLookup[pattern.pathname] = [];
      }
      if (!pathLookup[pattern.pathname].includes(entryval)) {
        pathLookup[pattern.pathname].push(entryval);
        if (this._revLookupBuilt) {
          const pathlist = this._revLookup[entryval] || [];
          pathlist.push({ hostname: pattern.hostname, path: pattern.pathname });
          this._revLookup[entryval] = pathlist;
        }
      }
      this.lookup[pattern.hostname] = pathLookup;
    }
  }

  _buildReverseLookup() {
    this._revLookup = {};
    for (const [hostname, pathLookup] of Object.entries(this.lookup)) {
      for (const [path, entryvals] of Object.entries<string[]>(pathLookup)) {
        for (const entryval of entryvals) {
          let pathlist = this._revLookup[entryval] || [];
          pathlist.push({ hostname, path });
          this._revLookup[entryval] = pathlist;
        }
      }
    }
    this._revLookupBuilt = true;
  }

  remove(entryval: string) {
    try {
      if (!this._revLookupBuilt) {
        this._buildReverseLookup();
      }
      const pathList = this._revLookup[entryval] || [];
      for (const d of pathList) {
        const pathLookup = this.lookup[d.hostname];
        if (!pathLookup) continue;

        const pathArray = pathLookup[d.path];
        if (pathArray) {
          const index = pathArray.indexOf(entryval);
          if (index > -1) {
            pathArray.splice(index, 1);
            if (pathArray.length === 0) {
              delete pathLookup[d.path];
            }
          }
        }

        // Don't leave an empty host bucket behind: `hostval in this.lookup` is the
        // first test on every lookup, and an empty one makes it walk paths for nothing.
        if (Object.keys(pathLookup).length === 0) {
          delete this.lookup[d.hostname];
        }
      }
      // The entry is gone; a later add rebuilds its path list from scratch.
      delete this._revLookup[entryval];
    } catch (e) {
      console.error('idx remove error', entryval, e);
    }
  }

  getExactMatches(url: string) {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const urlo = parseURLPattern(url); //new URL(url)
    const hostname = urlo.hostname;
    const lookupHostnames = getLookupHostnamesMain(hostname);
    const lookupPathnames = getLookupPathnamesMain(urlo.pathname);

    const matches = new Set<string>();
    for (let hostval of lookupHostnames) {
      if (hostval in this.lookup) {
        const pathlookup = this.lookup[hostval];
        for (let pathval of lookupPathnames) {
          if (pathval in pathlookup) {
            for (const entryval of pathlookup[pathval]) {
              matches.add(entryval);
            }
          }
        }
      }
    }

    return Array.from(matches);
  }

  hasMatch(url: string): boolean {
    return this.getMatches(url).length > 0;
  }


  getMatches(url: string, justBestMatch = false): string[] {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const urlo = parseURLPattern(url);
    const hostname = urlo.hostname;
    const lookupHostnames = getLookupHostnames(hostname);
    const lookupPathnames = getLookupPathnames(urlo.pathname);

    const matches = new Set<string>();
    let bestMatchSt = null;
    let bestMatchId = null;
    for (let hostval of lookupHostnames) {
      if (hostval in this.lookup) {
        const pathlookup = this.lookup[hostval];
        for (let pathval of lookupPathnames) {
          if (pathval in pathlookup) {
            for (const entryval of pathlookup[pathval]) {
              matches.add(entryval);
              if (justBestMatch && (bestMatchId == null || (bestMatchSt && bestMatchSt.length < pathval.length))) {
                bestMatchId = entryval;
                bestMatchSt = pathval;
              }
            }
          }
        }
      }
    }
    if (justBestMatch && bestMatchId) return [bestMatchId];
    else return Array.from(matches);
  }



  getChildrenMatches(url: string) {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const urlo = parseURLPattern(url); //new URL(url)
    const hostname = urlo.hostname;
    const lookupHostnames = getLookupHostnamesMain(hostname);
    let path = urlo.pathname = urlo.pathname.replace(/\/$/, ''); // Remove trailing slash
    const matches = new Set<string>();
    for (let hostval of lookupHostnames) {
      if (hostval in this.lookup) {
        const pathlookup = this.lookup[hostval];
        for (let pathval of Object.keys(pathlookup)) {
          if (pathval.startsWith(path) && pathval + "*" !== path) {
            for (const entryval of pathlookup[pathval]) {
              matches.add(entryval);
            }
          }
        }
      }
    }

    return Array.from(matches);
  }

  getAllMatches(url: string) {

    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const urlo = parseURLPattern(url);
    const hostname = urlo.hostname;
    const lookupHostnames = getLookupHostnames(hostname);
    const lookupPathnames = getLookupPathnames(urlo.pathname);
    const exactPathNamesLookup = getLookupPathnamesMain(urlo.pathname);

    const lookupHostnamesExact = getLookupHostnamesMain(hostname);
    let path = urlo.pathname = urlo.pathname.replace(/\/$/, ''); // Remove trailing slash

    const exactMatches = new Set<string>();
    const childMatches = new Set<string>();
    const parentMatches = new Set<string>();

    for (let hostval of lookupHostnames) {
      if (hostval in this.lookup) {
        const pathlookup = this.lookup[hostval];
        for (let pathval of lookupPathnames) {
          if (pathval in pathlookup) {
            for (const entryval of pathlookup[pathval]) {
              if (exactPathNamesLookup.includes(pathval) && lookupHostnamesExact.includes(hostval)) {
                exactMatches.add(entryval);
              }
              else {
                parentMatches.add(entryval);
              }

            }
          }
        }
      }
    }


    for (let hostval of lookupHostnamesExact) {
      if (hostval in this.lookup) {
        const pathlookup = this.lookup[hostval];
        for (let pathval of Object.keys(pathlookup)) {
          if (pathval.startsWith(path) && !exactPathNamesLookup.includes(pathval) && pathval + "*" !== path) {
            for (const entryval of pathlookup[pathval]) {
              childMatches.add(entryval);
            }
          }
        }
      }
    }

    let matchPairs: {value: string, rel: 'exact' | 'child' | 'parent'}[] = [];
    for (const value of exactMatches) matchPairs.push({ value, rel: 'exact' });
    for (const value of childMatches) matchPairs.push({ value, rel: 'child' });
    for (const value of parentMatches) matchPairs.push({ value, rel: 'parent' });


    return matchPairs

  }
}



export { URLIndexer };
