"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Store = { id: string; name: string; active: boolean };
type Area = { pincode: string; etaMinutes: number };
const inputClass = "w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2";
const message = (error: unknown) => error instanceof ApiError ? error.message : "Could not complete the request. Please try again.";

export default function DeliveryAreasPage() {
  const { user, loading } = useAuth();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [storeId, setStoreId] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (user?.role !== "admin") return;
    let current = true;
    api.get<{ stores: Store[] }>("/admin/stores").then(({ stores }) => {
      if (!current) return;
      setStores(stores);
      setStoreId(stores.find((s) => s.active)?.id ?? stores[0]?.id ?? "");
      setError("");
    }).catch((e) => { if (current) setError(message(e)); });
    return () => { current = false; };
  }, [user?.role, attempt]);

  if (loading) return <p>Loading...</p>;
  if (user?.role !== "admin") return <p role="alert">Administrator access required.</p>;
  const store = stores?.find((s) => s.id === storeId);
  return <div className="max-w-4xl">
    <h1 className="text-2xl font-bold mb-6">Delivery areas</h1>
    {error && <div role="alert" className="portal-message portal-error">{error} <button className="underline" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>}
    {!stores && !error && <p>Loading stores...</p>}
    {stores?.length === 0 && <p>No stores found.</p>}
    {!!stores?.length && <label className="block max-w-lg mb-6">Store
      <select className={`${inputClass} mt-1`} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
        {stores.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inactive)"}</option>)}
      </select>
    </label>}
    {store && <StoreAreas key={store.id} store={store} />}
  </div>;
}

function StoreAreas({ store }: { store: Store }) {
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const path = `/admin/stores/${encodeURIComponent(store.id)}/pincodes`;
  useEffect(() => {
    let current = true;
    api.get<{ pincodes: Area[] }>(path).then(({ pincodes }) => {
      if (current) { setAreas(pincodes); setError(""); }
    }).catch((e) => { if (current) setError(message(e)); });
    return () => { current = false; };
  }, [path, attempt]);

  async function save(event: FormEvent<HTMLFormElement>, existing?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const pincode = existing ?? String(data.get("pincode")).trim();
    const etaMinutes = Number(data.get("etaMinutes"));
    setError(""); setNotice("");
    if (!/^[1-9]\d{5}$/.test(pincode) || !Number.isInteger(etaMinutes) || etaMinutes < 1 || etaMinutes > 10080) {
      setError("Enter a valid 6-digit pincode and delivery time from 1 to 10080 minutes."); return;
    }
    if (!existing && areas?.some((area) => area.pincode === pincode)) {
      setError("This pincode is already listed. Edit its delivery time below."); return;
    }
    setBusy(true);
    try {
      await api.post(path, { pincode, etaMinutes });
      setAreas((old) => [...(old ?? []).filter((a) => a.pincode !== pincode), { pincode, etaMinutes }]);
      setNotice(`${pincode} saved.`);
      if (!existing) form.reset();
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  async function remove(pincode: string) {
    if (!window.confirm(`Remove ${pincode} from ${store.name}? New orders to this area may no longer be accepted.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.delete(`${path}/${pincode}`);
      setAreas((old) => old?.filter((a) => a.pincode !== pincode) ?? []);
      setNotice(`${pincode} removed.`);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  const filtered = areas?.filter((a) => a.pincode.includes(search.trim())).sort((a, b) => a.pincode.localeCompare(b.pincode));
  return <section>
    {!store.active && <p className="portal-message">This store is inactive. Its delivery areas are not accepting orders.</p>}
    {error && <div role="alert" className="portal-message portal-error">{error}{!areas && <button className="underline ml-3" onClick={() => setAttempt((n) => n + 1)}>Retry</button>}</div>}
    {notice && <p role="status" className="portal-message">{notice}</p>}
    {!areas && !error && <p>Loading delivery areas...</p>}
    {areas && <>
      <form onSubmit={(e) => save(e)} className="mb-8">
        <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
          <legend className="font-semibold mb-3">Add pincode</legend>
          <label className="flex-1 min-w-40">Pincode<input name="pincode" aria-label="New pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} required className={`${inputClass} mt-1`} /></label>
          <label className="flex-1 min-w-40">Delivery time (minutes)<input name="etaMinutes" aria-label="New delivery time (minutes)" type="number" min={1} max={10080} step={1} defaultValue={60} required className={`${inputClass} mt-1`} /></label>
          <button className="portal-button" type="submit">Add pincode</button>
        </fieldset>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold">Pincodes ({areas.length})</h2>
        <input type="search" aria-label="Search pincodes" placeholder="Search pincodes" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} sm:max-w-60`} />
      </div>
      {!areas.length && <p>No delivery areas configured.</p>}
      {!!areas.length && !filtered?.length && <p>No matching pincodes.</p>}
      <div className="divide-y divide-stone-200">
        {filtered?.map((area) => <form key={area.pincode} onSubmit={(e) => save(e, area.pincode)} className="py-4">
          <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
            <legend className="font-semibold mb-2">{area.pincode}</legend>
            <label className="flex-1 min-w-36">Delivery time (minutes)<input key={area.etaMinutes} name="etaMinutes" aria-label={`Delivery time for ${area.pincode}`} type="number" min={1} max={10080} step={1} defaultValue={area.etaMinutes} required className={`${inputClass} mt-1`} /></label>
            <button type="submit" className="portal-button secondary">Save</button>
            <button type="button" aria-label={`Remove ${area.pincode}`} className="portal-button danger" onClick={() => remove(area.pincode)}>Remove</button>
          </fieldset>
        </form>)}
      </div>
    </>}
  </section>;
}
