import type {RequestContext} from '@/base/request_context';

export type ReporterRole = 'restricted' | 'guardian' | 'admin';

/**
 * Who is reporting, decided from the session rather than the request body.
 *
 * A restricted user's report is evidence, not ground truth — they have an
 * obvious interest in a different answer — so downstream must be able to
 * weight it. Letting the client name its own role would defeat that.
 *
 * Shared by page reports (activity.service) and catalog reports
 * (curation_review.service), so both read a reporter the same way.
 */
export async function resolveReporterRole(ctx: RequestContext): Promise<ReporterRole> {
  try {
    if (await ctx.isAdmin()) return 'admin';
    const user = ctx.currentUserId ? await ctx.getUserById(ctx.currentUserId) : null;
    return (user as any)?.type === 'restricted' ? 'restricted' : 'guardian';
  } catch {
    // Unknown provenance is the least trustworthy case, not the most.
    return 'restricted';
  }
}
