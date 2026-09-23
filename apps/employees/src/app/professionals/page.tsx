"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Professional, ProfessionalProject } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

async function upload(file: File) {
  if (
    !/^image\/(jpeg|png|webp)$/.test(file.type) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error("Choose a JPEG, PNG or WebP photo under 15 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Photo processing is unavailable in this browser.");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  if (dataUrl.length > 690000) dataUrl = canvas.toDataURL("image/jpeg", 0.55);
  if (dataUrl.length > 690000)
    throw new Error("Photo is too detailed. Choose a smaller image.");
  return (await api.post<{ url: string }>("/team/media", { dataUrl })).url;
}

export default function ProfessionalsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Professional | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0);
  const allowed = user?.role === "painter" || user?.role === "plumber";
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowed) return;
    let live = true;
    api
      .get<{ profile: Professional }>("/team/my-profile")
      .then((r) => {
        if (live) {
          setProfile(r.profile);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Could not load your profile.",
          );
      });
    return () => {
      live = false;
    };
  }, [user, loading, allowed, router, version]);
  function change(next: Professional) {
    setProfile(next);
    setSaved(false);
  }
  function projectChange(id: string, patch: Partial<ProfessionalProject>) {
    if (profile)
      change({
        ...profile,
        projects: (profile.projects ?? []).map((p) =>
          p.id === id ? { ...p, ...patch } : p,
        ),
      });
  }
  async function photos(
    files: FileList | null,
    target: "profile" | "gallery" | string,
  ) {
    if (!files?.length || !profile) return;
    const previous =
      target === "profile"
        ? []
        : target === "gallery"
          ? profile.workPhotos
          : (profile.projects?.find((p) => p.id === target)?.photos ?? []);
    if (target !== "profile" && previous.length + files.length > 20) {
      setError("Maximum 20 photos per gallery or project.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      for (const file of Array.from(files)) {
        const url = await upload(file);
        setProfile((p) =>
          !p
            ? p
            : target === "profile"
              ? { ...p, photoUrl: url }
              : target === "gallery"
                ? { ...p, workPhotos: [...p.workPhotos, url] }
                : {
                    ...p,
                    projects: (p.projects ?? []).map((project) =>
                      project.id === target
                        ? { ...project, photos: [...project.photos, url] }
                        : project,
                    ),
                  },
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed.");
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const details = {
        name: profile.name,
        yearsExperience: profile.yearsExperience,
        photoUrl: profile.photoUrl,
        workPhotos: profile.workPhotos,
        projects: profile.projects ?? [],
      };
      const r = await api.patch<{ profile: Professional }>(
        "/team/my-profile",
        details,
      );
      setProfile(r.profile);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p>Loading...</p>;
  if (!allowed)
    return (
      <p>
        Painter or plumber sign-in required.{" "}
        {user?.role === "admin" && (
          <a
            className="underline"
            href="https://adminacc.matrizo.com/professionals"
          >
            Manage professional accounts in Admin
          </a>
        )}
      </p>
    );
  if (!profile)
    return (
      <p role="status">
        {error || "Loading your profile..."}{" "}
        {error && (
          <button onClick={() => setVersion((v) => v + 1)}>Retry</button>
        )}
      </p>
    );
  return (
    <form onSubmit={save} className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">My profile &amp; work</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {saved && <p role="status">Profile saved.</p>}
      <fieldset disabled={busy} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <label>
            Name
            <input
              required
              maxLength={120}
              className="block w-full border rounded p-2"
              value={profile.name}
              onChange={(e) => change({ ...profile, name: e.target.value })}
            />
          </label>
          <label>
            Years of experience
            <input
              required
              type="number"
              min={0}
              max={80}
              className="block w-full border rounded p-2"
              value={profile.yearsExperience}
              onChange={(e) =>
                change({ ...profile, yearsExperience: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <Image
          unoptimized
          width={160}
          height={160}
          src={profile.photoUrl}
          alt={profile.name}
          className="h-40 w-40 object-cover rounded"
        />
        <label className="block">
          Profile photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block mt-2 max-w-full"
            onChange={(e) => {
              void photos(e.target.files, "profile");
              e.target.value = "";
            }}
          />
        </label>
        <section className="space-y-3 border-t pt-4">
          <h2 className="text-lg font-semibold">Work gallery</h2>
          <label className="block">
            Photos
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="block mt-2 max-w-full"
              onChange={(e) => {
                void photos(e.target.files, "gallery");
                e.target.value = "";
              }}
            />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profile.workPhotos.map((url, i) => (
              <div key={url + i}>
                <Image
                  unoptimized
                  src={url}
                  alt={"Work photo " + (i + 1)}
                  width={320}
                  height={240}
                  className="h-32 w-full object-cover rounded"
                />
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    change({
                      ...profile,
                      workPhotos: profile.workPhotos.filter((_, n) => n !== i),
                    })
                  }
                >
                  Remove photo
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-5 border-t pt-4">
          <h2 className="text-lg font-semibold">Work sites</h2>
          {(profile.projects ?? []).map((project) => (
            <article key={project.id} className="border rounded p-4 space-y-3">
              <label className="block">
                Project name
                <input
                  required
                  maxLength={120}
                  value={project.name}
                  onChange={(e) =>
                    projectChange(project.id, { name: e.target.value })
                  }
                  className="block w-full border rounded p-2"
                />
              </label>
              <label className="block">
                Locality (public)
                <input
                  required
                  maxLength={120}
                  value={project.locality}
                  onChange={(e) =>
                    projectChange(project.id, { locality: e.target.value })
                  }
                  className="block w-full border rounded p-2"
                />
              </label>
              <label className="block">
                Site address (private)
                <textarea
                  maxLength={500}
                  value={project.address ?? ""}
                  onChange={(e) =>
                    projectChange(project.id, { address: e.target.value })
                  }
                  className="block w-full border rounded p-2"
                />
              </label>
              <label className="block">
                Work description
                <textarea
                  maxLength={2000}
                  value={project.description}
                  onChange={(e) =>
                    projectChange(project.id, { description: e.target.value })
                  }
                  className="block w-full border rounded p-2"
                />
              </label>
              <label className="block">
                Site photos
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="block mt-2 max-w-full"
                  onChange={(e) => {
                    void photos(e.target.files, project.id);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {project.photos.map((url, i) => (
                  <div key={url + i}>
                    <Image
                      unoptimized
                      src={url}
                      alt={project.name + " photo " + (i + 1)}
                      width={320}
                      height={240}
                      className="h-32 w-full object-cover rounded"
                    />
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        projectChange(project.id, {
                          photos: project.photos.filter((_, n) => n !== i),
                        })
                      }
                    >
                      Remove photo
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="text-red-700"
                onClick={() => {
                  if (confirm("Remove this work site?"))
                    change({
                      ...profile,
                      projects: profile.projects?.filter(
                        (p) => p.id !== project.id,
                      ),
                    });
                }}
              >
                Remove site
              </button>
            </article>
          ))}
          <button
            type="button"
            disabled={(profile.projects ?? []).length >= 30}
            className="border rounded px-3 py-2"
            onClick={() =>
              change({
                ...profile,
                projects: [
                  ...(profile.projects ?? []),
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    locality: "",
                    address: "",
                    description: "",
                    photos: [],
                  },
                ],
              })
            }
          >
            Add work site
          </button>
        </section>
        <button type="submit" className="portal-button">
          Save profile
        </button>
        <a
          href={"https://www.matrizo.com/" + profile.kind + "s/" + profile.id}
          target="_blank"
          rel="noreferrer"
          className="ml-4 underline"
        >
          View public profile
        </a>
      </fieldset>
      {busy && <p role="status">Saving...</p>}
    </form>
  );
}
