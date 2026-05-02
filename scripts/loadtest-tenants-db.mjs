import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
const MANIFEST_DIR = path.join(ROOT, "tmp", "loadtest-tenants");

function loadDotenv(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadDotenv(path.join(ROOT, ".env.local"));
loadDotenv(path.join(ROOT, ".env"));

const args = process.argv.slice(2);
const command = args[0] || "help";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Falta DATABASE_URL en .env.local o .env");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const found = args.find(item => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function runId() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");
  return `loadtest-${stamp}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const BARBER_NAMES = [
  "Urban Fade Studio", "Navaja Real", "Corte Noble", "Distrito Barber", "La Silla Clasica",
  "Barberia Central", "Fade Republic", "El Buen Corte", "Black Comb Barber", "Tijera Norte",
  "Golden Razor", "Caballeros Club", "Studio 503 Barber", "La Barberia Premium", "Corte Fino",
  "Master Fade", "Barber House SV", "Navajas y Estilo", "Prime Cuts", "Punto Barber",
  "Royal Beard", "Classic Fade", "El Sillon Barber", "Next Cut Studio", "Barberia Avenida",
];

const SALON_NAMES = [
  "Luna Beauty Salon", "Studio Bella", "Rosa Glam", "Esencia Salon", "Mia Beauty House",
  "Salon Ambar", "Glamour Studio", "Dalia Beauty", "Amapola Salon", "Brillo Natural",
  "Aura Beauty Lab", "Salon Mariposa", "Belleza Central", "Studio Elegance", "Nacar Beauty",
  "Garden Salon", "Blush Studio", "Salon Magnolia", "Violeta Beauty", "Casa Belleza",
  "Salon Serena", "Golden Beauty", "Studio Perla", "Beauty Room SV", "Salon Aurora",
];

function tenantTemplate(index) {
  const isSalon = index % 3 === 0 || index % 5 === 0;
  const names = isSalon ? SALON_NAMES : BARBER_NAMES;
  const planCycle = ["BASIC", "PRO", "ENTERPRISE"];
  return {
    name: names[(index - 1) % names.length],
    businessType: isSalon ? "SALON" : "BARBERIA",
    plan: planCycle[(index - 1) % planCycle.length],
  };
}

function passwordFor(prefix, role, index) {
  return `${role}-${prefix}-${String(index).padStart(3, "0")}!2026`;
}

async function createTenants() {
  const count = Number(arg("count", "50"));
  const prefix = arg("prefix", runId()).toLowerCase();
  const forcedPlan = arg("plan", "");
  const forcedBusinessType = arg("businessType", "");

  if (!prefix.startsWith("loadtest")) {
    throw new Error("Por seguridad, --prefix debe comenzar con loadtest");
  }

  await mkdir(MANIFEST_DIR, { recursive: true });
  const created = [];

  for (let index = 1; index <= count; index += 1) {
    const suffix = String(index).padStart(3, "0");
    const template = tenantTemplate(index);
    const displayName = `${template.name} ${suffix}`;
    const slug = `${prefix}-${slugify(template.name)}-${suffix}`;
    const plan = forcedPlan || template.plan;
    const businessType = forcedBusinessType || template.businessType;
    const ownerPassword = passwordFor(prefix, "Owner", index);
    const superAdminPassword = passwordFor(prefix, "Super", index);
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const existing = await prisma.barberTenant.findUnique({ where: { slug } });
    if (existing) throw new Error(`El slug ya existe: ${slug}`);

    const ownerHash = await bcrypt.hash(ownerPassword, 10);
    const superHash = await bcrypt.hash(superAdminPassword, 10);

    const result = await prisma.$transaction(async tx => {
      const tenant = await tx.barberTenant.create({
        data: {
          name: `LOADTEST ${displayName}`,
          slug,
          email: `loadtest-tenant-${suffix}@example.com`,
          phone: `7000-${suffix}`,
          city: "Load Test",
          country: "SV",
          plan,
          businessType,
          maxBarbers: 10,
          trialEndsAt,
        },
      });

      const branch = await tx.barberBranch.create({
        data: {
          tenantId: tenant.id,
          name: `${tenant.name} - Casa Matriz`,
          slug: "casa-matriz",
          isHeadquarters: true,
          status: "ACTIVE",
        },
      });

      const owner = await tx.barberUser.create({
        data: {
          tenantId: tenant.id,
          fullName: `LOADTEST Owner ${displayName}`,
          email: `loadtest-owner-${suffix}@example.com`,
          password: ownerHash,
          role: "OWNER",
          active: true,
        },
      });

      const superAdmin = await tx.barberUser.create({
        data: {
          tenantId: tenant.id,
          fullName: `LOADTEST SuperAdmin ${displayName}`,
          email: `loadtest-superadmin-${suffix}@example.com`,
          password: superHash,
          role: "SUPERADMIN",
          active: true,
        },
      });

      return { tenant, branch, owner, superAdmin };
    });

    created.push({
      id: result.tenant.id,
      slug,
      name: result.tenant.name,
      plan,
      businessType,
      branchId: result.branch.id,
      ownerId: result.owner.id,
      ownerEmail: result.owner.email,
      ownerPassword,
      superAdminId: result.superAdmin.id,
      superAdminEmail: result.superAdmin.email,
      superAdminPassword,
    });

    console.log(`created ${index}/${count}: ${slug} (tenant ${result.tenant.id})`);
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    prefix,
    count: created.length,
    tenants: created,
  };
  const manifestPath = path.join(MANIFEST_DIR, `${prefix}.json`);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nmanifest=${manifestPath}`);
  console.log(`prefix=${prefix}`);
}

async function listTenants() {
  const prefix = arg("prefix", "loadtest");
  const tenants = await prisma.barberTenant.findMany({
    where: { slug: { startsWith: prefix }, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      plan: true,
      businessType: true,
      _count: { select: { users: true, branches: true } },
    },
    orderBy: { id: "asc" },
  });
  console.log(`found=${tenants.length}`);
  for (const tenant of tenants) {
    console.log(`${tenant.id}\t${tenant.slug}\t${tenant.businessType}\t${tenant.plan}\tusers=${tenant._count.users}`);
  }
}

async function deleteByManifest() {
  const manifestPath = arg("manifest", "");
  if (!manifestPath) throw new Error("Falta --manifest=archivo.json");

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const ids = (manifest.tenants || []).map(tenant => tenant.id);
  const result = await prisma.barberTenant.updateMany({
    where: { id: { in: ids }, slug: { startsWith: "loadtest" }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  console.log(`deleted_count=${result.count}`);
}

async function deleteByPrefix() {
  const prefix = arg("prefix", "");
  if (!prefix || !prefix.startsWith("loadtest")) {
    throw new Error("Por seguridad, --prefix debe comenzar con loadtest");
  }
  const result = await prisma.barberTenant.updateMany({
    where: { slug: { startsWith: prefix }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  console.log(`deleted_count=${result.count}`);
}

function help() {
  console.log(`
Usage:
  node scripts/loadtest-tenants-db.mjs create --count=50 --prefix=loadtest-20260501
  node scripts/loadtest-tenants-db.mjs list --prefix=loadtest-20260501
  node scripts/loadtest-tenants-db.mjs delete --manifest=tmp/loadtest-tenants/loadtest-20260501.json
  node scripts/loadtest-tenants-db.mjs delete-prefix --prefix=loadtest-20260501
`);
}

try {
  if (command === "create") await createTenants();
  else if (command === "list") await listTenants();
  else if (command === "delete") await deleteByManifest();
  else if (command === "delete-prefix") await deleteByPrefix();
  else help();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
