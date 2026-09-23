import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { professionals, media } from "../db/schema";
import { requireAuth, requireRole, type AuthEnv } from "../middleware/auth";

export const professionalRoutes = new Hono<AuthEnv>();
const publicFields = {
  id: professionals.id,
  kind: professionals.kind,
  name: professionals.name,
  yearsExperience: professionals.yearsExperience,
  photoUrl: professionals.photoUrl,
  workPhotos: professionals.workPhotos,
};
professionalRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
professionalRoutes.get("/professionals", async (c) => {
  const kind = z.enum(["painter", "plumber"]).safeParse(c.req.query("kind"));
  if (!kind.success)
    return c.json({ error: "Choose painters or plumbers." }, 400);
  return c.json({
    professionals: await getDb(c.env.DB)
      .select(publicFields)
      .from(professionals)
      .where(eq(professionals.kind, kind.data))
      .orderBy(asc(professionals.name)),
  });
});
professionalRoutes.get("/professionals/:id", async (c) => {
  const [profile] = await getDb(c.env.DB)
    .select(publicFields)
    .from(professionals)
    .where(eq(professionals.id, c.req.param("id")))
    .limit(1);
  return profile
    ? c.json({ profile })
    : c.json({ error: "Profile not found." }, 404);
});
professionalRoutes.get("/media/:id", async (c) => {
  const [file] = await getDb(c.env.DB)
    .select()
    .from(media)
    .where(eq(media.id, c.req.param("id")))
    .limit(1);
  if (!file) return c.notFound();
  const bytes = Uint8Array.from(atob(file.data), (char) => char.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "Content-Type": file.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public,max-age=31536000,immutable",
    },
  });
});
professionalRoutes.use(
  "/team/*",
  requireAuth,
  requireRole("admin", "sales_employee"),
);
const imageUrl = z
  .string()
  .url()
  .max(2000)
  .refine((url) => /^https?:\/\//.test(url));
const input = z.object({
  kind: z.enum(["painter", "plumber"]),
  name: z.string().trim().min(1).max(120),
  yearsExperience: z.number().int().min(0).max(80),
  photoUrl: imageUrl,
  workPhotos: z.array(imageUrl).max(20),
});
professionalRoutes.post("/team/professionals", async (c) => {
  const result = input.safeParse(await c.req.json().catch(() => null));
  if (!result.success)
    return c.json(
      {
        error:
          "Enter a name, experience, profile photo and up to 20 work photos.",
      },
      400,
    );
  const profile = {
    id: crypto.randomUUID(),
    ...result.data,
    updatedBy: c.get("auth").sub,
  };
  await getDb(c.env.DB).insert(professionals).values(profile);
  return c.json({ profile }, 201);
});
professionalRoutes.patch("/team/professionals/:id", async (c) => {
  const result = input.safeParse(await c.req.json().catch(() => null));
  if (!result.success) return c.json({ error: "Invalid profile." }, 400);
  const [profile] = await getDb(c.env.DB)
    .update(professionals)
    .set({
      ...result.data,
      updatedAt: new Date(),
      updatedBy: c.get("auth").sub,
    })
    .where(eq(professionals.id, c.req.param("id")))
    .returning();
  return profile
    ? c.json({ profile })
    : c.json({ error: "Profile not found." }, 404);
});
professionalRoutes.delete("/team/professionals/:id", async (c) => {
  await getDb(c.env.DB)
    .delete(professionals)
    .where(eq(professionals.id, c.req.param("id")));
  return c.json({ ok: true });
});
professionalRoutes.post("/team/media", async (c) => {
  const length = Number(c.req.header("content-length"));
  if (length > 720000)
    return c.json({ error: "Photo must be smaller than 512 KB." }, 413);
  const body = await c.req.text();
  if (body.length > 720000)
    return c.json({ error: "Photo must be smaller than 512 KB." }, 413);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return c.json({ error: "Invalid upload." }, 400);
  }
  const result = z
    .object({ dataUrl: z.string().max(710000) })
    .safeParse(parsed);
  const match = result.success
    ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
        result.data.dataUrl,
      )
    : null;
  if (!match)
    return c.json({ error: "Upload a JPEG, PNG or WebP photo." }, 400);
  let bytes: string;
  try {
    bytes = atob(match[2]);
  } catch {
    return c.json({ error: "Invalid image." }, 400);
  }
  const valid =
    match[1] === "image/jpeg"
      ? bytes.startsWith("\xff\xd8\xff")
      : match[1] === "image/png"
        ? bytes.startsWith("\x89PNG\r\n\x1a\n")
        : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
  if (!valid || bytes.length > 512 * 1024)
    return c.json({ error: "Invalid image or image exceeds 512 KB." }, 400);
  const id = crypto.randomUUID();
  await getDb(c.env.DB)
    .insert(media)
    .values({
      id,
      contentType: match[1],
      data: match[2],
      uploadedBy: c.get("auth").sub,
    });
  return c.json(
    { url: `${new URL(c.req.url).origin}/api/v1/media/${id}` },
    201,
  );
});
