#!/usr/bin/env node
/**
 * Simple API Route Type Checker
 * 
 * This script validates that API routes are consistently used across:
 * 1. Client BGRouter handlers (data parameter types)
 * 2. Server route handlers (ApiReq usage)
 * 3. UI layer (typedSendReq calls with correct paths)
 * 
 * Run: node tset-sharedlib/scripts/check-api-types.js
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
};

class ApiTypeChecker {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.errors = [];
    this.warnings = [];
    this.routes = new Set();
  }

  /**
   * Extract API routes from api-route-map.ts
   */
  extractApiRoutes() {
    const apiMapPath = path.join(
      this.projectRoot,
      'tset-sharedlib/src/api/api-route-map.ts'
    );

    if (!fs.existsSync(apiMapPath)) {
      console.error(`❌ Could not find api-route-map.ts at ${apiMapPath}`);
      return [];
    }

    const content = fs.readFileSync(apiMapPath, 'utf-8');
    
    // Extract route paths using regex
    // Matches: '/path/to/route': { request: ...; response: ... }
    const routePattern = /['"]([^'"]+)['"]\s*:\s*\{\s*request:/g;
    const routes = [];
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      routes.push(match[1]);
    }
    
    return routes;
  }

  /**
   * Check server route handlers for ApiReq usage
   */
  checkServerRoutes() {
    const serverRoutesDir = path.join(
      this.projectRoot,
      'tset-server/src/routes'
    );

    if (!fs.existsSync(serverRoutesDir)) {
      this.warnings.push({
        type: 'missing_directory',
        message: `Server routes directory not found: ${serverRoutesDir}`,
      });
      return;
    }

    const routeFiles = this.findFiles(serverRoutesDir, '.route.ts');

    for (const file of routeFiles) {
      this.checkServerRouteFile(file);
    }
  }

  checkServerRouteFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(this.projectRoot, filePath);

    // Find all ApiReq usages and extract the route path
    // Matches: ApiReq<'/path/to/route'>
    const apiReqPattern = /ApiReq<['"]([^'"]+)['"]>/g;
    let match;

    while ((match = apiReqPattern.exec(content)) !== null) {
      const route = match[1];
      this.routes.add(route);

      // Check if this route is defined in api-route-map
      if (!this.apiRoutes.includes(route)) {
        this.errors.push({
          type: 'undefined_route',
          route,
          file: relativePath,
          message: `Route '${route}' used in ${relativePath} but not defined in api-route-map.ts`,
        });
      }
    }

    // Check for untyped handlers (data: any or data: DynObj)
    const untypedPattern = /async\s*\([^)]*:\s*(any|DynObj)[^)]*\)\s*=>/g;
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (untypedPattern.test(line)) {
        this.warnings.push({
          type: 'untyped_handler',
          file: relativePath,
          line: index + 1,
          message: `Untyped handler at line ${index + 1} in ${relativePath}`,
        });
      }
    });
  }

  /**
   * Check client BGRouter handlers
   */
  checkClientRoutes() {
    const clientRoutesDir = path.join(
      this.projectRoot,
      'tset-client/src/bg/routes'
    );

    if (!fs.existsSync(clientRoutesDir)) {
      this.warnings.push({
        type: 'missing_directory',
        message: `Client routes directory not found: ${clientRoutesDir}`,
      });
      return;
    }

    const routeFiles = this.findFiles(clientRoutesDir, '.bgroute.ts');

    for (const file of routeFiles) {
      this.checkClientRouteFile(file);
    }
  }

  checkClientRouteFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(this.projectRoot, filePath);

    // Find route registrations: path: '/client/...'
    const pathPattern = /path:\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = pathPattern.exec(content)) !== null) {
      const route = match[1];
      this.routes.add(route);

      // Check if route is defined in api-route-map
      if (!this.apiRoutes.includes(route)) {
        this.errors.push({
          type: 'undefined_route',
          route,
          file: relativePath,
          message: `Route '${route}' registered in ${relativePath} but not defined in api-route-map.ts`,
        });
      }
    }

    // Check for untyped handlers
    const untypedPattern = /handler:\s*async\s*\([^:]+:\s*string,\s*data:\s*(DynObj|any)/g;
    if (untypedPattern.test(content)) {
      this.warnings.push({
        type: 'untyped_handler',
        file: relativePath,
        message: `Untyped handler(s) found in ${relativePath} (using DynObj or any)`,
      });
    }
  }

  /**
   * Check UI layer for typedSendReq calls
   */
  checkUILayer() {
    const uiDir = path.join(this.projectRoot, 'tset-client/src');

    if (!fs.existsSync(uiDir)) {
      return;
    }

    const files = this.findFiles(uiDir, '.ts', '.vue');

    for (const file of files) {
      // Skip node_modules and dist
      if (file.includes('node_modules') || file.includes('dist')) {
        continue;
      }

      this.checkUIFile(file);
    }
  }

  checkUIFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(this.projectRoot, filePath);

    // Find typedSendReq calls: typedSendReq('/path', ...)
    const sendReqPattern = /typedSendReq\s*\(\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = sendReqPattern.exec(content)) !== null) {
      const route = match[1];
      this.routes.add(route);

      if (!this.apiRoutes.includes(route)) {
        this.errors.push({
          type: 'undefined_route',
          route,
          file: relativePath,
          message: `Route '${route}' called in ${relativePath} but not defined in api-route-map.ts`,
        });
      }
    }
  }

  findFiles(dir, ...extensions) {
    const files = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (entry !== 'node_modules' && entry !== 'dist' && entry !== '.git') {
          files.push(...this.findFiles(fullPath, ...extensions));
        }
      } else {
        if (extensions.some(ext => entry.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  run() {
    console.log(`${colors.cyan}🔍 Checking API Type Safety...${colors.reset}\n`);

    // Extract routes from api-route-map
    this.apiRoutes = this.extractApiRoutes();
    console.log(`Found ${this.apiRoutes.length} routes in api-route-map.ts\n`);

    // Check all layers
    console.log('Checking server routes...');
    this.checkServerRoutes();

    console.log('Checking client routes...');
    this.checkClientRoutes();

    console.log('Checking UI layer...');
    this.checkUILayer();

    // Print summary
    this.printSummary();

    // Exit with error code if errors found
    return this.errors.length === 0 ? 0 : 1;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Routes in ApiRouteMap: ${this.apiRoutes.length}`);
    console.log(`Routes found in code: ${this.routes.size}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    console.log('='.repeat(60) + '\n');

    if (this.errors.length > 0) {
      console.log(`${colors.red}❌ ERRORS:${colors.reset}`);
      for (const error of this.errors) {
        console.log(`\n  ${colors.red}•${colors.reset} ${error.message}`);
        if (error.file) {
          console.log(`    File: ${error.file}`);
        }
        if (error.line) {
          console.log(`    Line: ${error.line}`);
        }
      }
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log(`${colors.yellow}⚠️  WARNINGS:${colors.reset}`);
      for (const warning of this.warnings) {
        console.log(`\n  ${colors.yellow}•${colors.reset} ${warning.message}`);
        if (warning.file) {
          console.log(`    File: ${warning.file}`);
        }
        if (warning.line) {
          console.log(`    Line: ${warning.line}`);
        }
      }
      console.log();
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`${colors.green}✅ All API routes are correctly typed!${colors.reset}\n`);
    }
  }
}

// Main execution
const projectRoot = path.resolve(__dirname, '../..');
const checker = new ApiTypeChecker(projectRoot);
const exitCode = checker.run();
process.exit(exitCode);
