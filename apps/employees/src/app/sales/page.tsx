"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, businessDate, formatMoney } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
type Entry = {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
  updatedAt: string;
};
function SalesForm({
  date,
  entry,
  onSaved,
}: {
  date: string;
  entry?: Entry;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.put(`/employees/me/sales/${date}`, {
        amount: Number(amount),
        notes,
      });
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Your entry could not be saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="portal-form">
      <label className="full">
        Total sales for {date} (₹)
        <input
          className="sales-form-amount"
          type="number"
          min={0}
          max={100000000}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
          autoFocus
        />
      </label>
      <label className="full">
        A note for your manager <span className="font-normal">(optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key orders, customer follow-ups or anything worth sharing…"
          rows={4}
          maxLength={2000}
        />
      </label>
      <div className="full">
        <p className="sales-save-note">
          {entry
            ? "You’re updating this day’s existing report. Saving replaces the daily total."
            : "Enter your total for the day, including zero if no sales were made."}{" "}
          Your manager can review it as soon as you save.
        </p>
        {error && (
          <p role="alert" className="portal-message portal-error">
            {error}
          </p>
        )}
        <button className="portal-button w-full" disabled={busy}>
          {busy
            ? "Saving your report…"
            : entry
              ? "Update daily report"
              : "Save daily report"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
export default function SalesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [date, setDate] = useState(businessDate());
  const [month, setMonth] = useState(businessDate().slice(0, 7));
  const [data, setData] = useState<{ month: string; entries: Entry[] } | null>(
    null,
  );
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "sales_employee") {
      router.replace("/admin");
      return;
    }
    let live = true;
    api
      .get<{ entries: Entry[] }>(`/employees/me/sales?month=${month}`)
      .then((r) => {
        if (live) {
          setData({ month, entries: r.entries });
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof ApiError
              ? e.message
              : "Could not load your sales entries.",
          );
      });
    return () => {
      live = false;
    };
  }, [user, loading, router, month, version]);
  const entries = data?.month === month ? data.entries : null;
  const entry = entries?.find((e) => e.date === date);
  const total = entries?.reduce((s, e) => s + e.amount, 0) ?? 0;
  function pickDate(value: string) {
    if (!value) return;
    setDate(value);
    setMonth(value.slice(0, 7));
    setSaved("");
  }
  return (
    <div>
      <div className="portal-heading">
        <div>
          <span className="portal-eyebrow">MAKE TODAY COUNT</span>
          <h1>Your daily sales, sorted.</h1>
          <p>
            A simple record of the work you do. One report per day, always up to
            date.
          </p>
        </div>
        <span className="status-pill">India standard time</span>
      </div>
      {error && (
        <div className="portal-message portal-error" role="alert">
          {error}{" "}
          <button
            className="underline"
            onClick={() => setVersion((v) => v + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {saved && (
        <div className="portal-message" role="status">
          ✓ {saved}
        </div>
      )}
      <div className="sales-layout">
        <section className="portal-panel">
          <div className="portal-toolbar">
            <h2 className="portal-panel-title mb-0 mr-auto">
              {entry ? "Edit daily report" : "Log your sales"}
            </h2>
            <input
              aria-label="Sales date"
              type="date"
              value={date}
              max={businessDate()}
              onChange={(e) => pickDate(e.target.value)}
              required
            />
          </div>
          {entries ? (
            <SalesForm
              key={`${date}-${entry?.updatedAt ?? "new"}-${version}`}
              date={date}
              entry={entry}
              onSaved={() => {
                setSaved(
                  `Your report for ${date} is saved and visible to your manager.`,
                );
                setVersion((v) => v + 1);
              }}
            />
          ) : (
            <div className="portal-empty">Loading your report…</div>
          )}
        </section>
        <section className="portal-panel">
          <div className="portal-toolbar">
            <h2 className="portal-panel-title mb-0 mr-auto">
              Your sales journal
            </h2>
            <input
              type="month"
              aria-label="Journal month"
              value={month}
              max={businessDate().slice(0, 7)}
              onChange={(e) => {
                if (e.target.value)
                  pickDate(
                    e.target.value === businessDate().slice(0, 7)
                      ? businessDate()
                      : `${e.target.value}-01`,
                  );
              }}
            />
          </div>
          <div className="portal-stat highlight mb-3">
            <small>Sales in {month}</small>
            <strong>{entries ? formatMoney(total) : "—"}</strong>
            <p>{entries?.length ?? 0} daily reports</p>
          </div>
          {entries?.map((item) => (
            <button
              className="sales-row"
              key={item.id}
              onClick={() => pickDate(item.date)}
            >
              <span>
                {new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "short",
                  weekday: "short",
                  timeZone: "UTC",
                }).format(new Date(`${item.date}T12:00:00Z`))}
                <small>{item.notes || "Daily sales report"}</small>
              </span>
              <strong>
                {formatMoney(item.amount)}{" "}
                <span className="text-slate-300 ml-2">↗</span>
              </strong>
            </button>
          ))}
          {entries && !entries.length && (
            <div className="portal-empty">
              <strong>Your first entry starts here.</strong>Every saved report
              becomes part of your sales journal.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
