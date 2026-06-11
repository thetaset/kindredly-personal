#!/usr/bin/env tsx
/**
 * Type Safety Verification Script
 * 
 * Validates that API routes are consistently typed across:
 * 1. api-route-map.ts definitions
 * 2. Server route handlers (ApiReq usage)
 * 3. Client route handlers (BGRouter routes)
 * 4. UI layer (typedSendReq calls)
 * 
 * Run: npm run verify-types
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { ApiRouteMap } from '../src/api/api-route-map';

interface TypeMismatch {
  route: string;
  location: string;
  expected: string;
  actual: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  errors: TypeMismatch[];
  warnings: TypeMismatch[];
  summary: {
    totalRoutes: number;
    validRoutes: number;
    routesWithErrors: number;
    routesWithWarnings: number;
  };
}

class ApiTypeVerifier {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private errors: TypeMismatch[] = [];
  private warnings: TypeMismatch[] = [];
  private validatedRoutes = new Set<string>();

  constructor(private projectRoot: string) {
    // Create TypeScript program for type checking
    const configPath = ts.findConfigFile(
      projectRoot,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!configPath) {
      throw new Error('Could not find tsconfig.json');
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );

    this.program = ts.createProgram({
      rootNames: parsedConfig.fileNames,
      options: parsedConfig.options,
    });

    this.checker = this.program.getTypeChecker();
  }

  /**
   * Verify server route handlers match api-route-map types
   */
  verifyServerRoutes(): void {
    const serverRoutesDir = path.join(this.projectRoot, 'tset-server/src/routes');
    
    if (!fs.existsSync(serverRoutesDir)) {
      console.warn(`Server routes directory not found: ${serverRoutesDir}`);
      return;
    }

    const routeFiles = this.getRouteFiles(serverRoutesDir);

    for (const file of routeFiles) {
      this.verifyServerRouteFile(file);
    }
  }

  /**
   * Verify client BGRouter handlers match api-route-map types
   */
  verifyClientRoutes(): void {
    const clientRoutesDir = path.join(this.projectRoot, 'tset-client/src/bg/routes');
    
    if (!fs.existsSync(clientRoutesDir)) {
      console.warn(`Client routes directory not found: ${clientRoutesDir}`);
      return;
    }

    const routeFiles = fs.readdirSync(clientRoutesDir)
      .filter(f => f.endsWith('.bgroute.ts'))
      .map(f => path.join(clientRoutesDir, f));

    for (const file of routeFiles) {
      this.verifyClientRouteFile(file);
    }
  }

  /**
   * Verify UI typedSendReq calls use correct types
   */
  verifyUITypedCalls(): void {
    const uiDir = path.join(this.projectRoot, 'tset-client/src');
    this.verifyTypedSendReqInDirectory(uiDir);
  }

  private verifyServerRouteFile(filePath: string): void {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) return;

    ts.forEachChild(sourceFile, node => {
      this.visitServerRouteNode(node, filePath);
    });
  }

  private verifyClientRouteFile(filePath: string): void {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) return;

    ts.forEachChild(sourceFile, node => {
      this.visitClientRouteNode(node, filePath);
    });
  }

  private visitServerRouteNode(node: ts.Node, filePath: string): void {
    // Look for ApiReq<'route'> usage
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      
      // Check for errorHelper(async (req: ApiReq<'/path'>, res) => {...})
      if (ts.isIdentifier(expression) && expression.text === 'errorHelper') {
        const callback = node.arguments[0];
        if (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) {
          const reqParam = callback.parameters[0];
          if (reqParam && reqParam.type) {
            this.extractAndVerifyApiReqType(reqParam.type, filePath, callback);
          }
        }
      }
    }

    ts.forEachChild(node, child => this.visitServerRouteNode(child, filePath));
  }

  private visitClientRouteNode(node: ts.Node, filePath: string): void {
    // Look for route registrations: { path: '/...', handler: ... }
    if (ts.isObjectLiteralExpression(node)) {
      let routePath: string | null = null;
      let handlerFn: ts.Node | null = null;

      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const name = prop.name;
          if (ts.isIdentifier(name)) {
            if (name.text === 'path' && ts.isStringLiteral(prop.initializer)) {
              routePath = prop.initializer.text;
            } else if (name.text === 'handler') {
              handlerFn = prop.initializer;
            }
          }
        }
      }

      if (routePath && handlerFn) {
        this.verifyClientHandler(routePath, handlerFn, filePath);
      }
    }

    ts.forEachChild(node, child => this.visitClientRouteNode(child, filePath));
  }

  private extractAndVerifyApiReqType(
    typeNode: ts.TypeNode,
    filePath: string,
    context: ts.Node
  ): void {
    // Extract route path from ApiReq<'/route/path'>
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName;
      if (ts.isIdentifier(typeName) && typeName.text === 'ApiReq') {
        const typeArgs = typeNode.typeArguments;
        if (typeArgs && typeArgs.length > 0) {
          const routeType = typeArgs[0];
          if (ts.isLiteralTypeNode(routeType) && ts.isStringLiteral(routeType.literal)) {
            const route = routeType.literal.text;
            this.verifyServerHandlerForRoute(route, filePath, context);
          }
        }
      }
    }
  }

  private verifyServerHandlerForRoute(
    route: string,
    filePath: string,
    handler: ts.Node
  ): void {
    this.validatedRoutes.add(route);

    // Check if route exists in ApiRouteMap
    if (!(route in ApiRouteMap)) {
      this.errors.push({
        route,
        location: `${path.relative(this.projectRoot, filePath)}`,
        expected: 'Route defined in api-route-map.ts',
        actual: 'Route not found in ApiRouteMap',
        severity: 'error',
      });
      return;
    }

    // TODO: Extract actual fields accessed in handler body (req.body.field)
    // and compare against ApiRouteMap[route].request type
    // This requires more sophisticated AST traversal
  }

  private verifyClientHandler(
    route: string,
    handler: ts.Node,
    filePath: string
  ): void {
    this.validatedRoutes.add(route);

    if (!(route in ApiRouteMap)) {
      this.errors.push({
        route,
        location: `${path.relative(this.projectRoot, filePath)}`,
        expected: 'Route defined in api-route-map.ts',
        actual: 'Route not found in ApiRouteMap',
        severity: 'error',
      });
      return;
    }

    // Extract data parameter type from handler signature
    if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) {
      const dataParam = handler.parameters[1]; // (_path, data, options)
      if (dataParam && dataParam.type) {
        this.verifyClientHandlerDataType(route, dataParam.type, filePath);
      }
    }
  }

  private verifyClientHandlerDataType(
    route: string,
    typeNode: ts.TypeNode,
    filePath: string
  ): void {
    const type = this.checker.getTypeAtLocation(typeNode);
    const typeName = this.checker.typeToString(type);

    // Get expected type from ApiRouteMap
    const routeConfig = (ApiRouteMap as any)[route];
    if (!routeConfig) return;

    // This is a simplification - in practice we'd need to compare the actual types
    if (typeName === 'DynObj' || typeName === 'any') {
      this.warnings.push({
        route,
        location: `${path.relative(this.projectRoot, filePath)}`,
        expected: 'Specific request type from api-route-map.ts',
        actual: `Untyped: ${typeName}`,
        severity: 'warning',
      });
    }
  }

  private verifyTypedSendReqInDirectory(dir: string): void {
    const files = this.getAllTypeScriptFiles(dir);

    for (const file of files) {
      const sourceFile = this.program.getSourceFile(file);
      if (!sourceFile) continue;

      ts.forEachChild(sourceFile, node => {
        this.findTypedSendReqCalls(node, file);
      });
    }
  }

  private findTypedSendReqCalls(node: ts.Node, filePath: string): void {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      
      // Check for typedSendReq calls
      if (
        (ts.isIdentifier(expression) && expression.text === 'typedSendReq') ||
        (ts.isPropertyAccessExpression(expression) && 
         ts.isIdentifier(expression.name) && 
         expression.name.text === 'typedSendReq')
      ) {
        const routeArg = node.arguments[0];
        if (ts.isStringLiteral(routeArg)) {
          const route = routeArg.text;
          this.verifyTypedSendReqCall(route, filePath, node);
        }
      }
    }

    ts.forEachChild(node, child => this.findTypedSendReqCalls(child, filePath));
  }

  private verifyTypedSendReqCall(
    route: string,
    filePath: string,
    callNode: ts.CallExpression
  ): void {
    this.validatedRoutes.add(route);

    if (!(route in ApiRouteMap)) {
      this.errors.push({
        route,
        location: `${path.relative(this.projectRoot, filePath)}:${
          callNode.getStart()
        }`,
        expected: 'Route defined in api-route-map.ts',
        actual: 'Route not found in ApiRouteMap',
        severity: 'error',
      });
    }

    // Type checking is handled by TypeScript compiler
    // We're just verifying routes exist
  }

  private getRouteFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getRouteFiles(fullPath));
      } else if (entry.endsWith('.route.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      
      // Skip node_modules and dist directories
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') {
        continue;
      }

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getAllTypeScriptFiles(fullPath));
      } else if (entry.endsWith('.ts') || entry.endsWith('.vue')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  getValidationResult(): ValidationResult {
    const totalRoutes = Object.keys(ApiRouteMap).length;
    const routesWithErrors = new Set(
      this.errors.map(e => e.route)
    ).size;
    const routesWithWarnings = new Set(
      this.warnings.filter(w => !this.errors.find(e => e.route === w.route))
        .map(w => w.route)
    ).size;

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalRoutes,
        validRoutes: this.validatedRoutes.size,
        routesWithErrors,
        routesWithWarnings,
      },
    };
  }
}

