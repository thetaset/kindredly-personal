#!/usr/bin/env node
/**
 * API Route Coverage Report Generator
 * 
 * Generates a comprehensive markdown report showing:
 * 1. Route implementation status across all layers
 * 2. Missing implementations based on expected layers
 * 3. Unused/orphaned routes (defined but never called from UI)
 * 4. Type safety status (typed vs untyped handlers)
 * 
 * Run: node tset-sharedlib/scripts/generate-route-report.js
 * Output: tset-sharedlib/scripts/route-coverage-report.md
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

class RouteReportGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.apiRoutes = [];
    this.serverRoutes = new Map(); // route -> { file, typed }
    this.bgRouterRoutes = new Map(); // route -> { file, typed }
    this.uiUsages = new Map(); // route -> [files]
    this.layerMetadata = { serverOnly: [], clientOnly: [], requiresBGRouter: [], deprecated: [] };
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Extract API routes from api-route-map.ts
   */
  extractApiRoutes() {
    const apiMapPath = path.join(this.projectRoot, 'tset-sharedlib/src/api/api-route-map.ts');
    if (!fs.existsSync(apiMapPath)) {
      console.error(`❌ Could not find api-route-map.ts at ${apiMapPath}`);
      return [];
    }

    const content = fs.readFileSync(apiMapPath, 'utf-8');
    const routePattern = /['"]([^'"]+)['"]\s*:\s*\{\s*request:/g;
    const routes = [];
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      routes.push(match[1]);
    }
    
    return routes;
  }

  /**
   * Extract layer metadata from api-route-layers.ts
   */
  extractLayerMetadata() {
    const layersPath = path.join(this.projectRoot, 'tset-sharedlib/src/api/api-route-layers.ts');
    if (!fs.existsSync(layersPath)) {
      console.log(`${colors.yellow}⚠️  api-route-layers.ts not found, assuming all routes need server only${colors.reset}`);
      return;
    }

    const content = fs.readFileSync(layersPath, 'utf-8');

    // Extract serverOnlyRoutes array
    const serverOnlyMatch = content.match(/serverOnlyRoutes[^=]*=\s*\[([\s\S]*?)\];/);
    if (serverOnlyMatch) {
      const routes = serverOnlyMatch[1].match(/'[^']+'/g) || [];
      this.layerMetadata.serverOnly = routes.map(r => r.replace(/'/g, ''));
    }

    // Extract clientOnlyRoutes array
    const clientOnlyMatch = content.match(/clientOnlyRoutes[^=]*=\s*\[([\s\S]*?)\];/);
    if (clientOnlyMatch) {
      const routes = clientOnlyMatch[1].match(/'[^']+'/g) || [];
      this.layerMetadata.clientOnly = routes.map(r => r.replace(/'/g, ''));
    }

    // Extract requiresBGRouterHandler array
    const requiresBGMatch = content.match(/requiresBGRouterHandler[^=]*=\s*\[([\s\S]*?)\];/);
    if (requiresBGMatch) {
      const routes = requiresBGMatch[1].match(/'[^']+'/g) || [];
      this.layerMetadata.requiresBGRouter = routes.map(r => r.replace(/'/g, ''));
    }

    // Extract deprecatedRoutes array
    const deprecatedMatch = content.match(/deprecatedRoutes[^=]*=\s*\[([\s\S]*?)\];/);
    if (deprecatedMatch) {
      const routes = deprecatedMatch[1].match(/'[^']+'/g) || [];
      this.layerMetadata.deprecated = routes.map(r => r.replace(/'/g, ''));
    }
  }

  /**
   * Get expected layers for a route
   * Most routes only need server - BGRouter is optional unless explicitly required
   */
  getExpectedLayers(route) {
    if (this.layerMetadata.serverOnly.includes(route)) {
      return ['server'];
    }
    if (this.layerMetadata.clientOnly.includes(route)) {
      return ['bgrouter'];
    }
    if (this.layerMetadata.deprecated.includes(route)) {
      return [];
    }
    // Default: server only (BGRouter optional via fallback)
    return ['server'];
  }

  /**
   * Check if a route requires an explicit BGRouter handler
   */
  requiresExplicitBGRouter(route) {
    return this.layerMetadata.clientOnly.includes(route) || 
           this.layerMetadata.requiresBGRouter.includes(route);
  }

  /**
   * Scan server routes
   */
  scanServerRoutes() {
    const serverRoutesDir = path.join(this.projectRoot, 'tset-server/src/routes');
    if (!fs.existsSync(serverRoutesDir)) {
      this.warnings.push('Server routes directory not found');
      return;
    }

    const routeFiles = this.findFiles(serverRoutesDir, '.route.ts');
    for (const file of routeFiles) {
      this.extractServerRoutes(file);
    }
  }

  extractServerRoutes(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(this.projectRoot, filePath);

    // Find ApiReq usages: ApiReq<'/path'>
    const apiReqPattern = /ApiReq<['"]([^'"]+)['"]>/g;
    let match;
    while ((match = apiReqPattern.exec(content)) !== null) {
      this.serverRoutes.set(match[1], { file: relativePath, typed: true });
    }

    // Find router.post/get/put/delete patterns with string paths
    const routerPattern = /this\.router\.(post|get|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = routerPattern.exec(content)) !== null) {
      const route = match[2];
      if (!this.serverRoutes.has(route)) {
        this.serverRoutes.set(route, { file: relativePath, typed: false });
      }
    }
  }

  /**
   * Scan BGRouter routes
   */
  scanBGRouterRoutes() {
    const bgRoutesDir = path.join(this.projectRoot, 'tset-client/src/bg/routes');
    if (!fs.existsSync(bgRoutesDir)) {
      this.warnings.push('BGRouter routes directory not found');
      return;
    }

    const routeFiles = this.findFiles(bgRoutesDir, '.bgroute.ts');
    for (const file of routeFiles) {
      this.extractBGRouterRoutes(file);
    }
  }

  extractBGRouterRoutes(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(this.projectRoot, filePath);

    // Find path: '/route' patterns
    const pathPattern = /path:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = pathPattern.exec(content)) !== null) {
      const route = match[1];
      
      // Check if typed (uses RouteRequest<K> or specific type from imports)
      // Look for nearby handler definition
      const handlerIndex = content.indexOf('handler:', match.index);
      const nextPathIndex = content.indexOf('path:', match.index + 1);
      const handlerEnd = nextPathIndex > -1 ? nextPathIndex : content.length;
      const handlerSection = content.slice(handlerIndex, handlerEnd);
      
      const isTyped = handlerSection.includes('RouteRequest<') || 
                      !handlerSection.includes(': DynObj') && 
                      !handlerSection.includes(': any');
      
      this.bgRouterRoutes.set(route, { file: relativePath, typed: isTyped });
    }
  }

  /**
   * Scan UI layer for route usages
   */
  scanUILayer() {
    const uiDir = path.join(this.projectRoot, 'tset-client/src');
    const files = this.findFiles(uiDir, '.ts', '.vue');

    for (const file of files) {
      if (file.includes('node_modules') || file.includes('dist')) continue;
      this.extractUIUsages(file);
    }
  }

  extractUIUsages(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(this.projectRoot, filePath);

    // Find typedSendReq and sendReq calls
    const patterns = [
      /typedSendReq\s*\(\s*['"]([^'"]+)['"]/g,
      /sendReq\s*\(\s*['"]([^'"]+)['"]/g,
      /typedRemoteRequest\s*\(\s*['"]([^'"]+)['"]/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const route = match[1];
        if (!this.uiUsages.has(route)) {
          this.uiUsages.set(route, []);
        }
        const files = this.uiUsages.get(route);
        if (!files.includes(relativePath)) {
          files.push(relativePath);
        }
      }
    }
  }

  findFiles(dir, ...extensions) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', '.git'].includes(entry)) {
          files.push(...this.findFiles(fullPath, ...extensions));
        }
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  /**
   * Generate the markdown report
   */
  generateReport() {
    const lines = [];
    const now = new Date().toISOString().split('T')[0];
    
    lines.push('# API Route Coverage Report');
    lines.push(`\nGenerated: ${now}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Routes in ApiRouteMap | ${this.apiRoutes.length} |`);
    lines.push(`| Routes in Server | ${this.serverRoutes.size} |`);
    lines.push(`| Routes in BGRouter (explicit) | ${this.bgRouterRoutes.size} |`);
    lines.push(`| Routes called from UI | ${this.uiUsages.size} |`);
    lines.push(`| Server-only routes | ${this.layerMetadata.serverOnly.length} |`);
    lines.push(`| Client-only routes | ${this.layerMetadata.clientOnly.length} |`);
    lines.push(`| Require BGRouter handler | ${this.layerMetadata.requiresBGRouter.length} |`);
    lines.push(`| Deprecated routes | ${this.layerMetadata.deprecated.length} |`);
    lines.push('');

    // Issues summary
    const issues = this.collectIssues();
    lines.push('## Issues Found');
    lines.push('');
    lines.push(`| Issue Type | Count |`);
    lines.push(`|------------|-------|`);
    lines.push(`| Missing server implementation | ${issues.missingServer.length} |`);
    lines.push(`| Missing required BGRouter handler | ${issues.missingBGRouter.length} |`);
    lines.push(`| Untyped server handlers | ${issues.untypedServer.length} |`);
    lines.push(`| Untyped BGRouter handlers | ${issues.untypedBGRouter.length} |`);
    lines.push(`| Unused routes (no UI calls) | ${issues.unusedRoutes.length} |`);
    lines.push(`| Undefined routes (in code but not map) | ${issues.undefinedRoutes.length} |`);
    lines.push('');

    // Missing implementations
    if (issues.missingServer.length > 0) {
      lines.push('### Missing Server Implementations');
      lines.push('');
      lines.push('Routes that should have server handlers but don\'t:');
      lines.push('');
      for (const route of issues.missingServer.slice(0, 50)) {
        lines.push(`- \`${route}\``);
      }
      if (issues.missingServer.length > 50) {
        lines.push(`- ... and ${issues.missingServer.length - 50} more`);
      }
      lines.push('');
    }

    if (issues.missingBGRouter.length > 0) {
      lines.push('### Missing Required BGRouter Handlers');
      lines.push('');
      lines.push('Routes that REQUIRE explicit BGRouter handlers but don\'t have them:');
      lines.push('');
      for (const route of issues.missingBGRouter.slice(0, 50)) {
        lines.push(`- \`${route}\``);
      }
      if (issues.missingBGRouter.length > 50) {
        lines.push(`- ... and ${issues.missingBGRouter.length - 50} more`);
      }
      lines.push('');
    }

    // Untyped handlers
    if (issues.untypedServer.length > 0 || issues.untypedBGRouter.length > 0) {
      lines.push('### Untyped Handlers');
      lines.push('');
      lines.push('These handlers don\'t use ApiReq<K> or RouteRequest<K>:');
      lines.push('');
      for (const { route, file } of issues.untypedServer.slice(0, 20)) {
        lines.push(`- Server: \`${route}\` in \`${file}\``);
      }
      for (const { route, file } of issues.untypedBGRouter.slice(0, 20)) {
        lines.push(`- BGRouter: \`${route}\` in \`${file}\``);
      }
      lines.push('');
    }

    // Unused routes
    if (issues.unusedRoutes.length > 0) {
      lines.push('### Unused Routes');
      lines.push('');
      lines.push('Routes defined in ApiRouteMap but never called from UI:');
      lines.push('');
      lines.push('<details>');
      lines.push('<summary>Click to expand (' + issues.unusedRoutes.length + ' routes)</summary>');
      lines.push('');
      for (const route of issues.unusedRoutes) {
        const inServer = this.serverRoutes.has(route) ? '✅' : '❌';
        const inBG = this.bgRouterRoutes.has(route) ? '✅' : '❌';
        lines.push(`- \`${route}\` (Server: ${inServer}, BG: ${inBG})`);
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    // Undefined routes
    if (issues.undefinedRoutes.length > 0) {
      lines.push('### Undefined Routes');
      lines.push('');
      lines.push('Routes used in code but not defined in ApiRouteMap:');
      lines.push('');
      for (const { route, location } of issues.undefinedRoutes) {
        lines.push(`- \`${route}\` in ${location}`);
      }
      lines.push('');
    }

    // Full route matrix
    lines.push('## Full Route Matrix');
    lines.push('');
    lines.push('Legend: ✅ = typed, ⚠️ = untyped, ❌ = missing (required), ➖ = not needed, 📦 = has handler (optional)');
    lines.push('');
    lines.push('| Route | Server | BGRouter | UI Calls | Status |');
    lines.push('|-------|--------|----------|----------|--------|');
    
    for (const route of this.apiRoutes.sort()) {
      const expected = this.getExpectedLayers(route);
      const requiresBG = this.requiresExplicitBGRouter(route);
      const inServer = this.serverRoutes.has(route);
      const inBGRouter = this.bgRouterRoutes.has(route);
      const uiCalls = this.uiUsages.get(route)?.length || 0;
      
      const serverStatus = inServer 
        ? (this.serverRoutes.get(route).typed ? '✅' : '⚠️') 
        : (expected.includes('server') ? '❌' : '➖');
      
      // BGRouter: show 📦 if has handler but not required, ✅/⚠️ if required and present, ❌ if required and missing
      let bgStatus;
      if (inBGRouter) {
        bgStatus = this.bgRouterRoutes.get(route).typed ? '✅' : '⚠️';
        if (!requiresBG) bgStatus = '📦'; // Optional but present
      } else {
        bgStatus = requiresBG ? '❌' : '➖';
      }
      
      // Determine overall status
      let status = '✅';
      if (expected.includes('server') && !inServer) status = '❌';
      else if (requiresBG && !inBGRouter) status = '❌';
      else if (inServer && !this.serverRoutes.get(route).typed) status = '⚠️';
      else if (inBGRouter && !this.bgRouterRoutes.get(route).typed) status = '⚠️';
      
      lines.push(`| \`${route}\` | ${serverStatus} | ${bgStatus} | ${uiCalls} | ${status} |`);
    }
    lines.push('');

    return lines.join('\n');
  }

  collectIssues() {
    const issues = {
      missingServer: [],
      missingBGRouter: [], // Only for routes that REQUIRE explicit handler
      untypedServer: [],
      untypedBGRouter: [],
      unusedRoutes: [],
      undefinedRoutes: [],
    };

    for (const route of this.apiRoutes) {
      const expected = this.getExpectedLayers(route);
      
      // Missing server implementations
      if (expected.includes('server') && !this.serverRoutes.has(route)) {
        issues.missingServer.push(route);
      }
      
      // Missing BGRouter - ONLY for routes that require explicit handlers
      if (this.requiresExplicitBGRouter(route) && !this.bgRouterRoutes.has(route)) {
        issues.missingBGRouter.push(route);
      }
      
      // Untyped handlers
      if (this.serverRoutes.has(route) && !this.serverRoutes.get(route).typed) {
        issues.untypedServer.push({ route, file: this.serverRoutes.get(route).file });
      }
      if (this.bgRouterRoutes.has(route) && !this.bgRouterRoutes.get(route).typed) {
        issues.untypedBGRouter.push({ route, file: this.bgRouterRoutes.get(route).file });
      }
      
      // Unused routes
      if (!this.uiUsages.has(route) && !this.layerMetadata.deprecated.includes(route)) {
        issues.unusedRoutes.push(route);
      }
    }

    // Routes used but not defined
    for (const [route, info] of this.serverRoutes) {
      if (!this.apiRoutes.includes(route)) {
        issues.undefinedRoutes.push({ route, location: `server: ${info.file}` });
      }
    }
    for (const [route, info] of this.bgRouterRoutes) {
      if (!this.apiRoutes.includes(route)) {
        issues.undefinedRoutes.push({ route, location: `bgrouter: ${info.file}` });
      }
    }
    for (const [route, files] of this.uiUsages) {
      if (!this.apiRoutes.includes(route)) {
        issues.undefinedRoutes.push({ route, location: `ui: ${files[0]}` });
      }
    }

    return issues;
  }

  run() {
    console.log(`${colors.cyan}🔍 Generating API Route Coverage Report...${colors.reset}\n`);

    // Extract data
    console.log('Extracting routes from api-route-map.ts...');
    this.apiRoutes = this.extractApiRoutes();
    console.log(`  Found ${this.apiRoutes.length} routes`);

    console.log('Extracting layer metadata...');
    this.extractLayerMetadata();
    console.log(`  Server-only: ${this.layerMetadata.serverOnly.length}`);
    console.log(`  Client-only: ${this.layerMetadata.clientOnly.length}`);
    console.log(`  Deprecated: ${this.layerMetadata.deprecated.length}`);

    console.log('Scanning server routes...');
    this.scanServerRoutes();
    console.log(`  Found ${this.serverRoutes.size} server routes`);

    console.log('Scanning BGRouter routes...');
    this.scanBGRouterRoutes();
    console.log(`  Found ${this.bgRouterRoutes.size} BGRouter routes`);

    console.log('Scanning UI layer...');
    this.scanUILayer();
    console.log(`  Found ${this.uiUsages.size} routes called from UI`);

    // Generate report
    console.log('\nGenerating report...');
    const report = this.generateReport();

    // Write report
    const reportPath = path.join(this.projectRoot, 'tset-sharedlib/scripts/route-coverage-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n${colors.green}✅ Report written to: ${reportPath}${colors.reset}`);

    // Print summary
    const issues = this.collectIssues();
    const totalIssues = issues.missingServer.length + issues.missingBGRouter.length + 
                        issues.untypedServer.length + issues.untypedBGRouter.length +
                        issues.undefinedRoutes.length;

    if (totalIssues > 0) {
      console.log(`\n${colors.yellow}⚠️  Found ${totalIssues} issues that need attention${colors.reset}`);
      console.log(`   Missing server: ${issues.missingServer.length}`);
      console.log(`   Missing BGRouter: ${issues.missingBGRouter.length}`);
      console.log(`   Untyped handlers: ${issues.untypedServer.length + issues.untypedBGRouter.length}`);
      console.log(`   Undefined routes: ${issues.undefinedRoutes.length}`);
      console.log(`   Unused routes: ${issues.unusedRoutes.length}`);
    } else {
      console.log(`\n${colors.green}✅ All routes are properly implemented!${colors.reset}`);
    }

    return totalIssues === 0 ? 0 : 1;
  }
}

// Main execution
const projectRoot = path.resolve(__dirname, '../..');
const generator = new RouteReportGenerator(projectRoot);
const exitCode = generator.run();
process.exit(exitCode);
