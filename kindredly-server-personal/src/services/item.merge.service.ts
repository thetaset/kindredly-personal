import knex from '@/db/knex_config';
import {ItemRepo} from '@/db/item.repo';
import {ItemFeedbackRepo} from '@/db/item_feedback.repo';
import {ItemRelationRepo} from '@/db/item_relation.repo';
import {UserPermRepo} from '@/db/user_perm.repo';
import {SyncType, UserChangeLogRepo} from '@/db/user_changelog.repo';
import {RequestContext} from '@/base/request_context';
import {KEY_DIL} from '@/templates/email.templates';
import type {MergeLibraryDuplicatesRequest, MergeLibraryDuplicatesResponse} from 'tset-sharedlib/api';
import type Item from 'tset-sharedlib/schemas/public/Item';
import {ItemTypeEnum} from 'tset-sharedlib/shared.types';
import {assertEncInfoUpdateIsSafe, payloadContainsCiphertext} from '@/utils/encinfo_guards';
import {AuditLogService} from './audit_log.service';
import ChangeLogService from './change_log.service';
import PermissionService from './permission.service';
import {buildRefStateId} from './ref_state.service';
import {checkIfItemIsEncrypted, getSanitizedItemForSaving, hasValidEncInfoKeys} from './item.service';
import {
  assertMergeableGroup,
  mergeFeedbackRows,
  mergePermissionRows,
  mergeTimeMs,
  partitionRemovedIds,
} from './item.merge.policy';

function attachmentEntries(item: Partial<Item>): any[] {
  const entries = item.attachments?.entries;
  return Array.isArray(entries) ? entries : [];
}

function attachmentKey(value: any): string {
  return String(value?.id || value?.fileId || JSON.stringify(value));
}

function assertAttachmentsPreserved(items: Item[], mergedDetails: Partial<Item>) {
  const preserved = new Set(attachmentEntries(mergedDetails).map(attachmentKey));
  for (const attachment of items.flatMap(attachmentEntries)) {
    if (!preserved.has(attachmentKey(attachment))) {
      throw new Error('The merge payload did not preserve every attachment.');
    }
  }
}

export default class ItemMergeService {
  private permissionService = new PermissionService();
  private changeLogService = new ChangeLogService();

