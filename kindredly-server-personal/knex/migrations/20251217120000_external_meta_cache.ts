import { Knex } from "knex";

/**
 * Creates external_meta_cache table for caching metadata from external APIs
 * (YouTube, Reddit, Netflix, etc.) with TTL-based freshness and parent-child relationships.
 * 
 * Key design decisions:
 * - resourceType + externalId as the logical key (allows same content from different URL formats)
 * - parentExternalId enables hierarchical queries (e.g., get all videos for a channel)
 * - meta stores basic ItemMeta structure, extendedInfo stores provider-specific data
 * - sourceId tracks where the metadata came from for debugging
 * - expiresAt enables TTL-based cache invalidation
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("external_meta_cache", (table) => {
    // Primary key: hash of resourceType:externalId for deduplication
    table.string("_id", 255).primary();
    
    // Resource identification
    table.string("resourceType", 50).notNullable().index();
    table.string("externalId", 255).notNullable(); // e.g., YouTube videoId, channelId
    table.string("parentExternalId", 255).nullable(); // e.g., channelId for a video
    table.string("canonicalUrl", 2048).nullable(); // normalized URL
    
    // Metadata storage
    table.jsonb("meta").nullable(); // ItemMeta structure
    table.jsonb("extendedInfo").nullable(); // Provider-specific (age rating, madeForKids, etc.)
    
    // Source tracking
    table.string("sourceId", 50).nullable(); // 'yt_api', 'reddit_api', 'html_parser', etc.
    
    // Cache management
    table.integer("fetchCount").defaultTo(1);
    table.timestamp("fetchedAt", { useTz: true }).notNullable();
    table.timestamp("expiresAt", { useTz: true }).nullable();
    table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Composite indexes for efficient lookups
    table.index(["resourceType", "externalId"], "idx_ext_meta_type_extid");
    table.index(["resourceType", "parentExternalId"], "idx_ext_meta_type_parent");
    table.index(["expiresAt"], "idx_ext_meta_expires");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("external_meta_cache");
}
