import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../apps/api/src/lib/password.ts";
import { SignJWT } from "jose";
export const TEST_SECRET =
  "matrizo-isolated-test-secret-never-use-in-production";
export const TEST_PASSWORD = "Matrizo-local-test-2026";
export async function startFixture(port = 0, options = {}) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const bundle = await build({
    entryPoints: [root + "apps/api/src/index.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    conditions: ["workerd", "worker", "browser"],
    external: ["cloudflare:workers"],
    target: "es2022",
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: "2026-08-04",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: { DB: "local-test-database" },
      kvNamespaces: ["CACHE"],
      durableObjects: {
        ORDER_TRACKER: { className: "OrderTrackerDO", useSQLite: true },
      },
      bindings: { JWT_SECRET: TEST_SECRET, ...options.bindings },
      ...(options.outboundService
        ? { outboundService: options.outboundService }
        : {}),
      cf: false,
      host: "127.0.0.1",
      port,
    }),
  );
  const db = await mf.getD1Database("DB");
  for (const file of (await readdir(root + "apps/api/drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(root + "apps/api/drizzle/" + file, "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(statement).run();
  }
  const hash = await hashPassword(TEST_PASSWORD);
  for (const [id, role, name] of [
    ["admin-test", "admin", "Matrizo Admin"],
    ["employee-test", "sales_employee", "Aarav Sharma"],
    ["employee-two", "sales_employee", "Meera Singh"],
  ]) {
    await db
      .prepare(
        "INSERT INTO users (id,role,email,password_hash,name) VALUES (?,?,?,?,?)",
      )
      .bind(id, role, id + "@matrizo.test", hash, name)
      .run();
    if (role === "sales_employee")
      await db
        .prepare(
          "INSERT INTO employee_profiles (user_id,commission_rate_percent) VALUES (?,?)",
        )
        .bind(id, 5)
        .run();
  }
  const categories = [
    ["sanitary", "Sanitary Ware"],
    ["upvc", "UPVC Pipes & Fittings"],
    ["cpvc", "CPVC Pipes & Fittings"],
    ["paints", "Paints"],
    ["paint-materials-tools", "Paint Materials & Tools"],
  ];
  for (const [i, [slug, name]] of categories.entries())
    await db
      .prepare(
        "INSERT INTO categories (id,slug,name,sort_order,colour,colour_selection) VALUES (?,?,?,?,CASE ? WHEN 'upvc' THEN '#ffffff' WHEN 'cpvc' THEN '#ffdf00' WHEN 'pvc' THEN '#808080' ELSE NULL END, ?)",
      )
      .bind(slug, slug, name, i, slug, slug === "paints" ? 1 : 0)
      .run();
  const products = [
    ["basin", "Ceramic countertop basin", "sanitary", 2499, "others"],
    ["tap", "Chrome basin mixer", "sanitary", 1599, "others"],
    ["pipe", "3/4 inch UPVC pipe", "upvc", 160, "prince"],
    ["elbow", "UPVC elbow 90 degree", "upvc", 25, "padmavati"],
    ["valve", "CPVC ball valve", "cpvc", 185, "raksha"],
    ["cpvc-pipe", "CPVC pipe 3 metre", "cpvc", 325, "prince"],
    ["paint", "Interior emulsion paint 4L", "paints", 1250, "asian_paints"],
    ["primer", "Interior wall primer 1L", "paints", 360, "birla_opus"],
    [
      "roller",
      "Professional paint roller",
      "paint-materials-tools",
      250,
      "others",
    ],
    ["putty", "Wall putty 5kg", "paint-materials-tools", 380, "others"],
  ];
  for (const [id, name, category, price, brand] of products)
    await db
      .prepare(
        "INSERT INTO products (id,sku,slug,category_id,name,unit,base_price,brand) VALUES (?,?,?,?,?,?,?,?)",
      )
      .bind(id, id.toUpperCase(), id, category, name, "piece", price, brand)
      .run();
  await db
    .prepare(
      "INSERT INTO stores (id,name,line1,city,state,pincode) VALUES ('store','Matrizo local test store','Test Road','Delhi','Delhi','110001')",
    )
    .run();
  await db
    .prepare(
      "INSERT INTO store_service_pincodes (store_id,pincode,eta_minutes) VALUES ('store','110001',45)",
    )
    .run();
  for (const [id] of products)
    await db
      .prepare(
        "INSERT INTO inventory(store_id,product_id,stock_qty) VALUES ('store',?,20)",
      )
      .bind(id)
      .run();
  const sign = async (id, role, type = "access", expiry = "15m") =>
    new SignJWT({ role, storeId: null, type })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(id)
      .setIssuedAt()
      .setExpirationTime(expiry)
      .sign(new TextEncoder().encode(TEST_SECRET));
  return { mf, db, sign, root };
}
if (process.argv.includes("--serve")) {
  const { mf, db } = await startFixture(8787);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await db
    .prepare(
      "INSERT INTO sales_entries(id,user_id,date,amount,notes) VALUES ('preview-entry','employee-test',?,18500,'Bathroom fittings and paint supplies for a residential project')",
    )
    .bind(date)
    .run();
  console.log("Isolated Matrizo API ready at " + (await mf.ready));
  console.log(
    "Local test users: admin-test@matrizo.test and employee-test@matrizo.test. Password is TEST_PASSWORD in scripts/local-platform.mjs.",
  );
  process.on("SIGINT", async () => {
    await mf.dispose();
    process.exit(0);
  });
}
