import {RequestContext} from '@/base/request_context';
import ExternalDataService from './external_data.service';
import type {
  ContentLookupRequest,
  ContentLookupResponse,
  SourcePriorityClassificationResponse,
} from 'tset-sharedlib/api/api-types';
import type {ItemMeta, ResourceFetchInfoResponse} from 'tset-sharedlib/types/item.types';

function toItemMetaOrNull(value: ItemMeta | Record<string, never> | null | undefined): ItemMeta | null {
  if (!value || typeof value !== 'object') return null;
  return Object.keys(value).length > 0 ? (value as ItemMeta) : null;
}

function resolveCanonicalUrl(requestUrl: string, meta: ItemMeta | null): string {
  const recognizedCanonicalUrl = meta?.tsExtractedInfo?.recognized?.canonicalUrl;
  if (typeof recognizedCanonicalUrl === 'string' && recognizedCanonicalUrl.trim().length > 0) {
    return recognizedCanonicalUrl.trim();
  }

  const metadataUrl = meta?.url;
  if (typeof metadataUrl === 'string' && metadataUrl.trim().length > 0) {
    return metadataUrl.trim();
  }

  return requestUrl;
}

export default class ContentLookupService {
  private externalDataService = new ExternalDataService();

  private async getOptionalMetadata(
    requestUrl: string,
    forceRefresh: boolean,
  ): Promise<ItemMeta | Record<string, never> | null> {
    try {
      return await this.externalDataService.fetchMetadata(requestUrl, {forceRefresh});
    } catch (error) {
      console.error('ContentLookupService.lookup metadata enrichment failed; continuing without metadata', error);
      return null;
    }
  }

  private async getOptionalResourceInfo(
    requestUrl: string,
    forceRefresh: boolean,
  ): Promise<ResourceFetchInfoResponse | null> {
    try {
      return (await this.externalDataService.getResourceInfo({
        url: requestUrl,
        forceRefresh,
      })) as ResourceFetchInfoResponse | null;
    } catch (error) {
      console.error(
        'ContentLookupService.lookup resourceInfo enrichment failed; continuing without resource info',
        error,
      );
      return null;
    }
  }

  private async getOptionalClassification(
    ctx: RequestContext,
    requestUrl: string,
    request: ContentLookupRequest,
  ): Promise<SourcePriorityClassificationResponse | null> {
    try {
      return (await this.externalDataService.contentClassification(ctx, {
        url: requestUrl,
        features: this.normalizeFeatures(request),
      })) as SourcePriorityClassificationResponse | null;
    } catch (error) {
      console.error(
        'ContentLookupService.lookup classification enrichment failed; continuing without classification',
        error,
      );
      return null;
    }
  }

  private normalizeFeatures(request: ContentLookupRequest): Record<string, unknown> | undefined {
    if (!request.features || typeof request.features !== 'object') return undefined;

    return {
      title: request.features.title,
      description: request.features.description,
      extractedText: request.features.extractedText,
      channelId: request.features.channelId,
    };
  }

  async lookup(ctx: RequestContext, request: ContentLookupRequest): Promise<ContentLookupResponse> {
    const requestUrl = typeof request?.url === 'string' ? request.url.trim() : '';
    const options = {
      includeMetadata: request?.options?.includeMetadata !== false,
      includeResourceInfo: request?.options?.includeResourceInfo !== false,
      includeClassification: request?.options?.includeClassification === true,
      forceRefresh: request?.options?.forceRefresh === true,
    };

    if (!requestUrl) {
      return {
        canonicalUrl: '',
        meta: null,
        resourceInfo: null,
        classification: null,
        lookupMeta: {
          resourceType: null,
          metadataSourceId: null,
          requestedMetadata: false,
          usedMetadata: false,
          metadataStatus: 'not-requested',
          requestedResourceInfo: false,
          usedResourceInfo: false,
          resourceInfoStatus: 'not-requested',
          requestedClassification: false,
          usedClassification: false,
          classificationStatus: 'not-requested',
          libraryMatchLocation: 'client-only',
          libraryMatchReason: 'client-side-encryption',
        },
      };
    }

    const metadataPromise = options.includeMetadata
      ? this.getOptionalMetadata(requestUrl, options.forceRefresh)
      : Promise.resolve(null);
    const resourceInfoPromise = options.includeResourceInfo
      ? this.getOptionalResourceInfo(requestUrl, options.forceRefresh)
      : Promise.resolve(null);
    const classificationPromise: Promise<SourcePriorityClassificationResponse | null> = options.includeClassification
      ? this.getOptionalClassification(ctx, requestUrl, request)
      : Promise.resolve(null);

    const [metaRaw, resourceInfo, classification] = await Promise.all([
      metadataPromise,
      resourceInfoPromise,
      classificationPromise,
    ]);

    const meta = toItemMetaOrNull(metaRaw as ItemMeta | Record<string, never> | null);
    const resolvedResourceInfo = resourceInfo as ResourceFetchInfoResponse | null;
    const resourceType = resolvedResourceInfo?.rtype || meta?.tsExtractedInfo?.pageType || null;
    const canonicalUrl = resolveCanonicalUrl(requestUrl, meta);
    const metadataStatus = options.includeMetadata ? (meta ? 'available' : 'unavailable') : 'not-requested';
    const resourceInfoStatus = options.includeResourceInfo
      ? resolvedResourceInfo
        ? 'available'
        : 'unavailable'
      : 'not-requested';
    const classificationStatus = options.includeClassification
      ? classification
        ? 'available'
        : 'unavailable'
      : 'not-requested';

    return {
      canonicalUrl,
      meta,
      resourceInfo: resolvedResourceInfo,
      classification,
      lookupMeta: {
        resourceType: resourceType ? String(resourceType) : null,
        metadataSourceId: meta?.tsExtractedInfo?.sourceId || null,
        requestedMetadata: options.includeMetadata,
        usedMetadata: metadataStatus === 'available',
        metadataStatus,
        requestedResourceInfo: options.includeResourceInfo,
        usedResourceInfo: resourceInfoStatus === 'available',
        resourceInfoStatus,
        requestedClassification: options.includeClassification,
        usedClassification: classificationStatus === 'available',
        classificationStatus,
        libraryMatchLocation: 'client-only',
        libraryMatchReason: 'client-side-encryption',
      },
    };
  }
}
