"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { StoreAreas } from "@/components/StoreAreas";

type Store = {
  id: string; name: string; line1: string; line2: string | null;
  city: string; state: string; pincode: string; active: boolean;
};
const inputClass = "mt-1 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2";
const fields = [
  ["name", "Store name", 160], ["line1", "Address", 300],
  ["line2", "Address line 2", 300], ["city", "City", 100],
  ["state", "State", 100], ["pincode", "Store pincode", 6],
] as const;
const errorMessage = (e: unknown) => e instanceof ApiError ? e.message : "Could not complete the request. Please try again.";

export default function StoresPage() {
  const { user, loading } = useAuth();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (user?.role !== "admin") return;
    let current = true;
    api.get<{ stores: Store[] }>("/admin/stores").then(({ stores }) => {
      if (!current) return;
      setStores(stores);
      setSelected(stores.find((s) => s.active)?.id ?? stores[0]?.id ?? "");
      setError("");
    }).catch((e) => { if (current) setError(errorMessage(e)); });
    return () => { current = false; };
  }, [user?.role, attempt]);
  const store = stores?.find((s) => s.id === selected);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(fields.map(([name]) => [name, String(data.get(name) ?? "").trim()]));
    if (!creating && !store) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = creating
        ? await api.post<{ store: Store }>("/admin/stores", { ...values, active: true })
        : await api.patch<{ store: Store }>(`/admin/stores/${store!.id}`, values);
      setStores((old) => [...(old ?? []).filter((s) => s.id !== result.store.id), result.store]);
      setSelected(result.store.id); setCreating(false); setEditing(false);
      setNotice("Store saved.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function toggleStore() {
    if (!store) return;
    if (store.active && !window.confirm(`Remove ${store.name} from active stores? New orders will stop being assigned here. Existing orders, staff, stock and coverage will be retained. You can reactivate it later.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { store: updated } = await api.patch<{ store: Store }>(`/admin/stores/${store.id}`, { active: !store.active });
      setStores((old) => old?.map((s) => s.id === updated.id ? updated : s) ?? []);
      setNotice(updated.active ? "Store reactivated." : "Store removed from active stores. Existing orders are retained.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (loading) return <p>Loading...</p>;
  if (user?.role !== "admin") return <p role="alert">Administrator access required.</p>;
  return <div className="max-w-4xl">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 className="text-2xl font-bold">Stores</h1>
      <button disabled={busy || creating} className="portal-button" onClick={() => { setCreating(true); setEditing(false); setError(""); setNotice(""); }}>Add store</button>
    </div>
    {error && <div role="alert" className="portal-message portal-error">{error}{!stores && <button className="underline ml-3" onClick={() => setAttempt((n) => n + 1)}>Retry</button>}</div>}
    {notice && <p role="status" className="portal-message">{notice}</p>}
    {!stores && !error && <p>Loading stores...</p>}
    {!creating && !!stores?.length && <label className="block mb-6">Store
      <select disabled={busy} className={inputClass} value={selected} onChange={(e) => { setSelected(e.target.value); setEditing(false); setError(""); setNotice(""); }}>
        {stores.map((s) => <option value={s.id} key={s.id}>{s.name}{s.active ? "" : " (inactive)"}</option>)}
      </select>
    </label>}
    {stores?.length === 0 && !creating && <p>No stores yet.</p>}
    {(creating || editing) && <form key={creating ? "new" : store?.id} onSubmit={save} className="border-y border-stone-200 py-5 mb-6">
      <fieldset disabled={busy}>
        <legend className="text-lg font-semibold mb-4">{creating ? "Add store" : "Edit store"}</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map(([name, label, max]) => <label key={name}>{label}<input name={name} required={name !== "line2"} maxLength={max} defaultValue={creating ? "" : store?.[name] ?? ""} pattern={name === "pincode" ? "[1-9][0-9]{5}" : undefined} inputMode={name === "pincode" ? "numeric" : undefined} className={inputClass} /></label>)}
        </div>
        <div className="flex gap-3 mt-5"><button className="portal-button" type="submit">Save store</button><button className="portal-button secondary" type="button" onClick={() => { setCreating(false); setEditing(false); }}>Cancel</button></div>
      </fieldset>
    </form>}
    {store && !creating && <>
      {!editing && <section className="border-b border-stone-200 pb-6 mb-6">
        <h2 className="text-lg font-semibold break-words">{store.name}</h2>
        <p className="mt-1 text-sm font-medium">{store.active ? "Active" : "Inactive"}</p>
        <p className="mt-2 break-words">{[store.line1, store.line2, store.city, store.state, store.pincode].filter(Boolean).join(", ")}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <button disabled={busy} className="portal-button secondary" onClick={() => setEditing(true)}>Edit store</button>
          <Link className="portal-button secondary" href={`/?storeId=${encodeURIComponent(store.id)}`}>View orders</Link>
          <Link className="portal-button secondary" href="/staff">Store staff</Link>
          <button disabled={busy} className={`portal-button ${store.active ? "danger" : "secondary"}`} onClick={toggleStore}>{store.active ? "Remove store" : "Reactivate store"}</button>
        </div>
      </section>}
      <h2 className="text-lg font-semibold mb-4">Covered pincodes</h2>
      <StoreAreas key={store.id} store={store} />
    </>}
  </div>;
}
