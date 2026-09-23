import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readdir, readFile } from "node:fs/promises";
import { build } from "esbuild";
import { SignJWT } from "jose";

// Exercise actual route handlers and migrations without opening a local port.
let sqlite, app, env;
const tokens = {};
const secret = "isolated-feature-test-secret-never-production";
function statement(query, values = []) {
  return {
    bind: (...args) => statement(query, args),
    async all() {
      return {
        results: sqlite.prepare(query).all(...values),
        success: true,
        meta: {},
      };
    },
    async run() {
      const result = sqlite.prepare(query).run(...values);
      return {
        success: true,
        results: [],
        meta: { changes: Number(result.changes) },
      };
    },
    async raw() {
      const stmt = sqlite.prepare(query);
      stmt.setReturnArrays(true);
      return stmt.all(...values);
    },
    async first(column) {
      const row = sqlite.prepare(query).get(...values);
      return column ? (row?.[column] ?? null) : (row ?? null);
    },
  };
}
async function request(
  path,
  { role, method = "GET", body, status = 200 } = {},
) {
  const response = await app.request(
    `http://localhost/api/v1${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    env,
    {
      waitUntil(p) {
        p.catch(() => {});
      },
      passThroughOnException() {},
    },
  );
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${path}: ${text}`);
  return JSON.parse(text);
}
before(async () => {
  const bundle = await build({
    stdin: {
      contents: `import { Hono } from 'hono'; import { catalogRoutes } from './apps/api/src/routes/catalog'; import { cartRoutes } from './apps/api/src/routes/cart'; import { orderRoutes } from './apps/api/src/routes/orders'; import { shadeRoutes } from './apps/api/src/routes/shades'; import { professionalRoutes } from './apps/api/src/routes/professionals'; const app = new Hono().basePath('/api/v1'); app.route('/',catalogRoutes); app.route('/',shadeRoutes); app.route('/',professionalRoutes); app.route('/cart',cartRoutes); app.route('/orders',orderRoutes); export default app;`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "node24",
  });
  app = (
    await import(
      `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
    )
  ).default;
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const name of (await readdir("apps/api/drizzle"))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    sqlite.exec(
      (await readFile(`apps/api/drizzle/${name}`, "utf8")).replaceAll(
        "--> statement-breakpoint",
        "",
      ),
    );
  env = {
    JWT_SECRET: secret,
    DB: {
      prepare: statement,
      async batch(statements) {
        sqlite.exec("BEGIN");
        try {
          const results = [];
          for (const s of statements) results.push(await s.all());
          sqlite.exec("COMMIT");
          return results;
        } catch (error) {
          sqlite.exec("ROLLBACK");
          throw error;
        }
      },
    },
    ORDER_TRACKER: {
      idFromName: (id) => id,
      get: () => ({ fetch: async () => new Response("ok") }),
    },
  };
  for (const role of [
    "admin",
    "sales_employee",
    "customer",
    "store_staff",
    "delivery_partner",
  ]) {
    sqlite.prepare("INSERT INTO users (id,role) VALUES (?,?)").run(role, role);
    tokens[role] = await new SignJWT({
      type: "access",
      role,
      sessionVersion: 0,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(role)
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));
  }
  sqlite.exec(`INSERT INTO categories (id,slug,name,colour,colour_selection) VALUES ('pipes','upvc','UPVC','#ffffff',0),('paints','paints','Paints',NULL,1);
    INSERT INTO products (id,sku,slug,category_id,name,unit,base_price) VALUES ('pipe','pipe','pipe','pipes','Pipe','piece',10),('paint','paint','paint','paints','Paint','tin',100);
    INSERT INTO stores (id,name,line1,city,state,pincode) VALUES ('store','Store','Road','City','State','560102');
    INSERT INTO store_service_pincodes (store_id,pincode) VALUES ('store','560102');
    INSERT INTO inventory (store_id,product_id,stock_qty) VALUES ('store','paint',5),('store','pipe',12);
    INSERT INTO addresses (id,user_id,line1,city,state,pincode) VALUES ('address','customer','Road','City','State','560102');`);
});
after(() => sqlite?.close());

test("category colours are admin managed and inherited by product reads", async () => {
  await request("/admin/categories/pipes", {
    role: "admin",
    method: "PATCH",
    body: { colour: "#ffff00" },
  });
  const { category } = await request("/admin/categories", {
    role: "admin",
    method: "POST",
    status: 201,
    body: { slug: "pipe-fittings", name: "Fittings", parentId: "pipes" },
  });
  sqlite
    .prepare("UPDATE products SET category_id=? WHERE id='pipe'")
    .run(category.id);
  assert.equal(
    (await request("/products/pipe")).product.category.colour,
    "#ffff00",
  );
  assert.equal(
    (await request("/products")).products.find((p) => p.id === "pipe").category
      .colour,
    "#ffff00",
  );
  await request("/admin/categories/pipes", {
    role: "customer",
    method: "PATCH",
    body: { colour: "#ffffff" },
    status: 403,
  });
});
test("public stock returns availability without inventory quantities", async () => {
  const { stock } = await request("/products/pipe/stock?pincode=560102");
  assert.equal(stock.available, true);
  assert.equal("stockQty" in stock, false);
  sqlite.exec("UPDATE inventory SET stock_qty=0 WHERE product_id='pipe'");
  assert.equal(
    (await request("/products/pipe?pincode=560102")).product.stock.available,
    false,
  );
});
test("paint variants stay distinct, checkout aggregates inventory and snapshots the shade", async () => {
  await request("/cart/items", {
    role: "customer",
    method: "POST",
    body: { productId: "paint", quantity: 1 },
    status: 400,
  });
  for (const shadeId of ["mz-blue-01", "mz-blue-02"])
    await request("/cart/items", {
      role: "customer",
      method: "POST",
      body: { productId: "paint", quantity: 3, shadeId },
    });
  assert.equal((await request("/cart", { role: "customer" })).items.length, 2);
  await request("/orders", {
    role: "customer",
    method: "POST",
    body: { addressId: "address" },
    status: 409,
  });
  const cart = await request("/cart/items/paint?shadeId=mz-blue-01", {
    role: "customer",
    method: "PATCH",
    body: { quantity: 2 },
  });
  assert.equal(cart.items.find((i) => i.shadeId === "mz-blue-02").quantity, 3);
  const order = await request("/orders", {
    role: "customer",
    method: "POST",
    body: { addressId: "address" },
    status: 201,
  });
  const lines = sqlite
    .prepare("SELECT shade,quantity FROM order_items WHERE order_id=?")
    .all(order.orderId);
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0].shade).family, "Blue");
  assert.equal(
    sqlite
      .prepare("SELECT stock_qty FROM inventory WHERE product_id='paint'")
      .get().stock_qty,
    0,
  );
  assert.equal((await request("/cart", { role: "customer" })).items.length, 0);
});
test("shade catalogue writes reject employees and preserve historical orders", async () => {
  const body = {
    family: "Blue",
    name: "Updated blue",
    hex: "#123456",
    active: false,
  };
  await request("/admin/shades/mz-blue-01", {
    role: "sales_employee",
    method: "PATCH",
    body,
    status: 403,
  });
  await request("/admin/shades/mz-blue-01", {
    role: "admin",
    method: "PATCH",
    body,
  });
  assert.equal(
    (await request("/shades")).shades.some((s) => s.id === "mz-blue-01"),
    false,
  );
  const historical = sqlite
    .prepare("SELECT shade FROM order_items")
    .all()
    .map((r) => JSON.parse(r.shade));
  assert.equal(
    historical.find((s) => s.id === "mz-blue-01").name,
    "Matrizo Blue 01",
  );
});
test("employee profile writes are role restricted and immediately public for both trades", async () => {
  for (const kind of ["painter", "plumber"]) {
    const body = {
      kind,
      name: "Test professional",
      yearsExperience: 8,
      photoUrl: "https://example.com/photo.jpg",
      workPhotos: ["https://example.com/work.jpg"],
    };
    await request("/team/professionals", { method: "POST", body, status: 401 });
    for (const role of ["customer", "store_staff", "delivery_partner"])
      await request("/team/professionals", {
        role,
        method: "POST",
        body,
        status: 403,
      });
    const { profile } = await request("/team/professionals", {
      role: "sales_employee",
      method: "POST",
      body,
      status: 201,
    });
    await request(`/team/professionals/${profile.id}`, {
      role: "admin",
      method: "PATCH",
      body: { ...body, yearsExperience: 9 },
    });
    const publicProfile = (await request(`/professionals/${profile.id}`))
      .profile;
    assert.equal(publicProfile.yearsExperience, 9);
    assert.equal("updatedBy" in publicProfile, false);
    assert.equal(
      (await request(`/professionals?kind=${kind}`)).professionals.length,
      1,
    );
    await request(`/team/professionals/${profile.id}`, {
      role: "sales_employee",
      method: "DELETE",
    });
    await request(`/professionals/${profile.id}`, { status: 404 });
  }
});
test("media rejects unauthorized users and mislabeled images", async () => {
  const body = { dataUrl: "data:image/jpeg;base64,SGVsbG8=" };
  await request("/team/media", {
    role: "customer",
    method: "POST",
    body,
    status: 403,
  });
  await request("/team/media", {
    role: "sales_employee",
    method: "POST",
    body,
    status: 400,
  });
  const data = (await readFile("MATRIZO LOGO.jpeg")).toString("base64");
  const { url } = await request("/team/media", {
    role: "sales_employee",
    method: "POST",
    body: { dataUrl: `data:image/jpeg;base64,${data}` },
    status: 201,
  });
  const response = await app.request(url, {}, env);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(
    Buffer.from(await response.arrayBuffer()).toString("base64"),
    data,
  );
});
