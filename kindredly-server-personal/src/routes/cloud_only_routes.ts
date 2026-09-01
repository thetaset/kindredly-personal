import {config} from '@/config';
import type {Routes} from '@interfaces/routes.interface';

/**
 * The routes a self-hosted server does not register.
 *
 * `routes/_internal/` is withheld from the published Kindredly Personal repo
 * (`scripts/personal-sync/server-src.exclude`), so `app.ts` cannot import these
 * statically - a published tree would fail at module load on the first one.
 * That is exactly the boot failure LITE-11 measured, and the reason `app.ts`
 * used to be hand-maintained on both sides and drift for three months.
 * Resolving them here instead lets `app.ts` be an ordinary synced file.
 *
 * **Every require below is RELATIVE, and must stay that way.** swc rewrites
 * `@/` aliases in top-level `import` statements but NOT inside a function-body
 * `require()`, and production runs `node dist/server.js` with no
 * `tsconfig-paths`. An aliased require builds clean, passes every test, and
 * throws MODULE_NOT_FOUND on the one path nothing else exercises.
 * `__tests__/internal_routes.test.ts` guards this.
 */
export function cloudOnlyRoutes(): Routes[] {
  // Returning early is what keeps every require below unreachable on a box.
  // None of these modules exists there: the `_internal` routes were always
  // withheld, and ai.route / ai_usage.service / media_banner.route joined them
  // once this file became their only importer.
  if (config.privateServer) return [];

  // The `personal-optional` marker is per-line on purpose: scripts/personal_drift.mjs
  // suppresses the require it sits on (or within two lines above), never a whole
  // file. One marker at the top of the block would silently cover the first two
  // and leave the other nine failing the gate.
  /* eslint-disable @typescript-eslint/no-var-requires */
  const AdminRoute = require('./_internal/admin.route').default; // personal-optional: guarded
  const AITaskRoute = require('./_internal/aitask.route').default; // personal-optional: guarded
  const AuthForProviders = require('./_internal/auth_for_providers.route').default; // personal-optional: guarded
  const ContactRoute = require('./_internal/contact.route').default; // personal-optional: guarded
  const FollowingRoute = require('./_internal/following.route').default; // personal-optional: guarded
  const FriendRoute = require('./_internal/friend.route').default; // personal-optional: guarded
  const InternalMiscRoute = require('./_internal/internal.misc.route').default; // personal-optional: guarded
  const ProductSubscriptionRoute = require('./_internal/product_subscription.route').default; // personal-optional: guarded
  const PublishedRoute = require('./_internal/published.route').default; // personal-optional: guarded
  const PublishedFileDataRoute = require('./_internal/published_filedata.route').default; // personal-optional: guarded
  const ReviewRoute = require('./_internal/review.route').default; // personal-optional: guarded

  // Withheld too, because after this file existed their only importer became the
  // guarded require below. AI is out of scope for the self-hosted tier (founder,
  // 2026-08-28) and a box has no banner catalog, so neither route loses anything
  // a box was going to serve.
  const AIRoute = require('./client/ai.route').default; // personal-optional: guarded
  const MediaBannerRoute = require('./media_banner.route').default; // personal-optional: guarded
  /* eslint-enable @typescript-eslint/no-var-requires */

  return [
    new AdminRoute(),
    new AITaskRoute(),
    new AuthForProviders(),
    new ContactRoute(),
    new FollowingRoute(),
    new FriendRoute(),
    new InternalMiscRoute(),
    new ProductSubscriptionRoute(),
    new PublishedRoute(),
    new PublishedFileDataRoute(),
    new ReviewRoute(),
    new AIRoute(),
    new MediaBannerRoute(),
  ];
}
