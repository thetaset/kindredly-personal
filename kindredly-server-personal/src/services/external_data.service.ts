


import { ItemRepo } from "@/db/item.repo";
import { DynObj } from "@/types";
import TaskRunnerService from "./task_runner.service";
import { RequestContext } from "../base/request_context";
import axios from 'axios';
import { fetchRawMeta } from "@/utils/fetch_helpers";

class ExternalDataService {
  private itemsRepo = new ItemRepo();
  private taskRunnerService = new TaskRunnerService();

  async saveItemMeta(
    ctx: RequestContext,
    id: string,
    meta: DynObj,
    updatedAt: Date = new Date()
  ) {
    const item = await this.itemsRepo.findById(id);
    await ctx.verifyInAccount(item.userId);

    await this.itemsRepo.updateWithId(id, { metaUpdatedAt: updatedAt, meta: meta });
  }

  async fetchMetadata(url:string, timeout = 6000) {

    let meta = null;
    let resolved = false;
    try {
      meta = await fetchRawMeta(url, {
        timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
        },
      });
      resolved = true;
    } catch (e) {
      console.log("Errror fetching meta", e, url);
      meta = {};
    }

    return meta;
  }

  async fetchMetadataTaskRunner(url:string) {
    const result = await this.taskRunnerService.runTask("fetchMetadata", {
      url,
    });
    return result;
  }


 async fetchAndStreamData(url: any, res: any, type: any) {
    try {
      const response = await axios.get(url, { responseType: 'stream' });

      if (response.status !== 200) {
        console.error('Error fetching data:', response.status);
        res.status(500).send('Internal Server Error');
      } else if (type == 'image' && !response.headers['content-type'].startsWith('image/')) {
        console.error('Error fetching data: not an image');
        res.status(500).send('Internal Server Error');
      } else if (type == 'rss' && !response.headers['content-type'].includes('xml')) {
        console.error('Error fetching data: not an xml feed');
        res.status(500).send('Internal Server Error');
      } else {
        console.log('proxy results on their way');
        res.setHeader('Content-Type', response.headers['content-type']);

        // Stream the image data directly to the client
        response.data.pipe(res);
      }
    } catch (error) {
      console.error('Error fetching image:', error.message);
      res.status(500).send('Internal Server Error');
    }
  }

}

export default ExternalDataService;
