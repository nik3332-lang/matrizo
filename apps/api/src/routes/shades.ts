import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { paintShades } from "../db/schema";
import { requireAuth, requireRole, type AuthEnv } from "../middleware/auth";

export const shadeRoutes = new Hono<AuthEnv>();
shadeRoutes.get("/shades", async (c) =>
  c.json({
    shades: await getDb(c.env.DB)
      .select()
      .from(paintShades)
      .where(eq(paintShades.active, true))
      .orderBy(asc(paintShades.sortOrder), asc(paintShades.name)),
  }),
);
shadeRoutes.use("/admin/shades/*", requireAuth, requireRole("admin"));
shadeRoutes.use("/admin/shades", requireAuth, requireRole("admin"));
shadeRoutes.get("/admin/shades", async (c) =>
  c.json({
    shades: await getDb(c.env.DB)
      .select()
      .from(paintShades)
      .orderBy(asc(paintShades.sortOrder)),
  }),
);
const input = z.object({
  family: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  imageUrl: z
    .string()
    .url()
    .refine((v) => /^https?:\/\//.test(v))
    .nullable()
    .optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
shadeRoutes.post("/admin/shades", async (c) => {
  const result = input.safeParse(await c.req.json().catch(() => null));
  if (!result.success)
    return c.json(
      { error: "Enter a family, shade name and six-digit hex colour." },
      400,
    );
  const shade = { id: crypto.randomUUID(), ...result.data };
  await getDb(c.env.DB).insert(paintShades).values(shade);
  return c.json({ shade }, 201);
});
shadeRoutes.patch("/admin/shades/:id", async (c) => {
  const result = input.safeParse(await c.req.json().catch(() => null));
  if (!result.success) return c.json({ error: "Invalid shade." }, 400);
  const [shade] = await getDb(c.env.DB)
    .update(paintShades)
    .set(result.data)
    .where(eq(paintShades.id, c.req.param("id")))
    .returning();
  return shade ? c.json({ shade }) : c.json({ error: "Shade not found." }, 404);
});
shadeRoutes.delete("/admin/shades/:id", async (c) => {
  await getDb(c.env.DB)
    .update(paintShades)
    .set({ active: false })
    .where(eq(paintShades.id, c.req.param("id")));
  return c.json({ ok: true });
});
