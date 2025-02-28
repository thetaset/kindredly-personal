import { DynObj } from "./shared.types";

function urlToKey(url:string) {
    if (!url) return null;
    if (url.endsWith('/')) url = url.slice(0, -1);
  
    url = url.toLowerCase().replace('https://', '').replace('http://', '').replace('wwww.', '').trim();
    if (!url.startsWith('URI-')) url = 'URI-' + url;
    return url;
  }


  
export function mergeOptions(srcList: string[]) {
  let value = '';
  for (let src of srcList) {
    if (src == undefined) {
      continue;
    }

    src = src.trim();
    if (src != undefined && src.length > value.length) {
      value = src;
    }
  }
  return value;
}

function sortDictsByStr(a:Record<string,string>, b:Record<string,string>, attr:string) {
  var nameA = a[attr]?.toUpperCase(); // ignore upper and lowercase
  var nameB = b[attr]?.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}

export function sortObjectsByTimestamp(objects: any[], attr: string) {
  objects.sort((a, b) => {
    const aTime = new Date(a[attr]).getTime();
    const bTime = new Date(b[attr]).getTime();
    return bTime - aTime;
  });
  return objects;
}



function toURL(val: string | null) {
  if (val && !val.includes('http')) {
    val = 'https://' + val;
    try {
      const urlObj = new URL(val);
      urlObj.hostname = urlObj.hostname.toLowerCase();
      val = urlObj.toString();
    } catch (err) {
      console.log('error parsing url', val);
    }
  }

  return val;
}




function keySimilarity(key1:string | null, key2:string | null, options = {normalize: false}) {
  if (!key1 || !key2) {
    return 0;
  }

  if (options.normalize) {
    key1 = urlToKey(key1);
    key2 = urlToKey(key2);
  }
  if (key1 == key2) return 1;
  else return 0;
}

function displayURL(val:string) {
  if (!val.includes('http')) {
    return 'https://' + val;
  }
  return val;
}


function getDefaultPattern(url:string) {
  let pattern = url;
  if (url != undefined) {
    pattern = pattern.replace(/https?:\/\//, '').replace('www.', '');
    if (pattern.split('.').length == 2 && !pattern.startsWith('*')) {
      pattern = '*.' + pattern;
    }

    if (!pattern.includes('/')) {
      pattern = pattern + '/';
    }

    if (!pattern.endsWith('*')) {
      pattern = pattern + '*';
    }
  }
  return pattern;
}

function isValidLink(link:string) {

 try {
    new URL(link);
    return true;
  } catch (err) {
    return false;
  }

}


function attrFilterSingle(obj: DynObj, attrs: Set<string>): DynObj | null {
  if (!obj) return null;

  const entries = Object.entries(obj).filter(([attr]) => attrs.has(attr));
  return Object.fromEntries(entries);
}

export const cleanedUpUrl = (url: string) => url.replace(/(^\w+:|^)\/\/(www\.)?/, '').replace(/\/$/, '');

export const urlAreAboutTheSame = (a: string, b: string) => {
  // remove protocol prefix, www, and trailing slash
  return cleanedUpUrl(a) === cleanedUpUrl(b);
};


export function cleanURL(val: string | null) {
  if (!val) return val;
  if (!val.startsWith('http')) {
    val = 'https://' + val;
  }

  try {
    // extract v parameter from youtube url and reconstruct url
     if ( val.includes('youtube.com/watch?')) {
      const urlObj = new URL(val);
      const v = urlObj.searchParams.get('v');
      val = 'https://youtube.com/watch?v=' + v;
    }
    else if (val.includes('youtu.be')) {
      val = val.split('/')[3];
      val = val.split('?')[0];
      val = 'https://youtube.com/watch?v=' + val;
    }

    if (val.includes('m.youtube.com')) {
      val = val.replace('m.youtube.com', 'youtube.com');
    }

    const urlObj = new URL(val);
    urlObj.hostname = urlObj.hostname.toLowerCase();

   
  } catch (e) {
    console.error('Error cleaning url:', e);
  }
  return val.trim();
}



export function textTruncate(txt: string, size = 50, rev = false) {
  if (rev) {
    return textTruncateRev(txt, size);
  }

  if (txt && txt.length > size) txt = txt.slice(0, size) + '...';
  return txt;
}

export function textTruncateRev(txt: string, size = 50) {
  if (txt && txt.length > size) txt = '...' + txt.slice(-size);
  return txt;
}


export function JSONParseSafe(item: string, defVal = null) {
  try {
    return JSON.parse(item);
  } catch (e) {
    return defVal;
  }
}

export {toURL, displayURL, getDefaultPattern, sortDictsByStr, keySimilarity, attrFilterSingle, isValidLink, urlToKey};
