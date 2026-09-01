/**
 * Minimal shape for `embedded-postgres`, declared here rather than imported.
 *
 * The package ships real types at `node_modules/embedded-postgres/dist/index.d.ts`,
 * but it is ESM-only and exposes them through an `exports` map, which this
 * project's `moduleResolution: "Node"` cannot read. Switching the whole server to
 * `node16`/`nodenext` to type one optional dependency is the wrong trade - it
 * changes how every import in the codebase resolves.
 *
 * So: only the surface `db/embedded_postgres.ts` actually calls is declared. If a
 * caller needs more, add it here deliberately rather than widening to `any`.
 */
declare module 'embedded-postgres' {
  export interface EmbeddedPostgresOptions {
    databaseDir: string;
    port: number;
    user: string;
    password: string;
    persistent: boolean;
    postgresFlags: string[];
  }

  export default class EmbeddedPostgres {
    constructor(options: Partial<EmbeddedPostgresOptions>);
    /** Runs initdb. Only valid against an empty data directory. */
    initialise(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    /** Throws if the database already exists. */
    createDatabase(name: string): Promise<void>;
  }
}
