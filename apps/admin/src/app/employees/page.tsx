"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, formatMoney } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  commission: {
    commissionRatePercent: number;
    monthSales: number;
    monthCommission: number;
    totalSales: number;
  };
};
type Form = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  commissionRatePercent: string;
};
const empty: Form = {
  name: "",
  email: "",
  phone: "",
  password: "",
  commissionRatePercent: "5",
};
export default function EmployeesPage() {
  const { user, loading } = useAuth();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [search, setSearch] = useState("");
  const [inactive, setInactive] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (user?.role !== "admin") return;
    let live = true;
    api
      .get<{ employees: Employee[] }>("/admin/employees")
      .then((r) => {
        if (live) {
          setEmployees(r.employees);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof ApiError ? e.message : "Could not load employees.",
          );
      });
    return () => {
      live = false;
    };
  }, [user, version]);
  if (!loading && user?.role !== "admin")
    return (
      <div className="portal-empty">
        Please{" "}
        <Link href="/login" className="text-brand-orange-700">
          sign in as an administrator
        </Link>{" "}
        to manage employees.
      </div>
    );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        commissionRatePercent: Number(form.commissionRatePercent),
        ...(form.password ? { password: form.password } : {}),
      };
      if (form.id) await api.patch(`/admin/employees/${form.id}`, payload);
      else await api.post("/admin/employees", payload);
      setNotice(
        form.id
          ? "Employee details updated."
          : "Employee created. They can now sign in to the employee portal.",
      );
      setForm(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not save the employee.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(emp: Employee) {
    if (
      !window.confirm(
        `Remove ${emp.name} from the team? Their sign-in access will stop immediately. Sales history will be retained, and you can restore access later.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`/admin/employees/${emp.id}`);
      setNotice(
        `${emp.name} has been removed. Their sales history is retained.`,
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not remove employee.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function restore(emp: Employee) {
    setBusy(true);
    try {
      await api.patch(`/admin/employees/${emp.id}`, { active: true });
      setVersion((v) => v + 1);
      setNotice(`${emp.name} can sign in again.`);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not restore employee.",
      );
    } finally {
      setBusy(false);
    }
  }
  const active = employees?.filter((e) => e.active) ?? [];
  const filtered =
    employees?.filter(
      (e) =>
        (inactive || e.active) &&
        `${e.name} ${e.email}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  return (
    <div>
      <div className="portal-heading">
        <div>
          <span className="portal-eyebrow">PEOPLE & PERFORMANCE</span>
          <h1>Your sales team</h1>
          <p>Manage employee access and keep every day’s work connected.</p>
        </div>
        <button
          className="portal-button"
          onClick={() => {
            setForm({ ...empty });
            setError("");
            setNotice("");
          }}
        >
          + Add employee
        </button>
      </div>
      <div className="portal-stats">
        <div className="portal-stat">
          <small>Active employees</small>
          <strong>{employees ? active.length : "—"}</strong>
          <p>Ready to log daily sales</p>
        </div>
        <div className="portal-stat highlight">
          <small>Team sales this month</small>
          <strong>
            {employees
              ? formatMoney(
                  employees.reduce((s, e) => s + e.commission.monthSales, 0),
                )
              : "—"}
          </strong>
          <p>Includes retained employee history</p>
        </div>
        <div className="portal-stat">
          <small>Commission this month</small>
          <strong>
            {employees
              ? formatMoney(
                  employees.reduce(
                    (s, e) => s + e.commission.monthCommission,
                    0,
                  ),
                )
              : "—"}
          </strong>
          <p>At each employee’s current rate</p>
        </div>
        <div className="portal-stat">
          <small>Daily reporting</small>
          <strong>All together.</strong>
          <Link href="/sales" className="text-xs text-brand-orange-700">
            Review today’s sales →
          </Link>
        </div>
      </div>
      {error && (
        <div className="portal-message portal-error" role="alert">
          {error}{" "}
          {!employees && (
            <button
              onClick={() => setVersion((v) => v + 1)}
              className="underline ml-3"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {notice && (
        <div className="portal-message" role="status">
          {notice}
        </div>
      )}
      {form && (
        <section
          className="portal-panel mb-6"
          aria-label={form.id ? "Edit employee" : "Add employee"}
        >
          <h2 className="portal-panel-title">
            {form.id ? "Edit employee" : "Welcome someone to the team"}
          </h2>
          <form className="portal-form" onSubmit={save}>
            <label>
              Full name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={100}
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!form.id}
                required
              />
            </label>
            <label>
              Phone number
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
                maxLength={20}
              />
            </label>
            <label>
              Commission rate (%)
              <input
                type="number"
                value={form.commissionRatePercent}
                onChange={(e) =>
                  setForm({ ...form, commissionRatePercent: e.target.value })
                }
                min={0}
                max={100}
                step="0.01"
                required
              />
            </label>
            <label className="full">
              {form.id
                ? "New password (leave blank to keep current password)"
                : "Temporary password"}
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required={!form.id}
              />
            </label>
            <div className="full form-actions">
              <button
                type="button"
                className="portal-button secondary"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button className="portal-button" disabled={busy}>
                {busy
                  ? "Saving…"
                  : form.id
                    ? "Save changes"
                    : "Create employee"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="portal-panel">
        <div className="portal-toolbar">
          <input
            type="search"
            aria-label="Search employees"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={inactive}
              onChange={(e) => setInactive(e.target.checked)}
            />
            Include removed employees
          </label>
        </div>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Rate</th>
                <th>Month’s sales</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <strong>{emp.name}</strong>
                    <small>{emp.email}</small>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${emp.active ? "" : "inactive"}`}
                    >
                      {emp.active ? "Active" : "Removed"}
                    </span>
                  </td>
                  <td>{emp.commission.commissionRatePercent}%</td>
                  <td className="money">
                    {formatMoney(emp.commission.monthSales)}
                  </td>
                  <td>
                    <button
                      className="text-brand-orange-700 mr-4"
                      onClick={() => {
                        setForm({
                          id: emp.id,
                          name: emp.name,
                          email: emp.email,
                          phone: emp.phone ?? "",
                          password: "",
                          commissionRatePercent: String(
                            emp.commission.commissionRatePercent,
                          ),
                        });
                        setError("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                    {emp.active ? (
                      <button
                        disabled={busy}
                        className="text-rose-600"
                        onClick={() => remove(emp)}
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        className="text-brand-orange-700"
                        onClick={() => restore(emp)}
                      >
                        Restore access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!employees && !error && (
          <p className="portal-empty">Loading the team…</p>
        )}
        {employees && !filtered.length && (
          <div className="portal-empty">
            <strong>
              {employees.length
                ? "No matching employees."
                : "Your team starts here."}
            </strong>
            {employees.length
              ? "Try a different search or include removed employees."
              : "Add your first employee so they can start logging daily sales."}
          </div>
        )}
      </section>
    </div>
  );
}
