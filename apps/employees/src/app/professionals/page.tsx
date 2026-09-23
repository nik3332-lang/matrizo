"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { Professional } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
type Draft = Omit<Professional, "id">;
const fresh = (kind: Professional["kind"]): Draft => ({
  kind,
  name: "",
  yearsExperience: 0,
  photoUrl: "",
  workPhotos: [],
});

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
  const { user, loading: authLoading } = useAuth();
  const [kind, setKind] = useState<Professional["kind"]>("painter");
  const [profiles, setProfiles] = useState<Professional[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const allowed = user?.role === "admin" || user?.role === "sales_employee";
  async function load() {
    setLoading(true);
    setError("");
    try {
      setProfiles(
        (
          await api.get<{ professionals: Professional[] }>(
            `/professionals?kind=${kind}`,
          )
        ).professionals,
      );
    } catch {
      setError("Could not load profiles.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!allowed) return;
    let live = true;
    api
      .get<{ professionals: Professional[] }>(`/professionals?kind=${kind}`)
      .then((r) => {
        if (live) {
          setProfiles(r.professionals);
          setError("");
        }
      })
      .catch(() => {
        if (live) setError("Could not load profiles.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [kind, allowed]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      if (editing) await api.patch(`/team/professionals/${editing}`, draft);
      else await api.post("/team/professionals", draft);
      setDraft(null);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }
  async function photos(files: FileList | null, gallery: boolean) {
    if (!files?.length || !draft) return;
    if (gallery && draft.workPhotos.length + files.length > 20) {
      setError("A profile can have up to 20 work photos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const url = await upload(file);
        setDraft((d) =>
          d
            ? gallery
              ? { ...d, workPhotos: [...d.workPhotos, url] }
              : { ...d, photoUrl: url }
            : d,
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Photo upload failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (authLoading) return <p>Loading...</p>;
  if (!allowed) return <p>Employee or administrator sign-in required.</p>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Professional profiles</h1>
      <div role="tablist" aria-label="Profession" className="flex gap-4">
        {(["painter", "plumber"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={kind === value}
            disabled={busy || !!draft}
            className="border-b-2 p-2 capitalize"
            onClick={() => setKind(value)}
          >
            {value}s
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
          {!draft && (
            <button onClick={load} className="ml-3 underline">
              Retry
            </button>
          )}
        </p>
      )}
      {!draft && (
        <button
          className="border rounded p-3"
          onClick={() => {
            setDraft(fresh(kind));
            setEditing(null);
          }}
        >
          Add {kind}
        </button>
      )}
      {draft && (
        <form onSubmit={save} className="space-y-4 border-b pb-6">
          <fieldset disabled={busy} className="space-y-4">
            <h2 className="text-lg font-semibold">
              {editing ? "Edit" : "Add"} {kind}
            </h2>
            <label className="block">
              Name
              <input
                required
                maxLength={120}
                className="block w-full border rounded p-2"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="block">
              Years of experience
              <input
                type="number"
                required
                min={0}
                max={80}
                step={1}
                className="block border rounded p-2"
                value={draft.yearsExperience}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    yearsExperience: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block">
              Profile photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block mt-2"
                onChange={(e) => {
                  void photos(e.target.files, false);
                  e.target.value = "";
                }}
              />
            </label>
            {draft.photoUrl && (
              <Image
                unoptimized
                src={draft.photoUrl}
                alt="Profile preview"
                width={160}
                height={160}
                className="object-cover rounded"
              />
            )}
            <label className="block">
              Photos of work
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="block mt-2"
                onChange={(e) => {
                  void photos(e.target.files, true);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {draft.workPhotos.map((url, index) => (
                <div key={`${url}-${index}`}>
                  <Image
                    unoptimized
                    width={320}
                    height={240}
                    src={url}
                    alt={`Work photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        workPhotos: draft.workPhotos.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    Remove photo
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!draft.photoUrl}
                className="border rounded p-3 disabled:opacity-50"
              >
                Save profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setEditing(null);
                }}
              >
                Cancel
              </button>
            </div>
          </fieldset>
          {busy && <p role="status">Saving...</p>}
        </form>
      )}
      {loading ? (
        <p>Loading profiles...</p>
      ) : (
        !profiles.length && <p>No {kind}s added yet.</p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <article key={profile.id} className="border rounded p-4 space-y-3">
            <Image
              unoptimized
              width={640}
              height={480}
              src={profile.photoUrl}
              alt={profile.name}
              className="w-full h-48 object-cover rounded"
            />
            <h2 className="font-semibold">{profile.name}</h2>
            <p>
              {profile.yearsExperience} years of experience ·{" "}
              {profile.workPhotos.length} work photos
            </p>
            <button
              disabled={busy || !!draft}
              onClick={() => {
                setDraft({
                  kind: profile.kind,
                  name: profile.name,
                  yearsExperience: profile.yearsExperience,
                  photoUrl: profile.photoUrl,
                  workPhotos: profile.workPhotos,
                });
                setEditing(profile.id);
              }}
            >
              Edit
            </button>
            <button
              className="ml-4 text-red-700"
              disabled={busy || !!draft}
              onClick={async () => {
                if (!confirm(`Remove ${profile.name}'s public profile?`))
                  return;
                setBusy(true);
                try {
                  await api.delete(`/team/professionals/${profile.id}`);
                  await load();
                } catch {
                  setError("Could not remove profile.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
