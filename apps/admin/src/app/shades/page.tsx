"use client";
import { useEffect, useState } from "react";
import { type Shade, shadeRgb } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
const empty = {
  family: "",
  name: "",
  hex: "#ffffff",
  imageUrl: "",
  active: true,
  sortOrder: 0,
};
export default function ShadesPage() {
  const { user } = useAuth();
  const [shades, setShades] = useState<Shade[]>([]);
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setShades((await api.get<{ shades: Shade[] }>("/admin/shades")).shades);
    } catch {
      setError("Could not load shades.");
    }
  }
  useEffect(() => {
    if (user?.role !== "admin") return;
    let live = true;
    api
      .get<{ shades: Shade[] }>("/admin/shades")
      .then((r) => {
        if (live) setShades(r.shades);
      })
      .catch(() => {
        if (live) setError("Could not load shades.");
      });
    return () => {
      live = false;
    };
  }, [user]);
  if (user?.role !== "admin") return <p>Administrator sign-in required.</p>;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { ...draft, imageUrl: draft.imageUrl || null };
      if (editing) await api.patch(`/admin/shades/${editing}`, body);
      else await api.post("/admin/shades", body);
      setDraft(empty);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save shade.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Paint colours</h1>
      {error && (
        <p role="alert">
          {error} <button onClick={load}>Retry</button>
        </p>
      )}
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4 border-b pb-5">
        <label>
          Family
          <input
            required
            className="block border p-2 w-full"
            value={draft.family}
            onChange={(e) => setDraft({ ...draft, family: e.target.value })}
          />
        </label>
        <label>
          Shade name
          <input
            required
            className="block border p-2 w-full"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          Colour
          <input
            type="color"
            className="block"
            value={draft.hex}
            onChange={(e) => setDraft({ ...draft, hex: e.target.value })}
          />
          {draft.hex} · RGB {shadeRgb(draft.hex)}
        </label>
        <label>
          Image URL
          <input
            type="url"
            className="block border p-2 w-full"
            value={draft.imageUrl}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
          />
        </label>
        <label>
          Sort order
          <input
            type="number"
            min={0}
            className="block border p-2"
            value={draft.sortOrder}
            onChange={(e) =>
              setDraft({ ...draft, sortOrder: Number(e.target.value) })
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />{" "}
          Available
        </label>
        <button disabled={busy} className="border rounded p-2">
          {busy ? "Saving..." : editing ? "Save changes" : "Add shade"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDraft(empty);
            }}
          >
            Cancel
          </button>
        )}
      </form>
      <div className="grid sm:grid-cols-3 gap-4">
        {shades.map((shade) => (
          <article key={shade.id} className="border rounded p-3 space-y-2">
            <div
              style={{
                height: 70,
                backgroundColor: shade.hex,
                border: "1px solid #aaa",
              }}
            />
            <h2>{shade.name}</h2>
            <p>
              {shade.family} · {shade.hex}
              {!shade.active && " · Hidden"}
            </p>
            <button
              onClick={() => {
                setEditing(shade.id);
                setDraft({
                  family: shade.family,
                  name: shade.name,
                  hex: shade.hex,
                  imageUrl: shade.imageUrl ?? "",
                  active: shade.active ?? true,
                  sortOrder: shade.sortOrder ?? 0,
                });
              }}
            >
              Edit
            </button>
            <button
              className="ml-4"
              disabled={busy || !shade.active}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.delete(`/admin/shades/${shade.id}`);
                  await load();
                } catch {
                  setError("Could not hide shade.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Hide
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
