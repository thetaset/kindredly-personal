import { Knex } from 'knex';


export class BaseRepo<TModel> {
  public tbl: string;
  public jsonArrayFields: string[] = [];
  protected db: Knex<TModel, TModel[]>;
  protected trx: Knex.Transaction;

  constructor(tbl: string, db: Knex) {
    this.tbl = tbl;
    this.db = db;
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

  // // TODO: Test this -- not in use yet
  // // Call this to bind a transaction to the repository
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
    const updatedData = { ...data } as any;
    for (const fieldName of this.jsonArrayFields) {
      if (fieldName in updatedData && updatedData[fieldName]) {
        updatedData[fieldName] = JSON.stringify(updatedData[fieldName]);
      }
    }
    return updatedData;
  }

  query() {
    return this.db<TModel>(this.tbl);
  }

  where(input: TModel) {
    return this.db<TModel>(this.tbl).where(input);
  }


  findMany(input: TModel)  {
    return this.where(input);
  }

  findAll(){
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

}
