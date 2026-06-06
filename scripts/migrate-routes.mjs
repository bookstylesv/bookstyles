/**
 * migrate-routes.mjs — Migrate API routes from getCurrentUser() to withTenantAuth()
 *
 * Run: node scripts/migrate-routes.mjs
 *
 * This handles TWO patterns:
 * 1. Standard: uses apiError/ok/created + UnauthorizedError try/catch
 * 2. NextResponse: uses NextResponse.json directly for auth checks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'src', 'app', 'api');

// Module mapping based on API path
const MODULE_MAP = {
  'appointments': 'citas',
  'barbers': 'citas',
  'billing': 'facturacion',
  'branches': 'branches',
  'cargos': 'planilla',
  'clients': 'clients',
  'compras': 'compras',
  'cxp': 'cxp',
  'gastos': 'gastos',
  'loyalty': 'loyalty',
  'metas': 'metas',
  'notifications': 'citas',
  'planilla': 'planilla',
  'pos': 'pos',
  'productos': 'inventario',
  'proveedores': 'compras',
  'services': 'citas',
  'settings': 'settings',
  'unidades': 'inventario',
  'usuarios': 'usuarios',
};

// Files to skip (already migrated or special)
const SKIP_FILES = new Set([
  'src/app/api/clients/route.ts',
  'src/app/api/inventario/stock/route.ts',
  'src/app/api/inventario/transferencias/route.ts',
]);

// Files that are too complex for automated migration (need manual review)
const MANUAL_FILES = new Set([
  'src/app/api/auth/switch-branch/route.ts', // Complex cookie handling
]);

function findRouteFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findRouteFiles(full, files);
    } else if (entry.name === 'route.ts') {
      files.push(full);
    }
  }
  return files;
}

function getModuleForPath(filePath) {
  const rel = path.relative(API_DIR, filePath).replace(/\\/g, '/');
  const firstSegment = rel.split('/')[0];
  return MODULE_MAP[firstSegment] || null;
}

function getRelPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

/**
 * Check if file uses the standard apiError pattern vs NextResponse pattern
 */
function usesStandardPattern(content) {
  return content.includes('apiError') && content.includes('UnauthorizedError');
}

/**
 * Check if file uses NextResponse.json for auth (planilla-style)
 */
function usesNextResponsePattern(content) {
  return content.includes('NextResponse.json') && content.includes('getCurrentUser');
}

/**
 * Migrate a standard-pattern file (apiError + UnauthorizedError)
 */
