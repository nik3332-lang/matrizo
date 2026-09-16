"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, businessDate, formatMoney } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
type Report = {
  date: string;
  entries: {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    active: boolean;
    amount: number;
    notes: string | null;
    updatedAt: string;
    commissionRatePercent: number;
  }[];
  summary: {
    totalSales: number;
    totalCommission: number;
    submitted: number;
    activeEmployees: number;
    missing: { id: string; name: string }[];
  };
};
export default function DailySalesPage() {
  const { user, loading } = useAuth();
  const [date, setDate] = useState(businessDate());
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (user?.role !== "admin" || !date) return;
    let live = true;
    api
      .get<Report>(`/admin/employees/sales?date=${date}`)
      .then((r) => {
        if (live) {
          setReport(r);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof ApiError ? e.message : "Could not load daily sales.",
          );
      });
    return () => {
      live = false;
    };
  }, [date, user, version]);
  if (!loading && user?.role !== "admin")
    return (
      <div className="portal-empty">
        Please{" "}
        <Link href="/login" className="text-brand-orange-700">
          sign in as an administrator
        </Link>{" "}
        to review sales.
      </div>
    );
  const current = report?.date === date ? report : null;
  const entries =
    current?.entries.filter((e) =>
      `${e.employeeName} ${e.employeeEmail}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];
  function exportCsv() {
    if (!current) return;
    const cell = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const rows = [
      ["Date", "Employee", "Email", "Sales INR", "Notes"],
      ...current.entries.map((e) => [
        date,
        e.employeeName,
        e.employeeEmail,
        e.amount,
        e.notes,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `matrizo-sales-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <div className="portal-heading">
        <div>
          <span className="portal-eyebrow">THE DAILY PICTURE</span>
          <h1>Every sale, accounted for.</h1>
          <p>
            Review the team’s daily entries, sales totals and outstanding
            reports. Dates follow India time.
          </p>
        </div>
        <button
          className="portal-button secondary"
          disabled={!current?.entries.length}
          onClick={exportCsv}
        >
          ↓ Export report
        </button>
      </div>
      <div className="portal-toolbar">
        <label>
          Sales date
          <input
            type="date"
            value={date}
            max={businessDate()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <button
          className="portal-button secondary"
          onClick={() => setDate(businessDate())}
        >
          Today
        </button>
        <button
          className="portal-button secondary"
          onClick={() => setVersion((v) => v + 1)}
        >
          ↻ Refresh
        </button>
        <input
          type="search"
          aria-label="Find employee in report"
          placeholder="Find an employee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && (
        <div role="alert" className="portal-message portal-error">
          {error}
        </div>
      )}
      <div className="portal-stats">
        <div className="portal-stat highlight">
          <small>Total daily sales</small>
          <strong>
            {current ? formatMoney(current.summary.totalSales) : "—"}
          </strong>
          <p>{date || "Choose a date"}</p>
        </div>
        <div className="portal-stat">
          <small>Reports submitted</small>
          <strong>
            {current
              ? `${current.summary.submitted} / ${current.summary.activeEmployees}`
              : "—"}
          </strong>
          <p>Current active employees</p>
        </div>
        <div className="portal-stat">
          <small>Daily commission</small>
          <strong>
            {current ? formatMoney(current.summary.totalCommission) : "—"}
          </strong>
          <p>Calculated at current rates</p>
        </div>
        <div className="portal-stat">
          <small>Awaiting an entry</small>
          <strong>{current ? current.summary.missing.length : "—"}</strong>
          <p>A zero-sales entry counts as submitted</p>
        </div>
      </div>
      <section className="portal-panel">
        <h2 className="portal-panel-title">
          Sales activity{" "}
          <span className="font-normal text-slate-400 text-xs ml-2">
            {date}
          </span>
        </h2>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Sales amount</th>
                <th>Notes</th>
                <th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.employeeName}</strong>
                    <small>
                      {e.employeeEmail}
                      {!e.active ? " · Removed employee" : ""}
                    </small>
                  </td>
                  <td className="money">{formatMoney(e.amount)}</td>
                  <td className="notes">{e.notes || "—"}</td>
                  <td>
                    {new Intl.DateTimeFormat("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    }).format(new Date(e.updatedAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!current && !error && (
          <div className="portal-empty">Loading daily sales…</div>
        )}
        {current && !entries.length && (
          <div className="portal-empty">
            <strong>
              {search ? "No matching employees." : "A fresh page for the day."}
            </strong>
            {search
              ? "Try another name or email."
              : "Employee sales entries will appear here as soon as they are saved."}
          </div>
        )}
      </section>
      {current && current.summary.missing.length > 0 && (
        <div className="portal-message">
          <strong>Not yet reported:</strong>{" "}
          {current.summary.missing.map((e) => e.name).join(", ")}.
        </div>
      )}
    </div>
  );
}