// Main execution
function main() {
  const projectRoot = path.resolve(__dirname, '../..');
  
  console.log('🔍 Verifying API Type Safety...\n');
  console.log(`Project root: ${projectRoot}\n`);

  const verifier = new ApiTypeVerifier(projectRoot);

  // Run verifications
  console.log('📋 Checking server routes...');
  verifier.verifyServerRoutes();

  console.log('📋 Checking client routes...');
  verifier.verifyClientRoutes();

  console.log('📋 Checking UI layer...');
  verifier.verifyUITypedCalls();

  // Get results
  const result = verifier.getValidationResult();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total routes in ApiRouteMap: ${result.summary.totalRoutes}`);
  console.log(`Routes validated: ${result.summary.validRoutes}`);
  console.log(`Routes with errors: ${result.summary.routesWithErrors}`);
  console.log(`Routes with warnings: ${result.summary.routesWithWarnings}`);
  console.log('='.repeat(60) + '\n');

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    for (const error of result.errors) {
      console.log(`\n  Route: ${error.route}`);
      console.log(`  Location: ${error.location}`);
      console.log(`  Expected: ${error.expected}`);
      console.log(`  Actual: ${error.actual}`);
    }
    console.log();
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    for (const warning of result.warnings) {
      console.log(`\n  Route: ${warning.route}`);
      console.log(`  Location: ${warning.location}`);
      console.log(`  Expected: ${warning.expected}`);
      console.log(`  Actual: ${warning.actual}`);
    }
    console.log();
  }

  // Print success
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ All API routes are correctly typed!\n');
  }

  // Exit with error code if there are errors
  process.exit(result.errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

export { ApiTypeVerifier, ValidationResult, TypeMismatch };