function migrateStandardFile(content, moduleName) {
  let result = content;

  // Remove getCurrentUser import
  result = result.replace(/import\s*\{[^}]*getCurrentUser[^}]*\}\s*from\s*['"]@\/lib\/auth['"];?\n?/g, (match) => {
    // Check if there are other imports from auth
    const otherImports = match.match(/\{([^}]*)\}/)?.[1]
      ?.split(',')
      .map(s => s.trim())
      .filter(s => s && s !== 'getCurrentUser');
    if (otherImports && otherImports.length > 0) {
      return `import { ${otherImports.join(', ')} } from '@/lib/auth';\n`;
    }
    return '';
  });

  // Remove UnauthorizedError import (and ForbiddenError if not used elsewhere after migration)
  result = result.replace(/import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/errors['"];?\n?/g, (match, imports) => {
    const importList = imports.split(',').map(s => s.trim()).filter(Boolean);
    const keep = importList.filter(i => {
      if (i === 'UnauthorizedError') return false;
      if (i === 'ForbiddenError') return false; // withTenantAuth handles role checks via ctx.user.role
      return true;
    });
    if (keep.length === 0) return '';
    return `import { ${keep.join(', ')} } from '@/lib/errors';\n`;
  });

  // Remove apiError from response imports
  result = result.replace(/import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/response['"];?\n?/g, (match, imports) => {
    const importList = imports.split(',').map(s => s.trim()).filter(Boolean);
    const keep = importList.filter(i => i !== 'apiError');
    if (keep.length === 0) return '';
    return `import { ${keep.join(', ')} } from '@/lib/response';\n`;
  });

  // Add withTenantAuth import
  if (!result.includes('withTenantAuth')) {
    // Add after last import
    const lastImportIdx = result.lastIndexOf('\nimport ');
    if (lastImportIdx !== -1) {
      const lineEnd = result.indexOf('\n', lastImportIdx + 1);
      result = result.slice(0, lineEnd + 1) +
        `import { withTenantAuth } from '@/lib/with-tenant-auth';\n` +
        result.slice(lineEnd + 1);
    }
  }

  // Ensure NextRequest import
  if (!result.includes('NextRequest')) {
    if (result.includes("from 'next/server'")) {
      result = result.replace(/import\s*\{([^}]*)\}\s*from\s*['"]next\/server['"]/, (match, imports) => {
        return `import { NextRequest, ${imports.trim()} } from 'next/server'`;
      });
    } else {
      result = `import { NextRequest } from 'next/server';\n` + result;
    }
  }

  // Remove type Params/Ctx declarations — we'll use routeCtx pattern
  result = result.replace(/\ntype\s+(Params|Ctx)\s*=\s*\{[^}]+\};\n/g, '\n');

  // Transform exported functions
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  for (const method of methods) {
    // Pattern: export async function METHOD(req, { params }) with try/catch
    const funcPattern = new RegExp(
      `export\\s+async\\s+function\\s+${method}\\s*\\(([^)]*)\\)\\s*\\{\\s*\\n\\s*try\\s*\\{\\s*\\n\\s*const\\s+user\\s*=\\s*await\\s+getCurrentUser\\(\\)\\s*;?\\s*\\n\\s*if\\s*\\(\\s*!user\\s*\\)\\s*throw\\s+new\\s+UnauthorizedError\\(\\)\\s*;?\\s*\\n([\\s\\S]*?)\\n\\s*\\}\\s*catch\\s*\\([^)]*\\)\\s*\\{\\s*\\n[^}]*apiError[^}]*\\}\\s*\\n\\s*\\}`,
      'g'
    );

    result = result.replace(funcPattern, (match, params, body) => {
      const hasParams = params.includes('params');
      const usesReq = body.includes('req.') || body.includes('req ');

      // Clean up body: replace user.tenantId -> ctx.tenantId, user.branchId -> ctx.branchId, user.xxx -> ctx.user.xxx
      let cleanBody = body
        .replace(/user\.tenantId/g, 'ctx.tenantId')
        .replace(/user\.branchId/g, 'ctx.branchId')
        .replace(/user\.role/g, 'ctx.user.role')
        .replace(/user\.sub/g, 'ctx.user.sub')
        .replace(/user\.name/g, 'ctx.user.name');

      // Remove role check lines (ForbiddenError throws) — these become unnecessary or can stay as-is
      // Keep them if they have specific messages or specific role logic
      cleanBody = cleanBody.replace(/\s*if\s*\(\s*!?\[['"]OWNER['"],\s*['"]SUPERADMIN['"],\s*['"]GERENTE['"],\s*['"]USERS['"]\]\.includes\(ctx\.user\.role\)\s*\)\s*throw\s+new\s+ForbiddenError\([^)]*\)\s*;?\s*\n/g, '\n');
      cleanBody = cleanBody.replace(/\s*if\s*\(ctx\.user\.role\s*===\s*['"]OWNER['"]\s*\)\s*throw\s+new\s+ForbiddenError\([^)]*\)\s*;?\s*\n/g, '\n');

      // Replace params access
      if (hasParams) {
        cleanBody = cleanBody.replace(/const\s*\{\s*id\s*\}\s*=\s*await\s+params\s*;?/g, 'const { id } = await routeCtx.params;');
        cleanBody = cleanBody.replace(/const\s*\{\s*codigo\s*\}\s*=\s*await\s+params\s*;?/g, 'const { codigo } = await routeCtx.params;');
      }

      const reqParam = usesReq ? 'req: NextRequest' : '_req: NextRequest';
      const paramsParam = hasParams ? ', ctx, routeCtx' : ', ctx';
      const moduleOpt = moduleName ? `, { requiredModule: '${moduleName}' }` : '';

      return `export const ${method} = withTenantAuth(async (${reqParam}${paramsParam}) => {${cleanBody}\n}${moduleOpt})`;
    });
  }

  // Clean up consecutive blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

/**
 * Migrate a NextResponse-pattern file (planilla/pos style)
 * These are trickier — they use NextResponse.json directly
 */
function migrateNextResponseFile(content, moduleName) {
  let result = content;

  // Remove getCurrentUser import
  result = result.replace(/import\s*\{[^}]*getCurrentUser[^}]*\}\s*from\s*['"]@\/lib\/auth['"];?\n?/g, (match) => {
    const otherImports = match.match(/\{([^}]*)\}/)?.[1]
      ?.split(',')
      .map(s => s.trim())
      .filter(s => s && s !== 'getCurrentUser');
    if (otherImports && otherImports.length > 0) {
      return `import { ${otherImports.join(', ')} } from '@/lib/auth';\n`;
    }
    return '';
  });

  // Add withTenantAuth import
  if (!result.includes('withTenantAuth')) {
    const lastImportIdx = result.lastIndexOf('\nimport ');
    if (lastImportIdx !== -1) {
      const lineEnd = result.indexOf('\n', lastImportIdx + 1);
      result = result.slice(0, lineEnd + 1) +
        `import { withTenantAuth } from '@/lib/with-tenant-auth';\n` +
        result.slice(lineEnd + 1);
    }
  }

  // Ensure NextRequest import
  if (!result.includes('NextRequest')) {
    if (result.includes("from 'next/server'")) {
      result = result.replace(/import\s*\{([^}]*)\}\s*from\s*['"]next\/server['"]/, (match, imports) => {
        if (!imports.includes('NextRequest')) {
          return `import { NextRequest, ${imports.trim()} } from 'next/server'`;
        }
        return match;
      });
    } else {
      result = `import { NextRequest } from 'next/server';\n` + result;
    }
  }

  // Transform each exported function
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  for (const method of methods) {
    // Find the function — various patterns
    // Pattern 1: export async function METHOD(params?) { user auth check... body }
    // This is complex so we do a targeted replacement

    // Match function start
    const funcStartRegex = new RegExp(
      `export\\s+async\\s+function\\s+${method}\\s*\\(([^)]*)\\)\\s*\\{`
    );
    const startMatch = result.match(funcStartRegex);
    if (!startMatch) continue;

    const funcStartIdx = result.indexOf(startMatch[0]);
    const params = startMatch[1];

    // Find matching closing brace
    let braceCount = 0;
    let funcEndIdx = -1;
    for (let i = funcStartIdx + startMatch[0].length - 1; i < result.length; i++) {
      if (result[i] === '{') braceCount++;
      if (result[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          funcEndIdx = i;
          break;
        }
      }
    }
    if (funcEndIdx === -1) continue;

    let funcBody = result.slice(funcStartIdx + startMatch[0].length, funcEndIdx);

    // Remove auth check patterns:
    // Pattern A: const user = await getCurrentUser(); if (!user) return NextResponse.json(...)
    funcBody = funcBody.replace(
      /\s*const\s+user\s*=\s*await\s+getCurrentUser\(\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)\s*return\s+NextResponse\.json\([^)]+\)\s*;?\s*\n?/g,
      '\n'
    );
    // Pattern B: const user = await getCurrentUser(); if (!user || ...) return NextResponse.json(...)
    funcBody = funcBody.replace(
      /\s*const\s+user\s*=\s*await\s+getCurrentUser\(\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\|\|\s*![^)]+\)\s*return\s+NextResponse\.json\([^)]+\)\s*;?\s*\n?/g,
      '\n'
    );
    // Pattern C: just getCurrentUser() with combined check on same line
    funcBody = funcBody.replace(
      /\s*const\s+user\s*=\s*await\s+getCurrentUser\(\)\s*;?\s*\n/g,
      '\n'
    );
    // Remove leftover auth check if it was on separate line
    funcBody = funcBody.replace(
      /\s*if\s*\(\s*!user\s*\)\s*return\s+NextResponse\.json\(\s*\{\s*error:\s*['"][^'"]+['"]\s*\}\s*,\s*\{\s*status:\s*401\s*\}\s*\)\s*;?\s*\n?/g,
      '\n'
    );

    // Replace user.tenantId -> ctx.tenantId, user.sub -> ctx.user.sub, etc.
    funcBody = funcBody
      .replace(/user\.tenantId/g, 'ctx.tenantId')
      .replace(/user\.branchId/g, 'ctx.branchId')
      .replace(/user\.role/g, 'ctx.user.role')
      .replace(/user\.sub/g, 'ctx.user.sub')
      .replace(/user\.name/g, 'ctx.user.name');

    // Determine params
    const hasParams = params.includes('params');
    const hasReq = params.includes('req') && !params.startsWith('_');

    // Replace params access
    if (hasParams) {
      funcBody = funcBody.replace(/const\s*\{\s*id\s*\}\s*=\s*await\s+params\s*;?/g, 'const { id } = await routeCtx.params;');
      funcBody = funcBody.replace(/const\s*\{\s*codigo\s*\}\s*=\s*await\s+params\s*;?/g, 'const { codigo } = await routeCtx.params;');
    }

    const reqParam = (hasReq || funcBody.includes('req.')) ? 'req: NextRequest' : '_req: NextRequest';
    const ctxParam = hasParams ? ', ctx, routeCtx' : ', ctx';
    const moduleOpt = moduleName ? `, { requiredModule: '${moduleName}' }` : '';

    // Check if there's a try/catch wrapper
    const hasTryCatch = funcBody.trim().startsWith('try');

    let newFunc;
    if (hasTryCatch) {
      // Keep the try/catch but wrap in withTenantAuth
      newFunc = `export const ${method} = withTenantAuth(async (${reqParam}${ctxParam}) => {${funcBody}}${moduleOpt})`;
    } else {
      newFunc = `export const ${method} = withTenantAuth(async (${reqParam}${ctxParam}) => {${funcBody}}${moduleOpt})`;
    }

    result = result.slice(0, funcStartIdx) + newFunc + result.slice(funcEndIdx + 1);
  }

  // Clean up consecutive blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

// Main
const allRoutes = findRouteFiles(API_DIR);
let migrated = 0;
let skipped = 0;
let manual = 0;
let errors = [];

for (const filePath of allRoutes) {
  const relPath = getRelPath(filePath);

  if (SKIP_FILES.has(relPath)) {
    console.log(`SKIP (already migrated): ${relPath}`);
    skipped++;
    continue;
  }

  if (MANUAL_FILES.has(relPath)) {
    console.log(`MANUAL (too complex): ${relPath}`);
    manual++;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Skip if already migrated
  if (content.includes('withTenantAuth')) {
    console.log(`SKIP (already has withTenantAuth): ${relPath}`);
    skipped++;
    continue;
  }

  // Skip if doesn't use getCurrentUser
  if (!content.includes('getCurrentUser')) {
    console.log(`SKIP (no getCurrentUser): ${relPath}`);
    skipped++;
    continue;
  }

  const moduleName = getModuleForPath(filePath);

  try {
    let result;
    if (usesStandardPattern(content)) {
      result = migrateStandardFile(content, moduleName);
    } else if (usesNextResponsePattern(content)) {
      result = migrateNextResponseFile(content, moduleName);
    } else {
      console.log(`WARN (unknown pattern): ${relPath}`);
      errors.push(relPath);
      continue;
    }

    // Verify the migration removed getCurrentUser
    if (result.includes('getCurrentUser')) {
      console.log(`WARN (getCurrentUser still present after migration): ${relPath}`);
      errors.push(relPath);
      continue;
    }

    fs.writeFileSync(filePath, result, 'utf8');
    console.log(`MIGRATED: ${relPath} (module: ${moduleName})`);
    migrated++;
  } catch (e) {
    console.log(`ERROR: ${relPath} — ${e.message}`);
    errors.push(relPath);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Migrated: ${migrated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Manual: ${manual}`);
console.log(`Errors: ${errors.length}`);
if (errors.length > 0) {
  console.log('Files needing manual migration:');
  errors.forEach(f => console.log(`  - ${f}`));
}
