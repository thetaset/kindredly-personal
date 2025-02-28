import {UserRepo} from '@/db/user.repo';
import ItemMetaService from './external_data.service';
import ItemRelationService from './item.relations';
import ItemService from './item.service';
import PermissionService from './permission.service';
import {RequestContext} from '../base/request_context';

import { removeAttrsfromObj } from '@/utils/parse_utils';
import ItemListService from './item.list.service';

class ImportExportService {
  private users = new UserRepo();
  private itemService = new ItemService();
  private itemListService = new ItemListService
  private permissionService = new PermissionService();
  private itemMetaService = new ItemMetaService();
  private itemRelationService = new ItemRelationService();

  //
  async exportCollections(ctx: RequestContext, options) {
    if (!(await ctx.isAdmin())) {
      throw new Error('Must be admin');
    }

    const userId = ctx.currentUserId;

    const users = await this.users.listByAccountId(ctx.accountId);

    const userList = await Promise.all(
      users.map(async (v) => {
        const permissions = await this.permissionService._getUserDirectPermissionLookupExcludingOwner(v._id);
        return {
          username: v.username,
          type: v.type,
          permissions: permissions,
        };
      }),
    );

    const user = await this.users.findById(userId);

    function filterAttrsFromObjList(a, attrs) {
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

    function removeAttrsFromObjList(a, attrs) {
      if (!a) return a;
      a.forEach((i) => {
        const ni = {};

        for (const attr of attrs) {
          delete i[attr];
        }
      });

      return a;
    }

    let collections = (await this.itemService._getCollectionsForAccount(ctx.accountId)) as Array<Record<string, any>>;
    //await this.getUserCollections(userId, ['owner', 'editor'])

    const idset = new Set();

    for (const col of collections) {
      const items = await this.itemListService.listItemsWithInfoByCollectionId(ctx,ctx.currentUserId, col.id);
      items.sort((a, b) => {
        return a.collectionRelation.order - b.collectionRelation.order;
      });
      items.forEach((i) => idset.add(i.itemId));

      col.items = filterAttrsFromObjList(items, ['itemId', 'key']);
    }

    collections = filterAttrsFromObjList(collections, ['id', 'name', 'description', 'visibility', 'items']);

    const ids = Array.from(idset);
    console.log('export item ids count', ids.length);

    const itemDetails = filterAttrsFromObjList(await this.itemListService.getItemsByIds(ctx.accountId, ids), [
      'id',
      'key',
      'url',
      'name',
      'description',
      'tags',
      'patterns',
      'type',
      'meta',
      'metaUpdatedAt'
    ]);

    //Maybe not?
    return {
      collections,
      itemDetails,
      itemMeta:itemDetails['meta'],
      userList,
      userInfo: {
        username: user.username,
        options: user.options,
      },
    };
  }

  async loadImport(ctx: RequestContext, importData) {
    const version = importData.version || 1;

    if (version == 1) {
      return await this.loadImportVersion1(ctx, importData);
    } else {
      throw Error('import version not supported: ' + version);
    }
  }


  // move to client, encryption 
  async loadImportVersion1(ctx: RequestContext, importData) {
    const version = importData.version || 1;

    if (version != 1) throw Error('Invalid import version: ' + version);

    const userList = importData.userList;

    const currentUsers = await this.users.listByAccountId(ctx.accountId);
    const usernameToIdLookup = Object.fromEntries(currentUsers.map((v) => [v.username, v._id]));

    // for (const userData of userList) {
    //   if (!(userData.username in usernameToIdLookup)) {
    //     throw Error('All imported users must exist in account, missing ' + userData.username);
    //   }
    // }

    const logs = [];

    function log(entry, ...optionalParams) {
      console.log(entry, ...optionalParams);
      logs.push(entry + (optionalParams.length > 0 ? ' ' + JSON.stringify(optionalParams, null, 2) : ''));
    }

    log(``);
    log(`Creating Collections`);
    //create collections
    const colIdLookup = {};
    const itemParentsLookup = {};
    for (const colData of importData.collections) {
      try {
        let collectionId = null;
        const matchingCols = await this.itemService._getCollectionsWithName(ctx.accountId, colData.name);

        if (matchingCols && matchingCols.length >= 1) {
          collectionId = matchingCols[0]._id;
          log('found matching collection', collectionId, matchingCols);
        } else {
          collectionId= await this.itemService.createCollection(ctx, ctx.currentUserId, {
            name: colData.name,
            description: colData.description,
            visibility: colData.visibility,
          });
        }

        if (collectionId == null) {
          log(`\tError creating collection:`, colData.name);
          continue;
        }

        colIdLookup[colData._id] = collectionId;

        //parent lookup
        for (const itemData of colData.items) {
          const itemId = itemData.itemId;
          if (!(itemId in itemParentsLookup)) itemParentsLookup[itemId] = [];
          itemParentsLookup[itemId].push(collectionId);
        }

        log(`Collection added ${colData.name}`);
      } catch (error) {
        log(`\tError loading collection:${error}`);
      }
    }

    log(``);
    log(`Load Items and add to collections`);
    const itemLookup = {};

    //Load item first to avoid repeat adding of same item
    let itemCount = 0;
    for (const itemDetailsData of importData.itemDetails) {
      try {
        if (itemDetailsData.type == 'col') {
          //if Collection
          const collectionId = colIdLookup[itemDetailsData._id];

          const itemParents = itemParentsLookup[collectionId];

          if (itemParents) {
            for (const parentId of itemParents) {
              await this.itemRelationService._addItemToCollection(ctx, parentId, collectionId, itemDetailsData.type);
            }
          }
        } else {
          //if Item
          const existingItem = null //false// await this.itemService.getItemInfoByKey(ctx, itemDetailsData.key);

          if (existingItem) {
            log(`\tItem already exists: ${itemDetailsData.key}`);
          }

          let itemId = existingItem ? existingItem.id : null;
          const oldItemId = itemDetailsData._id;
          console.log(`Item Details: ${itemId}`);

          const itemParents = itemParentsLookup[oldItemId];
          if (!itemId) {
            itemId = await this.itemService.saveItem(ctx, null, removeAttrsfromObj(itemDetailsData, ['_id']), itemParents);
          } else {
            await this.itemService.updateItem(ctx,itemId, removeAttrsfromObj(itemDetailsData, ['_id']));
            for (const parentId of itemParents) {
              await this.itemRelationService._addItemToCollection(ctx, parentId, itemId, itemDetailsData.type);
            }
          }
          console.log(`\tSaved Item: ${itemId}`);

          itemLookup[oldItemId] = itemId;
          itemCount++;
        }
      } catch (error) {
        log(`\tError adding item details:${itemDetailsData.key}, ${error}`);
      }
    }

    log(``);
    log(`Item Meta data Load`);
    //Add item metadata
    itemCount = 0;
    for (const meta of importData.itemMeta) {
      try {
        const itemId = itemLookup[meta._id];
        if (!itemId) {
          continue;
        }
        console.log('Meta Item Id', itemId);
        meta.bannerImageSrcPath = null;
        meta.bannerImageDataPath = null;

        await this.itemMetaService.saveItemMeta(ctx, itemId, removeAttrsfromObj(meta, ['_id']));
        itemCount++;
      } catch (error) {
        log(`\tError adding item meta:${meta.key}, ${error}`);
      }
    }
    log(`\tadded ${itemCount} Item Meta`);

    log(`Updating permissions`);
    for (const userData of userList) {
      const userId = usernameToIdLookup[userData.username];
      if (!userId) {
        log(`\tUser not found: ${userData.username}`);
        continue;
      }
      if (userId == ctx.currentUserId) continue;
      for (const perm of Object.values<Record<string, any>>(userData.permissions)) {
        const colId = colIdLookup[perm.itemId];

        //TODO, include item permissions as well
        if (!colId) {
          log('Unable to find collection in lookup for ', perm.itemId);
          continue;
        }
        try {
          if (perm.permission == 'owner') {
            await this.permissionService._assignItemOwner(ctx, userId, colId);
          } else if (perm.permission != 'owner') {
            await this.permissionService._setUserPermission(ctx, userId, colId, perm.permission);
          }
        } catch (e) {
          console.log('perm error', e, userData.username, colId);
        }
      }
    }

    return logs;
  }
}

export default ImportExportService;
