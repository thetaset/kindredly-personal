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

    // Build and execute query
    let query = this.buildBaseQuery(targetUserId, filters, includes);
    query = this.applyFilters(query, targetUserId, filters);
    query = this.applySorting(query, sort);

    const items = await query;
    const processedItems = await this.postProcessItems(items, targetUserId, includes, filters);

    // Apply pagination
    const {limit = 50, offset = 0} = pagination;
    const total = processedItems.length;
    const paginatedItems = processedItems.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      items: paginatedItems,
      total,
      hasMore,
    };
  }

  // ============================================================================
  // HELPER METHODS (kept for backwards compatibility with standard mode)
  // ============================================================================

  /**
   * Build the base Knex query with joins
   */
  private buildBaseQuery(userId: string, filters: ItemQueryFilters, includes: ItemQueryIncludes): Knex.QueryBuilder {
    let query = knex('item').select('item.*');

    // Always include feedback if requested or if filtering by feedback
    if (includes.feedback || filters.feedbackTypes || filters.archived !== undefined || filters.hidden !== undefined) {
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
  private applyFilters(query: Knex.QueryBuilder, userId: string, filters: ItemQueryFilters): Knex.QueryBuilder {
    // User filter (always apply for standard mode)
    query = query.where('item.userId', userId);

    // ID filters
    if (filters.ids && filters.ids.length) {
      query = query.whereIn('item._id', filters.ids);
    }

    // Archived filter
    if (filters.archived !== undefined) {
      if (filters.archived) {
        query = query.where('item.archived', true);
      } else {
        query = query.where(function () {
          this.where('item.archived', false).orWhereNull('item.archived');
        });
      }
    }

    // Hidden filter
    if (filters.hidden !== undefined) {
      if (filters.hidden) {
        query = query.where('item_feedback.isHidden', true);
      } else {
        query = query.where(function () {
          this.where('item_feedback.isHidden', false).orWhereNull('item_feedback.isHidden');
        });
      }
    }

    // Uncategorized filter (no parent collections)
    if (filters.uncategorized) {
      query = query.whereNotExists(function () {
        this.select('*').from('item_relation').whereRaw('item_relation.itemId = item._id');
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
          .whereRaw('item_relation.itemId = item._id')
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

    return query;
  }

  /**
   * Apply sorting to the query
   */
  private applySorting(query: Knex.QueryBuilder, sort: {field?: string; order?: string}): Knex.QueryBuilder {
    const {field = 'created', order = 'desc'} = sort;

    switch (field) {
      case 'created':
        query = query.orderBy('item.createdAt', order as any);
        break;
      case 'modified':
        query = query.orderBy('item.updatedAt', order as any);
        break;
      case 'visited':
        query = query.orderBy('item_feedback.lastVisit', order as any);
        break;
      case 'title':
      case 'name':
        query = query.orderBy('item.name', order as any);
        break;
      default:
        query = query.orderBy('item.createdAt', 'desc');
    }

    return query;
  }

  /**
   * Post-process items to add additional data
   * Returns ItemInfoView in same format as other query modes
   */
  private async postProcessItems(
    items: any[],
    userId: string,
    includes: ItemQueryIncludes,
    filters: ItemQueryFilters,
  ): Promise<ItemInfoView[]> {
    if (items.length === 0) return [];

    const includeArchived = filters.archived === true;
    const includeHidden = filters.hidden === true || !!filters.feedbackTypes?.includes('isHidden');

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

    // Build results in same format as other query modes
    return items
      .filter((v) => {
        if (!includeArchived && v.archived === true) return false;
        if (!includeHidden && v.isHidden === true) return false;
        return true;
      })
      .map((v) => {
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
