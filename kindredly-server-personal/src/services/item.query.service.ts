import {ItemRepo} from '@/db/item.repo';
import {ItemFeedbackRepo} from '@/db/item_feedback.repo';
import {ItemRelationRepo} from '@/db/item_relation.repo';
import {UserPermRepo} from '@/db/user_perm.repo';
import knex from '@/db/knex_config';
import {RequestContext} from '../base/request_context';
import {feedbackFieldNaming, getFeedbackData, isValidFeedbackField} from '@/utils/feedback_helpers';
import {ItemQueryRequest, ItemQueryResponse, ItemQueryFilters, ItemQueryIncludes} from 'tset-sharedlib/api';
import {ItemInfoView, PermissionType} from 'tset-sharedlib/shared.types';
import {Knex} from 'knex';
import {clampOffset, clampPerPage} from '@/utils/pagination_utils';

// Hard ceiling on a single /item/query page. The route used to materialize the
// entire library and slice in JS — the same shape as the 2026-07-05 sync OOM.
export const ITEM_QUERY_MAX_LIMIT = 500;

export default class ItemQueryService {
  private itemRepo = new ItemRepo();
  private feedbackRepo = new ItemFeedbackRepo();
  private relationRepo = new ItemRelationRepo();
  private permRepo = new UserPermRepo();

  /**
   * Execute item query with filters
   */
  async query(ctx: RequestContext, request: ItemQueryRequest): Promise<ItemQueryResponse> {
    const {userId, filters = {}, includes = {}, pagination = {}, sort = {}} = request;

    const targetUserId = userId || ctx.currentUserId;

    // Permission check
    await ctx.verifySelfOrAdmin(targetUserId);

    // Early return for empty ID filter
    if (filters.ids && filters.ids.length === 0) {
      return {items: [], total: 0, hasMore: false};
    }

    // Build query. applyFilters includes the default archived/hidden drop
    // rules (previously applied in JS after materializing everything), so
    // pagination can run in SQL without changing which items a page contains.
    let query = this.buildBaseQuery(targetUserId, filters, includes);
    query = this.applyFilters(query, targetUserId, filters, includes);

    const {limit = 50, offset = 0} = pagination;
    const safeLimit = clampPerPage(limit, 50, ITEM_QUERY_MAX_LIMIT);
    const safeOffset = clampOffset(offset);

    // `total` keeps its historical meaning: the full post-filter count. Clone
    // before sorting so the count query carries no ORDER BY.
    const countRow = await query.clone().clearSelect().count({count: 'item._id'}).first();
    const total = Number(countRow?.count ?? 0);

    const feedbackJoinActive = this.isFeedbackJoinActive(filters, includes);
    const items = await this.applySorting(query, sort, feedbackJoinActive).limit(safeLimit).offset(safeOffset);
    const processedItems = await this.postProcessItems(items, targetUserId, includes);

    return {
      items: processedItems,
      total,
      hasMore: safeOffset + safeLimit < total,
    };
  }

  // ============================================================================
  // HELPER METHODS (kept for backwards compatibility with standard mode)
  // ============================================================================

  /**
   * Build the base Knex query with joins
   */
  // Single source of truth for when the item_feedback join is present on the
  // query — buildBaseQuery, the hidden-filter default, and the visited sort
  // must all agree or SQL references an unjoined table.
  private isFeedbackJoinActive(filters: ItemQueryFilters, includes: ItemQueryIncludes): boolean {
    return Boolean(
      includes.feedback || filters.feedbackTypes || filters.archived !== undefined || filters.hidden !== undefined,
    );
  }

  private buildBaseQuery(userId: string, filters: ItemQueryFilters, includes: ItemQueryIncludes): Knex.QueryBuilder {
    let query = knex('item').select('item.*');

    // Always include feedback if requested or if filtering by feedback
    if (this.isFeedbackJoinActive(filters, includes)) {
      query = query
        .leftJoin('item_feedback', function () {
          this.on('item_feedback.itemId', '=', 'item._id').andOn('item_feedback.userId', '=', knex.raw('?', [userId]));
        })
        .select(...feedbackFieldNaming);
    }

    // Note: permissions are fetched in postProcessItems to avoid GROUP BY complexity

    return query;
  }

