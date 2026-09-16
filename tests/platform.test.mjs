import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startFixture, TEST_PASSWORD } from "../scripts/local-platform.mjs";
let fixture, adminToken, employeeToken, secondToken, customer, addressId;
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
async function request(
  path,
  { method = "GET", token, body, status = 200 } = {},
) {
  const res = await fixture.mf.dispatchFetch("http://localhost/api/v1" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  assert.equal(
    res.status,
    status,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  return data;
}
before(async () => {
  fixture = await startFixture();
  adminToken = await fixture.sign("admin-test", "admin");
  employeeToken = await fixture.sign("employee-test", "sales_employee");
  secondToken = await fixture.sign("employee-two", "sales_employee");
});
after(async () => {
  await fixture?.mf.dispose();
});
test("public catalog exposes real products and balanced home selections", async () => {
  const home = await request("/storefront");
  assert.equal(home.categories.length, 5);
  assert.equal(home.featured.length, 10);
  assert.equal(new Set(home.featured.map((p) => p.categoryId)).size, 5);
  assert.equal((await request("/products")).products.length, 10);
});
test("admin can manage nested categories and products; invalid hierarchy is rejected", async () => {
  const parent = await request("/admin/categories", {
    method: "POST",
    token: adminToken,
    body: { name: "Bathroom fittings", slug: "bathroom-fittings" },
    status: 201,
  });
  const child = await request("/admin/categories", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Basin taps",
      slug: "basin-taps",
      parentId: parent.category.id,
    },
    status: 201,
  });
  await request(`/admin/categories/${parent.category.id}`, {
    method: "PATCH",
    token: adminToken,
    body: { parentId: child.category.id },
    status: 400,
  });
  await request(`/admin/categories/${parent.category.id}`, {
    method: "DELETE",
    token: adminToken,
    status: 409,
  });
  const created = await request("/admin/products", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Test basin tap",
      sku: "TAP-TEST",
      slug: "test-tap",
      categoryId: child.category.id,
      unit: "piece",
      basePrice: 999,
    },
    status: 201,
  });
  assert.equal(
    (await request("/categories/bathroom-fittings/products")).products.length,
    1,
  );
  await request(`/admin/categories/${child.category.id}`, {
    method: "DELETE",
    token: adminToken,
    status: 409,
  });
  await request(`/admin/products/${created.product.id}`, {
    method: "DELETE",
    token: adminToken,
  });
  await request(`/admin/categories/${child.category.id}`, {
    method: "DELETE",
    token: adminToken,
  });
  await request(`/admin/categories/${parent.category.id}`, {
    method: "DELETE",
    token: adminToken,
  });
  await request("/admin/products", { token: employeeToken, status: 403 });
});
test("employee daily sales are isolated, atomic, validated, and visible in admin review", async () => {
  await request(`/employees/me/sales/${date}`, {
    method: "PUT",
    token: employeeToken,
    body: { amount: 1234.56, notes: "Bathroom order" },
  });
  await request(`/employees/me/sales/${date}`, {
    method: "PUT",
    token: employeeToken,
    body: { amount: 2222.22, notes: "Updated daily total" },
  });
  assert.equal(
    (await request("/employees/me/sales", { token: employeeToken })).entries
      .length,
    1,
  );
  assert.equal(
    (await request("/employees/me/sales", { token: secondToken })).entries
      .length,
    0,
  );
  await request("/employees/me/sales/2026-02-30", {
    method: "PUT",
    token: employeeToken,
    body: { amount: 100 },
    status: 400,
  });
  await request("/employees/me/sales/2999-01-01", {
    method: "PUT",
    token: employeeToken,
    body: { amount: 100 },
    status: 400,
  });
  await request(`/employees/me/sales/${date}`, {
    method: "PUT",
    token: employeeToken,
    body: { amount: -1 },
    status: 400,
  });
  const report = await request(`/admin/employees/sales?date=${date}`, {
    token: adminToken,
  });
  assert.equal(report.summary.totalSales, 2222.22);
  assert.equal(report.summary.submitted, 1);
  assert.equal(report.summary.missing.length, 1);
  await request("/admin/employees/sales", {
    token: employeeToken,
    status: 403,
  });
  await request(`/employees/me/sales/${date}`, {
    method: "PUT",
    token: secondToken,
    body: { amount: 0 },
  });
  assert.equal(
    (
      await request(`/admin/employees/sales?date=${date}`, {
        token: adminToken,
      })
    ).summary.submitted,
    2,
  );
});
test("employee removal immediately revokes existing access and preserves reports; access can be restored", async () => {
  const login = await request("/auth/login", {
    method: "POST",
    body: { email: "employee-test@matrizo.test", password: TEST_PASSWORD },
  });
  await request("/admin/employees/employee-test", {
    method: "DELETE",
    token: adminToken,
  });
  await request("/employees/me", { token: login.accessToken, status: 401 });
  await request("/auth/refresh", {
    method: "POST",
    body: { refreshToken: login.refreshToken },
    status: 401,
  });
  assert.equal(
    (
      await request(`/admin/employees/sales?date=${date}`, {
        token: adminToken,
      })
    ).summary.totalSales,
    2222.22,
  );
  await request("/admin/employees/employee-test", {
    method: "PATCH",
    token: adminToken,
    body: { active: true },
  });
  await request("/employees/me", { token: login.accessToken });
  const added = await request("/admin/employees", {
    method: "POST",
    token: adminToken,
    body: {
      name: "New employee",
      email: "new@matrizo.test",
      password: TEST_PASSWORD,
      commissionRatePercent: 0,
    },
    status: 201,
  });
  assert.equal(added.employee.commissionRatePercent, 0);
});
test("customer registration, login, refresh and staff separation work without SMS", async () => {
  customer = await request("/auth/customer-register", {
    method: "POST",
    body: {
      name: "Test Customer",
      email: "customer@matrizo.test",
      phone: "9999999991",
      password: TEST_PASSWORD,
    },
    status: 201,
  });
  await request("/auth/customer-login", {
    method: "POST",
    body: { email: "customer@matrizo.test", password: TEST_PASSWORD },
  });
  await request("/auth/customer-login", {
    method: "POST",
    body: { email: "admin-test@matrizo.test", password: TEST_PASSWORD },
    status: 401,
  });
  await request("/auth/refresh", {
    method: "POST",
    body: { refreshToken: customer.refreshToken },
  });
  await request("/admin/employees", {
    token: customer.accessToken,
    status: 403,
  });
  const sms = await request("/auth/otp/request", {
    method: "POST",
    body: { phone: "9999999999" },
    status: 503,
  });
  assert.equal(sms.devOtp, undefined);
  const address = await request("/account/addresses", {
    method: "POST",
    token: customer.accessToken,
    body: {
      line1: "Test home",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      isDefault: true,
    },
    status: 201,
  });
  addressId = address.address.id;
});
test("COD checkout reserves stock; order transitions and cancellation preserve stock", async () => {
  await request("/cart/items", {
    method: "POST",
    token: customer.accessToken,
    body: { productId: "pipe", quantity: 2 },
  });
  const order = await request("/orders", {
    method: "POST",
    token: customer.accessToken,
    body: { addressId },
    status: 201,
  });
  assert.equal(order.totalAmount, 320);
  const detail = await request(`/orders/${order.orderId}`, {
    token: adminToken,
  });
  assert.equal(detail.customer.phone, "9999999991");
  assert.equal(detail.address.pincode, "110001");
  await request(`/orders/${order.orderId}`, {
    token: employeeToken,
    status: 404,
  });
  assert.equal(
    (
      await fixture.db
        .prepare("SELECT stock_qty FROM inventory WHERE product_id='pipe'")
        .first()
    ).stock_qty,
    18,
  );
  await request(`/orders/${order.orderId}/status`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "delivered" },
    status: 409,
  });
  await request(`/orders/${order.orderId}/status`, {
    method: "PATCH",
    token: customer.accessToken,
    body: { status: "cancelled" },
  });
  assert.equal(
    (
      await fixture.db
        .prepare("SELECT stock_qty FROM inventory WHERE product_id='pipe'")
        .first()
    ).stock_qty,
    20,
  );
  await request(`/orders/${order.orderId}/status`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "confirmed" },
    status: 409,
  });
});
test("concurrent checkouts cannot sell the last item twice", async () => {
  const second = await request("/auth/customer-register", {
    method: "POST",
    body: {
      name: "Second Customer",
      email: "second@matrizo.test",
      phone: "9999999992",
      password: TEST_PASSWORD,
    },
    status: 201,
  });
  const address = await request("/account/addresses", {
    method: "POST",
    token: second.accessToken,
    body: {
      line1: "Another test home",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
    },
    status: 201,
  });
  await fixture.db
    .prepare("UPDATE inventory SET stock_qty=1 WHERE product_id='valve'")
    .run();
  for (const token of [customer.accessToken, second.accessToken])
    await request("/cart/items", {
      method: "POST",
      token,
      body: { productId: "valve", quantity: 1 },
    });
  const results = await Promise.all(
    [
      [customer.accessToken, addressId],
      [second.accessToken, address.address.id],
    ].map(([token, id]) =>
      fixture.mf.dispatchFetch("http://localhost/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ addressId: id }),
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(
    (
      await fixture.db
        .prepare("SELECT stock_qty FROM inventory WHERE product_id='valve'")
        .first()
    ).stock_qty,
    0,
  );
});

test("full-size public and admin catalogs preserve tiers beyond D1 bind limits", async () => {
  for (let index = 0; index < 220; index++) {
    const id = `catalog-scale-${index}`;
    await fixture.db
      .prepare(
        "INSERT INTO products (id,sku,slug,category_id,name,unit,base_price) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(id, id, id, "upvc", `Scale product ${index}`, "piece", 100)
      .run();
  }
  await fixture.db
    .prepare(
      "INSERT INTO bulk_pricing_tiers (id,product_id,min_qty,price_per_unit) VALUES ('scale-tier','catalog-scale-219',10,85)",
    )
    .run();
  for (const [path, token] of [
    ["/products", undefined],
    ["/admin/products", adminToken],
    ["/categories/upvc/products", undefined],
  ]) {
    const { products } = await request(path, { token });
    assert.ok(products.length > 220);
    assert.equal(
      products.find((p) => p.id === "catalog-scale-219").tiers[0].pricePerUnit,
      85,
    );
  }
});
