import * as cheerio from "cheerio";

import { DynObj } from "@/types";
import { extractMetadata } from "tset-sharedlib/meta.utils";
import { urlToKey } from "tset-sharedlib/text.utils";


function filterToFields(fields: string[], obj: DynObj) {
  const result: DynObj = {};
  for (const field of fields) {
    result[field] = obj[field];
  }
  return result;
}

function parseAllMetadata(url, data) {
  const meta: DynObj = {};
  const $ = cheerio.load(data);
  const els = $(
    "meta[itemProp],meta[name],meta[property],link[href]"
  ).toArray();

  for (const el of els) {
    if ("content" in el.attribs) {
      let attrName = null;
      if (el.attribs["itemprop"]) {
        attrName = el.attribs["itemprop"];
      } else if (el.attribs["name"]) {
        attrName = el.attribs["name"];
      } else if (el.attribs["property"]) {
        attrName = el.attribs["property"];
      }

      if (attrName) {
        meta[attrName] = el.attribs["content"];
      }
    }
  }

  meta.title = $("title").text();

  return meta;
}


function keySimilarity(key1, key2, options = { normalize: false }) {
  if (!key1 || !key2) {
    return 0;
  }
  if (options.normalize) {
    key1 = urlToKey(key1);
    key2 = urlToKey(key2);
  }
  if (key1.length == 0 || key2.length == 0) {
    return 0;
  }
  if (key1 == key2) return 1;
  else return 0;
}


export function filterAttrsFromObjList(a, attrs) {
    const na = [];
    if (!a) return na;
    a.forEach((i) => {
      const ni = {};

      for (const attr of attrs) {
        if (attr in i) ni[attr] = i[attr];
      }

      na.push(ni);
    });

    return na;
  }

  export function removeAttrsfromObj(a, attrs) {
    const aa = { ...a };
    for (const attr of attrs) {
      delete aa[attr];
    }
    return aa;
  }

  export function removeAttrsFromObjList(a, attrs) {
    if (!a) return a;
    a.forEach((i) => {
      for (const attr of attrs) {
        delete i[attr];
      }
    });

    return a;
  }


  export function joinDataSetsByKey(joinKeyValues, joinKeyNames, datasets = {}, joinKeyName = 'id') {
    const lookups = {};

    for (const [name, dataset] of Object.entries<[string, any]>(datasets)) {
      const lookup = {};
      dataset.forEach((v) => {
        lookup[v[joinKeyNames[name]]] = v;
      });
      lookups[name] = lookup;
    }

    const resultItems = [];

    for (const joinkey of joinKeyValues) {
      const entry = {};
      entry[joinKeyName] = joinkey;
      for (const dsName of Object.keys(datasets)) {
        entry[dsName] = lookups[dsName][joinkey];
      }
      resultItems.push(entry);
    }
    return resultItems;
  }

  export {
  extractMetadata, filterToFields, keySimilarity, parseAllMetadata
};
