import { Hono } from "hono";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { professionals, media, users } from "../db/schema";
import { hashPassword } from "../lib/password";
import { requireAuth, requireRole, type AuthEnv } from "../middleware/auth";

export const professionalRoutes = new Hono<AuthEnv>();
const publicFields = {
  id: professionals.id,
  kind: professionals.kind,
  name: professionals.name,
  yearsExperience: professionals.yearsExperience,
  photoUrl: professionals.photoUrl,
  workPhotos: professionals.workPhotos,
  projects: professionals.projects,
};
function publicProfile<
  T extends { projects: import("@matrizo/shared").ProfessionalProject[] },
>(profile: T) {
  return {
    ...profile,
    projects: profile.projects.map(
      ({ address: _address, ...project }) => project,
    ),
  };
}
professionalRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
professionalRoutes.get("/professionals", async (c) => {
  const kind = z.enum(["painter", "plumber"]).safeParse(c.req.query("kind"));
  if (!kind.success)
    return c.json({ error: "Choose painters or plumbers." }, 400);
  return c.json({
    professionals: (
      await getDb(c.env.DB)
        .select(publicFields)
        .from(professionals)
        .where(eq(professionals.kind, kind.data))
        .orderBy(asc(professionals.name))
    ).map(publicProfile),
  });
});
professionalRoutes.get("/professionals/:id", async (c) => {
  const [profile] = await getDb(c.env.DB)
    .select(publicFields)
    .from(professionals)
    .where(eq(professionals.id, c.req.param("id")!))
    .limit(1);
  return profile
    ? c.json({ profile: publicProfile(profile) })
    : c.json({ error: "Profile not found." }, 404);
});
professionalRoutes.get("/media/:id", async (c) => {
  const [file] = await getDb(c.env.DB)
    .select()
    .from(media)
    .where(eq(media.id, c.req.param("id")!))
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
  requireRole("admin", "painter", "plumber"),
);
const imageUrl = z
  .string()
  .url()
  .max(2000)
  .refine((url) => /^https?:\/\//.test(url));
const projectInput = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  locality: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500).default(""),
  description: z.string().trim().max(2000),
  photos: z.array(imageUrl).max(20),
});
const input = z.object({
  kind: z.enum(["painter", "plumber"]),
  name: z.string().trim().min(1).max(120),
  yearsExperience: z.number().int().min(0).max(80),
  photoUrl: imageUrl,
  workPhotos: z.array(imageUrl).max(20),
  projects: z.array(projectInput).max(30).default([]),
});
professionalRoutes.get(
  "/team/professionals",
  requireRole("admin"),
  async (c) => {
    const profiles = await getDb(c.env.DB)
      .select({
        ...publicFields,
        userId: professionals.userId,
        email: users.email,
        active: users.active,
      })
      .from(professionals)
      .leftJoin(users, eq(users.id, professionals.userId))
      .orderBy(asc(professionals.name));
    return c.json({ professionals: profiles });
  },
);
professionalRoutes.get(
  "/team/my-profile",
  requireRole("painter", "plumber"),
  async (c) => {
    const [profile] = await getDb(c.env.DB)
      .select(publicFields)
      .from(professionals)
      .where(eq(professionals.userId, c.get("auth").sub))
      .limit(1);
    return profile
      ? c.json({ profile })
      : c.json(
          {
            error:
              "No profile is linked to your account. Contact your administrator.",
          },
          404,
        );
  },
);
professionalRoutes.patch(
  "/team/my-profile",
  requireRole("painter", "plumber"),
  async (c) => {
    const result = input
      .omit({ kind: true })
      .strict()
      .safeParse(await c.req.json().catch(() => null));
    if (!result.success)
      return c.json({ error: "Check your profile and project details." }, 400);
    const [profile] = await getDb(c.env.DB)
      .update(professionals)
      .set({
        ...result.data,
        updatedBy: c.get("auth").sub,
        updatedAt: new Date(),
      })
      .where(eq(professionals.userId, c.get("auth").sub))
      .returning(publicFields);
    return profile
      ? c.json({ profile })
      : c.json({ error: "Profile not found." }, 404);
  },
);
const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128),
});
professionalRoutes.post(
  "/team/professionals/:id/account",
  requireRole("admin"),
  async (c) => {
    const result = credentials.safeParse(await c.req.json().catch(() => null));
    if (!result.success)
      return c.json(
        {
          error:
            "Enter a valid email and a password of at least 12 characters.",
        },
        400,
      );
    const db = getDb(c.env.DB);
    const [profile] = await db
      .select()
      .from(professionals)
      .where(eq(professionals.id, c.req.param("id")!))
      .limit(1);
    if (!profile) return c.json({ error: "Profile not found." }, 404);
    if (profile.userId)
      return c.json({ error: "This profile already has a login." }, 409);
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, result.data.email))
      .limit(1);
    if (existing)
      return c.json({ error: "This email already has an account." }, 409);
    // A deterministic ID prevents concurrent account creation from leaving orphan logins.
    const userId = `professional:${profile.id}`;
    try {
      await db.batch([
        db
          .insert(users)
          .values({
            id: userId,
            role: profile.kind,
            email: result.data.email,
            name: profile.name,
            passwordHash: await hashPassword(result.data.password),
          }),
        db
          .update(professionals)
          .set({ userId, updatedAt: new Date() })
          .where(
            and(
              eq(professionals.id, profile.id),
              sql`${professionals.userId} is null`,
            ),
          ),
      ]);
    } catch {
      return c.json(
        {
          error:
            "Unable to create login. Check whether the email or profile is already linked.",
        },
        409,
      );
    }
    return c.json({ ok: true }, 201);
  },
);
professionalRoutes.patch(
  "/team/professionals/:id/account",
  requireRole("admin"),
  async (c) => {
    const result = z
      .object({
        active: z.boolean().optional(),
        password: z.string().min(12).max(128).optional(),
      })
      .strict()
      .safeParse(await c.req.json().catch(() => null));
    if (
      !result.success ||
      (result.data.active === undefined && !result.data.password)
    )
      return c.json({ error: "Choose an account change." }, 400);
    const db = getDb(c.env.DB);
    const [profile] = await db
      .select()
      .from(professionals)
      .where(eq(professionals.id, c.req.param("id")!))
      .limit(1);
    if (!profile?.userId)
      return c.json({ error: "No login linked to this profile." }, 404);
    await db
      .update(users)
      .set({
        ...(result.data.active !== undefined
          ? { active: result.data.active }
          : {}),
        ...(result.data.password
          ? { passwordHash: await hashPassword(result.data.password) }
          : {}),
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, profile.userId));
    return c.json({ ok: true });
  },
);
professionalRoutes.post(
  "/team/professionals",
  requireRole("admin"),
  async (c) => {
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
  },
);
professionalRoutes.patch(
  "/team/professionals/:id",
  requireRole("admin"),
  async (c) => {
    const result = input.safeParse(await c.req.json().catch(() => null));
    if (!result.success) return c.json({ error: "Invalid profile." }, 400);
    const [existing] = await getDb(c.env.DB)
      .select()
      .from(professionals)
      .where(eq(professionals.id, c.req.param("id")!))
      .limit(1);
    if (existing?.userId && existing.kind !== result.data.kind)
      return c.json(
        { error: "A linked account's profession cannot be changed." },
        400,
      );
    const [profile] = await getDb(c.env.DB)
      .update(professionals)
      .set({
        ...result.data,
        updatedAt: new Date(),
        updatedBy: c.get("auth").sub,
      })
      .where(eq(professionals.id, c.req.param("id")!))
      .returning();
    return profile
      ? c.json({ profile })
      : c.json({ error: "Profile not found." }, 404);
  },
);
professionalRoutes.delete(
  "/team/professionals/:id",
  requireRole("admin"),
  async (c) => {
    const db = getDb(c.env.DB);
    const [profile] = await db
      .select()
      .from(professionals)
      .where(eq(professionals.id, c.req.param("id")!))
      .limit(1);
    if (!profile) return c.json({ error: "Profile not found." }, 404);
    if (profile.userId)
      await db.batch([
        db
          .update(users)
          .set({
            active: false,
            sessionVersion: sql`${users.sessionVersion} + 1`,
          })
          .where(eq(users.id, profile.userId)),
        db.delete(professionals).where(eq(professionals.id, profile.id)),
      ]);
    else await db.delete(professionals).where(eq(professionals.id, profile.id));
    return c.json({ ok: true });
  },
);
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
