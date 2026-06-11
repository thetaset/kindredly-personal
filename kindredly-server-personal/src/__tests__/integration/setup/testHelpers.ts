import {Knex} from 'knex';
import {ItemTypeEnum} from 'tset-sharedlib/shared.types';
import {v4 as uuidv4} from 'uuid';

export async function createTestItem(
  db: Knex,
  userId: string,
  data: {
    url?: string;
    title?: string;
    type?: ItemTypeEnum;
    content?: any;
    useCriteria?: string[];
  },
): Promise<string> {
  const itemId = `i_${uuidv4()}`;
  const [item] = await db('item')
    .insert({
      _id: itemId,
      userId,
      url: data.url || 'https://example.com',
      name: data.title || 'Test Item',
      type: data.type || ItemTypeEnum.link,
      useCriteria: data.useCriteria ? JSON.stringify(data.useCriteria) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning('_id');

  return item._id;
}

export async function createTestCollection(
  db: Knex,
  userId: string,
  name: string,
  description?: string,
): Promise<string> {
  const collectionId = `i_${uuidv4()}`;
  const [collection] = await db('item')
    .insert({
      _id: collectionId,
      userId,
      type: ItemTypeEnum.collection,
      name,
      description: description || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning('_id');

  return collection._id;
}

export async function createTestPost(
  db: Knex,
  userId: string,
  data: {
    title?: string;
    content?: any;
    published?: boolean;
  },
): Promise<string> {
  const [post] = await db('post')
    .insert({
      userId,
      title: data.title || 'Test Post',
      content: data.content || {text: 'Test content'},
      published: data.published !== undefined ? data.published : false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning('_id');

  return post._id;
}

export function expectValidTimestamp(value: any): void {
  expect(value).toBeDefined();
  const date = new Date(value);
  expect(date.getTime()).toBeGreaterThan(0);
}

export function expectValidId(value: any, prefix?: string): void {
  expect(value).toBeDefined();
  expect(typeof value).toBe('string');
  if (prefix) {
    expect(value.startsWith(prefix)).toBe(true);
  }
}