  /**
   * Apply filters to the query
   */
  private applyFilters(
    query: Knex.QueryBuilder,
    userId: string,
    filters: ItemQueryFilters,
    includes: ItemQueryIncludes = {},
  ): Knex.QueryBuilder {
    // User filter (always apply for standard mode)
    query = query.where('item.userId', userId);

    // ID filters
    if (filters.ids && filters.ids.length) {
      query = query.whereIn('item._id', filters.ids);
    }

    // Archived filter. When the filter is absent, archived items are excluded
    // by default — this used to happen in a JS pass after materializing every
    // row; it lives in SQL now so pagination sees the same set.
    if (filters.archived !== undefined) {
      if (filters.archived) {
        query = query.where('item.archived', true);
      } else {
        query = query.where(function () {
          this.where('item.archived', false).orWhereNull('item.archived');
        });
      }
    } else {
      query = query.where(function () {
        this.where('item.archived', false).orWhereNull('item.archived');
      });
    }

    // Hidden filter. Same default-exclusion move as archived, with one parity
    // subtlety: the old JS pass could only see isHidden when the feedback join
    // was active, so the default exclusion applies only under that condition —
    // adding the join just for this would change results.
    const feedbackJoinActive = this.isFeedbackJoinActive(filters, includes);
    if (filters.hidden !== undefined) {
      if (filters.hidden) {
        query = query.where('item_feedback.isHidden', true);
      } else {
        query = query.where(function () {
          this.where('item_feedback.isHidden', false).orWhereNull('item_feedback.isHidden');
        });
      }
    } else if (feedbackJoinActive && !filters.feedbackTypes?.includes('isHidden')) {
      query = query.where(function () {
        this.where('item_feedback.isHidden', false).orWhereNull('item_feedback.isHidden');
      });
    }

    // Uncategorized filter (no parent collections)
    if (filters.uncategorized) {
      query = query.whereNotExists(function () {
        // "itemId" MUST stay quoted. Unquoted, Postgres folds it to `itemid`,
        // which does not exist - knex created the column camelCase - and the
        // whole query 500s. This filter is reachable from the library's
        // "Uncategorized" menu entry, so that was a live error for anyone who
        // clicked it. Same for the inCollections subquery below, and see
        // item.list.service.ts for the sibling that always had it right.
        this.select('*').from('item_relation').whereRaw('item_relation."itemId" = item._id');
      });
      // A collection is never uncategorized, even when nothing holds it: a collection IS
      // the filing, so a top-level one is organized by definition. The Unorganized page
      // listed every root collection until this was here. NULL-type parity, and the same
      // rule as getUncategorizedList in item.list.service.ts and the client's
      // queryFromIndexLocal — all three must keep saying it.
      query = query.where(function () {
        this.whereNot('item.type', 'col').orWhereNull('item.type');
      });
    }

    // Item type filters
    if (filters.itemTypes && filters.itemTypes.length > 0) {
      query = query.whereIn('item.type', filters.itemTypes);
    }

    // SubType filters
    if ((filters as any).subTypes && (filters as any).subTypes.length > 0) {
      query = query.whereIn('item.subType', (filters as any).subTypes);
    }

    if (filters.inCollections && filters.inCollections.length > 0) {
      query = query.whereExists(function () {
        this.select('*')
          .from('item_relation')
          .whereRaw('item_relation."itemId" = item._id')
          .whereIn('item_relation.collectionId', filters.inCollections!);
      });
    }

    // Feedback type filters
    if (filters.feedbackTypes && filters.feedbackTypes.length > 0) {
      query = query.where(function () {
        for (const feedbackType of filters.feedbackTypes!) {
          this.orWhereNotNull(`item_feedback.${feedbackType}`);
        }
      });
    }

    // PublishId filter
    if (filters.publishIds && filters.publishIds.length > 0) {
      query = query.whereIn('item.publishId', filters.publishIds);
    }

    // URL filter (exact match)
    if (filters.urls && filters.urls.length > 0) {
      query = query.whereIn('item.url', filters.urls);
    }

    // Attribute filters (for specialized queries)
    if (filters.attributeKey && filters.attributeValue) {
      console.warn('Attribute filters not yet implemented in server query');
    }

    // These resolve from meta/feeds/useCriteria, which are encrypted blobs here — the
    // server cannot evaluate them. Client-local only; the client throws rather than route
    // such a query here, so reaching this is a bug worth seeing.
    if ((filters as any).effectiveTypes?.length) {
      console.warn('effectiveTypes filter is client-local only and is ignored server-side');
    }
    if ((filters as any).eduValues?.length) {
      console.warn('eduValues filter is client-local only and is ignored server-side');
    }
    if ((filters as any).tags?.length) {
      console.warn('tags filter is client-local only and is ignored server-side');
    }

    return query;
  }

