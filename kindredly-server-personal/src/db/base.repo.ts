import {Knex} from 'knex';

export class BaseRepo<TModel> {
  public tbl: string;
  public jsonArrayFields: string[] = [];
  protected db: Knex<TModel, TModel[]>;
  protected trx: Knex.Transaction;
  public knex: Knex<TModel, TModel[]>; // Add this property

  constructor(tbl: string, db: Knex) {
    this.tbl = tbl;
    this.db = db;
    this.knex = db; // Initialize knex property
  }

  _knex() {
    return this.db;
  }

  static createInstanceWithTransaction(db: Knex, tbl: string, trx: Knex.Transaction) {
    const repo = new BaseRepo(tbl, db);
    repo.trx = trx;
    repo.knex = trx.bind(db);
    return repo;
  }

  /**
   * Bind a transaction to a copy of this repo, so `this.query()` runs inside it.
   *
   * In use at five call sites (permission.service, user.service, audit_log.service);
   * the "not in use yet" note it used to carry had been wrong for a while. SYNC-7.
   *
   * It rebinds `this.knex` and NOTHING else, which is the trap: a repo method that
   * reaches for the globally imported `knex` -- as `UserChangeLogRepo` did until
   * SYNC-6 -- writes outside the transaction while looking like it is inside one.
   * That is worse than no transaction, because it reads as fixed. Before binding a
   * transaction to a repo, check every statement in it goes through `this.query()`.
   */
  withTransaction(trx: Knex.Transaction) {
    const repo = Object.create(this);
    repo.trx = trx;
    repo.knex = trx.bind(this.db);
    return repo;
  }

  createTransaction() {
    return this.db.transaction();
  }

  _updateInput(data: TModel) {
    const updatedData = {...data} as any;
    for (const fieldName of this.jsonArrayFields) {
      if (fieldName in updatedData && updatedData[fieldName]) {
        updatedData[fieldName] = JSON.stringify(updatedData[fieldName]);
      }
    }
    return updatedData;
  }

  query() {
    return this.knex<TModel>(this.tbl);
  }

  where(input: TModel) {
    return this.knex<TModel>(this.tbl).where(input);
  }

  findMany(input: TModel) {
    return this.where(input);
  }

  findAll() {
    return this.query().select();
  }

  findWhereIn(col, vals: any[]) {
    return this.query().whereIn(col, vals);
  }

  async countRows(input: TModel) {
    return Number((await this.where(input).count().first()).count);
  }

  async countFromQuery(query) {
    return Number((await query.count().first()).count);
  }

  async countAllRows() {
    return Number((await this.query().count().first()).count);
  }

  async deleteWhere(input: TModel) {
    return await this.where(input).delete();
  }

  async deleteWhereIn(key: string, vals: any[]) {
    return await this.query().whereIn(key, vals).delete();
  }

  async deleteBefore(column: string, date: Date) {
    return await this.query().where(column, '<', date).delete();
  }
}
