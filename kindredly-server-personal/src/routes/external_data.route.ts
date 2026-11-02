import ExternalDataService from '@/services/external_data.service';
import ContentLookupService from '@/services/content_lookup.service';
import ContentSourceService from '@/services/content_source.service';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {outboundFetchCounter} from '@/services/outbound_fetch_counter';
import {resolveShortLink} from '@/utils/short_link';
import {callCheckedService} from '@/services/app_service.service';
import {findWork} from '@/services/work_lookup.service';

class ExternalDataRoute implements Routes {
  public router = Router();

  private externalDataService = new ExternalDataService();
  private contentLookupService = new ContentLookupService();
  private contentSourceService = new ContentSourceService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Deprecated compatibility route. Prefer /data/contentInfo with includeMetadata.
    this.router.post(
      '/data/meta',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/meta'>, res) => {
        const url = req.body.url;
        const results = await this.externalDataService.fetchMetadataTaskRunner(url);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // Distribution endpoint for the active learned-classifier artifact. Clients
    // cache by `version` and re-download when it changes. Intentionally available
    // to any authenticated user: every client runs the model locally for on-device
    // classification (the weights are not sensitive — they are derived, shippable
    // model parameters, not training data).
    this.router.post(
      '/data/learnedClassifierModel/getActive',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/learnedClassifierModel/getActive'>, res) => {
        const model = await this.externalDataService.getActiveLearnedClassifierModel(req.body?.kind);
        res.json({success: true, results: {model: model || null}});
      }),
    );

    // Distribution endpoint for the curated site-classification override list. Clients
    // cache by `version` and re-download when it changes. Available to any authenticated
    // user (the list is non-sensitive corrective classification rules, not user data).
    this.router.post(
      '/data/siteOverrides/getActive',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (_req: ApiReq<'/data/siteOverrides/getActive'>, res) => {
        const overrides = this.externalDataService.getActiveSiteOverrides();
        res.json({success: true, results: {overrides: overrides || null}});
      }),
    );

    // Deprecated compatibility route. Prefer /data/contentInfo with includeResourceInfo.
    this.router.post(
      '/data/resourceInfo',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/resourceInfo'>, res) => {
        const data = req.body;
        const results = await this.externalDataService.getResourceInfo(data);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // Deprecated compatibility route. Prefer /data/contentInfo with includeClassification.
    this.router.post(
      '/data/classifyContentType',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/classifyContentType'>, res) => {
        const info = req.body.info;
        console.log('Content classification request:', info);
        const results = await this.externalDataService.runContentClassificationTaskRunner(
          RequestContext.instance(req),
          info,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/data/contentInfo',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/contentInfo'>, res) => {
        const results = await this.contentLookupService.lookup(RequestContext.instance(req), req.body);
        res.json({
          success: true,
          results,
        });
      }),
    );

    // Resolve a podcast's RSS feed from an Apple Podcasts show id (or name).
    // Deliberately available to any signed-in user, unlike the admin-only
    // content-source connectors: a saved podcasts.apple.com link declares no
    // feed in its <head>, so without this there is no way to repair one.
    this.router.post(
      '/data/podcastFeedLookup',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/podcastFeedLookup'>, res) => {
        const results = await this.contentSourceService.lookupPodcastFeed(req.body);
        res.json({success: true, results});
      }),
    );

    // Where a short link leads, so an item saved from one is stored as the post's own address
    // (SMB-4). Each hop goes through the same SSRF guard as every other fetch here.
    this.router.post(
      '/data/resolveShortLink',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/resolveShortLink'>, res) => {
        const url = typeof req.body?.url === 'string' ? req.body.url.slice(0, 2048) : '';
        const resolved = await resolveShortLink(url).catch(() => null);
        res.json({success: true, results: {url: resolved}});
      }),
    );

    // A call an app makes to a checked outside service, such as weather (HAT-629). The service
    // checks the address against the list itself; nothing here trusts the host's check.
    this.router.post(
      '/data/appService',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/appService'>, res) => {
        const results = await callCheckedService(req.body?.url);
        res.json({success: true, results});
      }),
    );

    // A book, film, series, album or song by name, for Kinbot's addWork (HAT-794). Reads only
    // Wikipedia, Wikidata and Open Library; a url is used only when it is one of theirs.
    this.router.post(
      '/data/findWork',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/data/findWork'>, res) => {
        const body = req.body || {};
        const results = await findWork({
          query: typeof body.query === 'string' ? body.query : undefined,
          kind: body.kind,
          by: typeof body.by === 'string' ? body.by : undefined,
          year: typeof body.year === 'number' ? body.year : undefined,
          workId: typeof body.workId === 'string' ? body.workId.slice(0, 40) : undefined,
          url: typeof body.url === 'string' ? body.url.slice(0, 2048) : undefined,
        });
        res.json({success: true, results});
      }),
    );

    this.router.get(
      '/userdata/proxy',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req, res, next) => {
        const url = req.query.url;

        const type = req.query.type || 'image';

        await this.externalDataService.fetchAndStreamData(url, res, type);
      }),
    );

    this.router.post(
      '/userdata/proxyr',
      authenticateJWT,
      outboundFetchCounter,
      errorHelper(async (req: ApiReq<'/userdata/proxyr'>, res, next) => {
        const url = req.body.url;

        const type = req.body.type || 'image';

        await this.externalDataService.fetchAndStreamData(url, res, type);
      }),
    );
  }
}

export default ExternalDataRoute;