  /**
   * Apply sorting to the query
   */
  private applySorting(
    query: Knex.QueryBuilder,
    sort: {field?: string; order?: string},
    feedbackJoinActive: boolean = true,
  ): Knex.QueryBuilder {
    const {field = 'created', order = 'desc'} = sort;

    switch (field) {
      case 'created':
        query = query.orderBy('item.createdAt', order as any);
        break;
      case 'modified':
        query = query.orderBy('item.updatedAt', order as any);
        break;
      case 'visited':
        // lastVisit lives on item_feedback, which is only joined when feedback
        // is referenced elsewhere in the request. Without the join the ORDER BY
        // would reference an unjoined table (Postgres missing-FROM 500), so
        // fall back to the default sort.
        query = feedbackJoinActive
          ? query.orderBy('item_feedback.lastVisit', order as any)
          : query.orderBy('item.createdAt', order as any);
        break;
      case 'title':
      case 'name':
        query = query.orderBy('item.name', order as any);
        break;
      default:
        query = query.orderBy('item.createdAt', 'desc');
    }

    // Tiebreaker: every sortable column above is non-unique, and SQL
    // LIMIT/OFFSET gives no stable order among equal keys — without this,
    // offset-paged sweeps can duplicate or drop rows on timestamp ties.
    return query.orderBy('item._id', 'asc');
  }

  /**
   * Post-process items to add additional data
   * Returns ItemInfoView in same format as other query modes
   */
  private async postProcessItems(items: any[], userId: string, includes: ItemQueryIncludes): Promise<ItemInfoView[]> {
    if (items.length === 0) return [];

    const itemIds = items.map((item) => item._id);

    // Fetch permissions if requested
    let permissionsByItem: Record<string, any[]> = {};
    if (includes.permissions) {
      const allPerms = await this.permRepo
        .query()
        .whereIn('itemId', itemIds)
        .select('itemId', 'userId', 'permission', 'sharedByUserId', 'createdAt');

      for (const perm of allPerms) {
        if (!permissionsByItem[perm.itemId]) permissionsByItem[perm.itemId] = [];
        permissionsByItem[perm.itemId].push({
          userId: perm.userId,
          permission: perm.permission,
          sharedByUserId: perm.sharedByUserId,
          createdAt: perm.createdAt,
        });
      }
    }

    // Fetch collection relationships if requested
    let relationsByItem: Record<
      string,
      Array<{_id: string; collectionId: string; order: number | null; createdAt: string | null}>
    > = {};
    if (includes.allCollections || includes.parents || includes.parentCollectionIds) {
      const relations = await this.relationRepo
        .query()
        .whereIn('itemId', itemIds)
        .select('_id', 'itemId', 'collectionId', 'order', 'createdAt');

      for (const rel of relations) {
        if (!relationsByItem[rel.itemId]) relationsByItem[rel.itemId] = [];
        relationsByItem[rel.itemId].push({
          _id: rel._id,
          collectionId: rel.collectionId,
          order: rel.order,
          createdAt: rel.createdAt,
        });
      }
    }

    // Build results in same format as other query modes. The archived/hidden
    // default exclusions moved into applyFilters (SQL) so pagination is exact;
    // re-filtering here would silently shrink pages if the two ever drifted —
    // the integration parity tests own that invariant instead.
    return items.map((v) => {
      const result: any = {
        itemId: v._id,
        details: v,
        feedback: includes.feedback ? getFeedbackData(v) : undefined,
      };

      if (includes.permissions) {
        // Always include owner from item.userId
        result.permissions = [{userId: v.userId, permission: PermissionType.owner}];
        if (permissionsByItem[v._id]) {
          result.permissions = [...permissionsByItem[v._id], ...result.permissions];
        }
      }

      if (includes.allCollections || includes.parents || includes.parentCollectionIds) {
        const relations = relationsByItem[v._id] || [];
        result.collectionRelations = relations;
        // Backwards compatibility - derive collectionIds from collectionRelations
        result.collectionIds = relations.map((r) => r.collectionId);
      }

      return result;
    });
  }
}
