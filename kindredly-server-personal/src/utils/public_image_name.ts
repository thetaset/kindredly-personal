/**
 * GET /image/get serves image storage to anyone, and image storage also holds the admin
 * settings files: ai-config.json (the admin AI prompts, policy prompt, pricing and plan
 * limits), category-sets-admin.json, banner-catalog.json, and their .bak copies. Those are
 * read through their own admin routes, never through the public image route.
 */
export function isServableImageName(filename: string): boolean {
  return typeof filename === 'string' && filename.length > 0 && !/\.json(\.|$)/i.test(filename);
}
