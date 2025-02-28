import * as cheerio from 'cheerio';
import { ItemPageTypes } from './constants';

function mergeOptions(srcList: string[]) {
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

function checkIfYTChannel(url: string) {
  return (
    url.includes('youtube.com/c/') ||
    url.includes('youtube.com/channel/') ||
    url.includes('youtube.com/@') ||
    url.includes('youtube.com/user/')
  );
}

async function extractPageInfo(meta: Record<string, any>, $: any, url: string, tsExtractedInfo: Record<string, any>) {
  const isYTChannel = checkIfYTChannel(url);
  const pageType = isYTChannel ? ItemPageTypes.YOUTUBE_CHANNEL :  ItemPageTypes.YOUTUBE_PAGE;

  tsExtractedInfo.pageType = pageType;

  const youtubeChannelUrl = $('span[itemprop="author"] link[itemprop="url"]').attr('href');
  const youtubeChannelId = youtubeChannelUrl != undefined ? await parseChannelIdFromString(youtubeChannelUrl) : null;

  if (youtubeChannelId) {
    tsExtractedInfo.youtubeChannelIds = [youtubeChannelId];
  }


  const externalChannelIds = await findVariableURLs($, 'externalChannelId');

  if (externalChannelIds.length == 1) {
    tsExtractedInfo.youtubeChannelIds.push(externalChannelIds[0]);
  }
  if (isYTChannel) {
    //'link[rel="alternate"][media="handheld"]'
    const datamatch = $('link[rel="alternate"][media="handheld"]');
    if (datamatch.length > 0) {
      console.error("Multiple matches for link[rel='alternate'][media='handheld']");
    }

    const youtubeChannelUrl = datamatch.attr('href');


    const youtubeChannelId = youtubeChannelUrl != undefined ? await parseChannelIdFromString(youtubeChannelUrl) : null;

    if (youtubeChannelId && tsExtractedInfo.youtubeChannelIds.includes(youtubeChannelId) == false) {
      tsExtractedInfo.youtubeChannelIds.push(youtubeChannelId);
    }
  }
  return tsExtractedInfo;
}


export interface TSExtractedInfo {
  pageType: string | null;
  youtubeChannelIds: string[];
  message?: string | null;
}

export interface TSMeta {
  url?: string;
  tsExtractedInfo?: TSExtractedInfo;
  THETASET_PAGE_TYPE?: string | null;
  title?: string;
  description?: string;
  keywords?: string;
  siteName?: string;
  type?: string;
  imageSrc?: string;
  locale?: string;
  favicon?: string;
  tsManifest?: Record<string, any>;
}
//TODO: rename some of this
async function parseAllMetadata(url: string, data: any) {
  const metaOrig:Record<string,any> = {};
  const tsExtractedInfo:TSExtractedInfo = {
    pageType: null as string | null,
    youtubeChannelIds: [] as string[],
    message: null as string | null,

  };

  try {
    const $ = cheerio.load(data);
    //get everything, not just meta//
    const els = $('meta[itemProp],meta[name],meta[property],link[href]').toArray();
    //
    //   const els = $("*").toArray();

    for (const el of els) {
      if ('content' in el.attribs) {
        let attrName = null;
        if (el.attribs['itemprop']) {
          attrName = el.attribs['itemprop'];
        } else if (el.attribs['name']) {
          attrName = el.attribs['name'];
        } else if (el.attribs['property']) {
          attrName = el.attribs['property'];
        }

        if (attrName) {
          metaOrig[attrName] = el.attribs['content'];
        }
      }
    }

    metaOrig.title = $('title').text();

    // does url container youtube.com
    if (url.includes('youtube.com')) {
      await extractPageInfo(metaOrig, $, url, tsExtractedInfo);
      metaOrig['THETASET_PAGE_TYPE'] = tsExtractedInfo.pageType;
    }
  } catch (err) {
    tsExtractedInfo.message = 'ERROR: ' + err;
  }

  metaOrig.tsExtractedInfo = tsExtractedInfo;
  return metaOrig;
}

const channelFromUrlRegex = /\/(channel|c|user)\/?([^\/]+)\/?.*/;

const channelFromUrlAtRegex = /\/@([^\/]+)(\/?.*)/;

async function parseChannelIdFromString(url: string) {
  let match = url.match(channelFromUrlRegex);
  let channelId = match ? match[2] : null;
  if (!channelId) {
    match = url.match(channelFromUrlAtRegex);
    channelId = match ? match[1] : null;
  }
  return channelId;
}

async function findVariableURLs($: cheerio.CheerioAPI, variable: string = 'canonicalBaseUrl') {
  const results: Set<string> = new Set();
  const regex = new RegExp(`"${variable}":"(.*?)"`, 'g');
  $('script').each(function () {
    const scriptContent = $(this).html();
    if (!scriptContent) {
      return;
    }

    let match;
    while ((match = regex.exec(scriptContent)) !== null) {
      results.add(match[1]);
    }
  });

  return Array.from(results);
}



export async function extractMetadata(url: string, data: string) {
  const metaOrig = await parseAllMetadata(url, data);

  let meta: TSMeta = {};
  meta['url'] = url;

  meta.title = mergeOptions([metaOrig['title'], metaOrig['og:title'], metaOrig['og:site_name']]);
  meta.description = mergeOptions([metaOrig['description'], metaOrig['og:description']]);
  meta.keywords = mergeOptions([metaOrig['keywords'], metaOrig['og:keywords']]);
  meta.siteName = mergeOptions([metaOrig['og:site_name']]);
  meta.type = mergeOptions([metaOrig['og:type']]);
  meta.locale = mergeOptions([metaOrig['og:locale']]);
  meta.imageSrc = mergeOptions([metaOrig['og:image']]);
  meta['THETASET_PAGE_TYPE'] = metaOrig['THETASET_PAGE_TYPE'];

  //favicon
  meta.favicon = mergeOptions([
    metaOrig['shortcut icon'],
    metaOrig['icon'],
    metaOrig['apple-touch-icon'],
    metaOrig['apple-touch-icon-precomposed'],
  ]);

  meta.tsManifest = {
    version: 2.0,
  };
  meta.tsExtractedInfo = metaOrig['tsExtractedInfo'];
  // meta.origMeta = metaOrig;

  return meta;
}

export function getMetaImagePaths(url: string, meta: Record<string, any>) {
  const urlObj = new URL(url);

  let bannerImageSrcPath = meta.imageSrc;

  let faviconSrcPath = meta.favicon && meta.favicon > 0 ? meta.favicon : `${urlObj.origin}/favicon.ico`;

  let googleFaviconSrcPath: string | null = `https://www.google.com/s2/favicons?sz=256&domain_url=${urlObj.hostname}`;

  return {bannerImageSrcPath, faviconSrcPath, googleFaviconSrcPath};
}

export async function fetchImagesFromURL(url: string, meta: Record<string, any>, getImageFromURL: Function) {
  console.log('Fetching banner and favicon images', url);

  let bannerImageSrcPath = meta.imageSrc;

  const urlObj = new URL(url);
  let bannerImageObj = null;
  if (bannerImageSrcPath) {
    bannerImageObj = await getImageFromURL(bannerImageSrcPath);
  }

  //get favicon
  let faviconObj = null;
  let faviconSrcPath: string | null = `https://www.google.com/s2/favicons?sz=256&domain_url=${urlObj.hostname}`;
  faviconObj = await getImageFromURL(faviconSrcPath);

  if (!faviconObj) {
    faviconSrcPath = meta.favicon && meta.favicon > 0 ? meta.favicon : `${urlObj.origin}/favicon.ico`;
    faviconObj = await getImageFromURL(faviconSrcPath);
  }

  if (!bannerImageObj && faviconObj) {
    bannerImageSrcPath = faviconSrcPath;
    bannerImageObj = faviconObj;
  }

  if (!bannerImageObj) {
    bannerImageSrcPath = null;
  }
  if (!faviconObj) {
    faviconSrcPath = null;
  }

  return { bannerImageObj, bannerImageSrcPath, faviconObj, faviconSrcPath };
}