  async merge(ctx: RequestContext, request: MergeLibraryDuplicatesRequest): Promise<MergeLibraryDuplicatesResponse> {
    const survivorItemId = String(request.survivorItemId || '');
    let removedItemIds = (request.duplicateItemIds || []).map(String);
    let itemIds = [survivorItemId, ...removedItemIds];
    if (!survivorItemId || removedItemIds.length === 0 || new Set(itemIds).size !== itemIds.length) {
      throw new Error('Choose one survivor and at least one different duplicate.');
    }
    if (itemIds.length > 20) throw new Error('At most 20 duplicate items can be merged at once.');
    if (!request.mergedDetails || typeof request.mergedDetails !== 'object') {
      throw new Error('Merged item details are required.');
    }

    // Authorize before resolving the old recipient sets. The same invariants are checked
    // again under row locks below so this read-only preflight does not weaken the transaction.
    const previewItems = await new ItemRepo().findWhereIdInAndInAccount(itemIds, ctx.accountId);
    const previewSurvivor = previewItems.find((item) => item._id === survivorItemId);
    if (!previewSurvivor) {
      throw new Error('The item you chose to keep no longer exists in this account.');
    }

    // A duplicate that is already gone needs no merge — its removal is the outcome a merge would
    // produce. A client whose local index still lists it would otherwise never be able to finish
    // the group. They are reported back as removed so that stale index prunes itself.
    const presentIds = new Set(previewItems.map((item) => item._id));
    const {alreadyGoneItemIds, mergeableRemovedIds} = partitionRemovedIds(removedItemIds, presentIds);
    removedItemIds = mergeableRemovedIds;
    itemIds = [survivorItemId, ...removedItemIds];

    assertMergeableGroup(previewItems, previewSurvivor);
    await ctx.verifySelfOrAdmin(previewSurvivor.userId);

    // Everything else in the group was already removed, so there is nothing left to combine.
    // Report the gone ids so the caller can prune, and skip the transaction entirely.
    if (removedItemIds.length === 0) {
      return {
        survivorItemId,
        removedItemIds: alreadyGoneItemIds,
        alreadyGoneItemIds,
        mergedCollectionIds: [],
        permissionCount: 0,
        feedbackCount: 0,
      };
    }

    const recipientSets = await Promise.all(
      itemIds.map((id) => this.permissionService._listUserIdsWithPermissionsToItem(ctx, id, true)),
    );
    const recipientIds = [...new Set(recipientSets.flat())];

    const result = await knex.transaction(async (trx) => {
      const itemRepo = new ItemRepo().withTransaction(trx) as ItemRepo;
      const permissionRepo = new UserPermRepo().withTransaction(trx) as UserPermRepo;
      const relationRepo = new ItemRelationRepo().withTransaction(trx) as ItemRelationRepo;
      const feedbackRepo = new ItemFeedbackRepo().withTransaction(trx) as ItemFeedbackRepo;

      const items = await itemRepo.query().whereIn('_id', itemIds).andWhere({accountId: ctx.accountId}).forUpdate();
      if (items.length !== itemIds.length) throw new Error('One or more duplicate items do not exist in this account.');
      const survivor = items.find((item) => item._id === survivorItemId);
      if (!survivor) throw new Error('The selected survivor does not exist.');

      const owners = new Set(items.map((item) => item.userId));
      const types = new Set(items.map((item) => item.type));
      if (owners.size !== 1 || types.size !== 1 || survivor.type === ItemTypeEnum.collection) {
        throw new Error('Duplicate merges require one owner, one non-collection item type, and one account.');
      }
      if (items.some((item) => item.published || item.permanent)) {
        throw new Error('Published and system-managed items cannot be merged.');
      }
      await ctx.verifySelfOrAdmin(survivor.userId);
      assertAttachmentsPreserved(items, request.mergedDetails);

      const itemUpdates = getSanitizedItemForSaving(request.mergedDetails);
      if (survivor.encInfo) {
        if (!hasValidEncInfoKeys(itemUpdates.encInfo)) {
          throw new Error('Encrypted duplicate merges require valid survivor encryption keys.');
        }
        assertEncInfoUpdateIsSafe({
          currentEncInfo: survivor.encInfo,
          nextEncInfo: itemUpdates.encInfo,
          context: '/item/duplicates/merge',
          payloadForCiphertextCheck: itemUpdates,
        });
      } else if (itemUpdates.encInfo && !payloadContainsCiphertext(itemUpdates)) {
        throw new Error('Refusing to attach encryption metadata without encrypted item content.');
      }

      await itemRepo.updateWithId(survivorItemId, {
        ...itemUpdates,
        attachments: request.mergedDetails.attachments,
        encrypted: checkIfItemIsEncrypted(itemUpdates),
        updatedAt: new Date(),
      });

      const permissionRows = await permissionRepo.query().whereIn('itemId', itemIds);
      const mergedPermissions = mergePermissionRows(permissionRows, survivorItemId);
      await permissionRepo.deleteWhereIn('itemId', itemIds);
      if (mergedPermissions.length) await permissionRepo.query().insert(mergedPermissions);

      const relationRows = await relationRepo.query().whereIn('itemId', itemIds);
      const byCollection = new Map<string, any>();
      const relationCountByCollection = new Map<string, number>();
      for (const relation of relationRows) {
        if (!relation.collectionId) continue;
        relationCountByCollection.set(
          relation.collectionId,
          (relationCountByCollection.get(relation.collectionId) || 0) + 1,
        );
        const current = byCollection.get(relation.collectionId);
        if (!current || relation.itemId === survivorItemId) byCollection.set(relation.collectionId, relation);
      }
      const mergedRelations = [...byCollection.values()].map((relation) => ({
        ...relation,
        _id: `${relation.collectionId}${KEY_DIL}${survivorItemId}`,
        itemId: survivorItemId,
      }));
      await relationRepo.deleteWhereIn('itemId', itemIds);
      if (mergedRelations.length) await relationRepo.query().insert(mergedRelations);

      // A collection holding several copies keeps exactly one relation afterwards. Without this
      // the stored itemCount stays at the pre-merge total and the collection reports phantom items.
      for (const [collectionId, relationCount] of relationCountByCollection) {
        if (relationCount < 2) continue;
        await trx('item')
          .where({_id: collectionId})
          .update({itemCount: trx.raw('GREATEST(COALESCE(??, 0) - ?, 0)', ['itemCount', relationCount - 1])});
      }

      const feedbackRows = await feedbackRepo.query().whereIn('itemId', itemIds);
      const mergedFeedback = mergeFeedbackRows(feedbackRows, survivorItemId);
      await feedbackRepo.deleteWhereIn('itemId', itemIds);
      if (mergedFeedback.length) await feedbackRepo.query().insert(mergedFeedback);

      // These references are item-keyed but do not need content re-encryption when only refId changes.
      await trx('comment').where({refType: 'item'}).whereIn('refId', removedItemIds).update({refId: survivorItemId});
      await trx('user_file').where({refType: 'item'}).whereIn('refId', removedItemIds).update({refId: survivorItemId});

      const stateRows = await trx('ref_state').where({refType: 'item'}).whereIn('refId', itemIds);
      const stateBySlot = new Map<string, any>();
      for (const row of stateRows.sort((a, b) => mergeTimeMs(b.updatedAt) - mergeTimeMs(a.updatedAt))) {
        const slot = `${row.ownerType}:${row.ownerId}:${row.stateKey}:${row.stateSubKey || ''}`;
        if (!stateBySlot.has(slot)) stateBySlot.set(slot, row);
      }
      if (stateRows.length) {
        await trx('ref_state').where({refType: 'item'}).whereIn('refId', itemIds).delete();
        // ref_state._id is derived from refId. Carrying a discarded item's id onto a survivor row
        // leaves the row unreachable by id while still holding the (owner, ref, key) unique slot,
        // so the next upsert for that slot fails on the unique constraint.
        await trx('ref_state').insert(
          [...stateBySlot.values()].map((row) => ({
            ...row,
            refId: survivorItemId,
            _id: buildRefStateId({
              ownerType: row.ownerType,
              ownerId: row.ownerId,
              refType: row.refType,
              refId: survivorItemId,
              stateKey: row.stateKey,
              stateSubKey: row.stateSubKey || '',
            }),
          })),
        );
      }

      await itemRepo.deleteWhereIn('_id', removedItemIds);

      if (recipientIds.length) {
        await (new UserChangeLogRepo().withTransaction(trx) as UserChangeLogRepo).addChangeLogEntries(recipientIds, {
          type: SyncType.itemUpdate,
          items: itemIds,
        });
      }
      await AuditLogService.instance.log(
        ctx,
        {
          action: 'item.merge',
          entityType: 'item',
          entityId: survivorItemId,
          // Keyed object, like every other audit caller: the audit list queries this column
          // with `->>`, which cannot address a bare array.
          relatedIds: {removedItemIds},
        },
        trx,
      );

      return {
        survivorItemId,
        // The caller prunes by this list, and an already-gone id is just as gone.
        removedItemIds: [...removedItemIds, ...alreadyGoneItemIds],
        alreadyGoneItemIds,
        mergedCollectionIds: [...byCollection.keys()],
        permissionCount: mergedPermissions.length,
        feedbackCount: mergedFeedback.length,
      };
    });

    this.changeLogService.broadcastItemChangeForUserIds(recipientIds, itemIds);
    return result;
  }
}
