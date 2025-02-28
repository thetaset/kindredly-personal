import { config } from "@/config";
import axios from "axios";
import { ItemPageTypes } from "tset-sharedlib/constants";
import { TSMeta, TSExtractedInfo, extractMetadata } from "tset-sharedlib/meta.utils";

export async function fetchYoutubeVideoMetaWithAPI(
  url: string,
  videoId: String,
  apiKey: String,
  options = {}) {
  let apiURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

  let meta: TSMeta = {
    url: url,
    title: "",
    description: "",
    THETASET_PAGE_TYPE: ItemPageTypes.YOUTUBE_PAGE,
  };
  try {
    const response = await axiosCall(apiURL, { timeout: 18000 });

    if (response.data &&
      response.data.items &&
      response.data.items.length > 0) {
      const channelId = response.data.items[0].snippet.channelId;
      meta.title = response.data.items[0].snippet.title;
      meta.description = response.data.items[0].snippet.description;
      meta.imageSrc = response.data.items[0].snippet.thumbnails.high.url;
      let tsExtractedInfo: TSExtractedInfo = {
        youtubeChannelIds: [channelId],
        pageType: ItemPageTypes.YOUTUBE_PAGE,
      };
      meta.tsExtractedInfo = tsExtractedInfo;
      console.log("Channel ID:", channelId);
      return meta;
    } else {
      console.log("No data found for the provided video ID.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching channel ID:", error.message);
    return null;
  }
}

export async function axiosCall(url, options) {
  try {
    return await axios.get(url, options);
  } catch (e) {
    const msg = `Failed to make call to ${url} ${e}`;
    // console.error(msg, e)
    throw new Error(msg);
  }
}

export async function fetchRawMetaDefault(url, options = {}) {
  try {
    const response = await axiosCall(url, { timeout: 18000, ...options });
    const data = response.data;
    const meta = await extractMetadata(url, data);
    return meta;
  } catch (error) {
    console.error(`Error fetching raw metadata for URL: ${url}`, error);
    throw error;
  }
}

export async function fetchRawMeta(url, options = {}) {
  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1].split("&")[0];
    if (videoId) {
      let meta = await fetchYoutubeVideoMetaWithAPI(
        url,
        videoId,
        config.googleServiceApiKey
      );
      // console.log("YTMeta", meta);
      return meta;
    }
  } 
  return await fetchRawMetaDefault(url, options);
}