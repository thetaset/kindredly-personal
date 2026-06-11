
export default  interface SitePlugin {
  _id?: string;

  key?: string | null;

  name?: string | null;

  description?: string | null;

  tags?: unknown | null;

  patterns?: unknown | null;

  css?: unknown | null;

  script?: unknown | null;

  version?: string | null;

  createdAt?: Date | null;
}
