# API Type Safety Tools

This directory contains tools for ensuring type safety across the API boundary.

## Quick Start

```bash
cd tset-sharedlib

# Generate route coverage report (recommended)
npm run route-report

# Quick type check
npm run check-api-types
```

## Files

### `generate-route-report.js` ⭐ (Primary Tool)

Generates a comprehensive markdown report showing route implementation status across all layers.

**What it checks:**
- Routes defined in `api-route-map.ts`
- Server implementations in `tset-server/src/routes/`
- BGRouter handlers in `tset-client/src/bg/routes/`
- UI usage (`typedSendReq`, `sendReq` calls)
- Type safety (ApiReq vs untyped handlers)

**Output:** `route-coverage-report.md` with:
- Summary statistics
- Missing implementations
- Untyped handlers
- Unused/orphaned routes
- Full route matrix table

**Usage:**
```bash
npm run route-report
```

### `api-route-layers.ts` (Configuration)

Defines which layers each route should be implemented in:
- `serverOnlyRoutes` - Routes that only need server handlers (admin, auth, etc.)
- `clientOnlyRoutes` - Routes handled entirely in BGRouter (local state)
- `deprecatedRoutes` - Routes that should be removed

**Edit this file** to categorize routes and reduce false positives in the report.

### `check-api-types.js`
Static analysis tool that validates API route types across:
- Server route handlers (`ApiReq<'/route'>` usage)
- Client route handlers (BGRouter route registrations)
- UI layer (`typedSendReq` calls)

**Usage:**
```bash
cd tset-sharedlib
npm run verify-types
```

### `validate-api-request.ts`
Runtime validation utilities for API requests. Provides:
- `validateApiRequest()` - Returns validation result
- `assertApiRequest()` - Throws on validation failure
- `validateApiRequestDev()` - Dev-only warnings

**Integration:**
```typescript
import { validateApiRequestDev } from 'tset-sharedlib/api/validate-api-request';

// In typedSendReq or bgRouter
validateApiRequestDev(route, data);
```

## Setup

1. Install dependencies:
```bash
cd tset-sharedlib
npm install --save-dev typescript @types/node tsx
```

2. Add script to package.json:
```json
{
  "scripts": {
    "verify-types": "tsx scripts/verify-api-types.ts"
  }
}
```

3. Run verification:
```bash
npm run verify-types
```

## CI Integration

Add to `.github/workflows/ci.yml`:
```yaml
- name: Verify API Type Safety
  run: |
    cd tset-sharedlib
    npm run verify-types
```

## Common Issues Caught

1. **Route not in ApiRouteMap**
   - Handler uses route that isn't defined
   - Fix: Add route to api-route-map.ts

2. **Untyped handlers**
   - Handler uses `data: DynObj` instead of specific type
   - Fix: Import and use specific request type

3. **Field name mismatches**
   - Handler reads `req.body.id` but API type has `userId`
   - Fix: Align field names between definition and usage

4. **Missing required fields**
   - API type defines required field but not checked in handler
   - Fix: Ensure all required fields are present

## Best Practices

1. **Always use ApiReq<'/route'> on server**
   ```typescript
   errorHelper(async (req: ApiReq<'/user/activity/push'>, res) => {
     const { monitorId } = req.body; // ✅ Typed!
   })
   ```

2. **Always use specific types in BGRouter**
   ```typescript
   handler: async (_path: string, data: UpdateActivityLogRequest, _options: DynObj) => {
     // ✅ data is properly typed
   }
   ```

3. **Run verification before commits**
   ```bash
   npm run verify-types
   ```

4. **Enable runtime validation in development**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     validateApiRequestDev(route, data);
   }
   ```
