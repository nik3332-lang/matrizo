"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, businessDate, formatMoney } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
type Summary = {
  employee: { name: string };
  commission: {
    monthSales: number;
    monthCommission: number;
    totalSales: number;
    commissionRatePercent: number;
  };
};
type Entry = { id: string; date: string; amount: number; notes: string | null };
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }
    let live = true;
    Promise.all([
      api.get<Summary>("/employees/me"),
      api.get<{ entries: Entry[] }>(
        `/employees/me/sales?month=${businessDate().slice(0, 7)}`,
      ),
    ])
      .then(([s, e]) => {
        if (live) {
          setData(s);
          setEntries(e.entries);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof ApiError ? e.message : "Could not load your overview.",
          );
      });
    return () => {
      live = false;
    };
  }, [user, loading, router, version]);
  const today = entries.find((e) => e.date === businessDate());
  return (
    <div>
      <div className="portal-heading">
        <div>
          <span className="portal-eyebrow">YOUR EVERYDAY OVERVIEW</span>
          <h1>Hello, {data?.employee.name?.split(" ")[0] ?? "there"}.</h1>
          <p>
            Here’s how your month is taking shape. Let’s make it a good one.
          </p>
        </div>
        <Link href="/sales" className="portal-button">
          + Log daily sales
        </Link>
      </div>
      {error && (
        <div className="portal-message portal-error" role="alert">
          {error}{" "}
          <button
            className="underline"
            onClick={() => setVersion((v) => v + 1)}
          >
            Retry
          </button>
        </div>
      )}
      <div className="portal-stats">
        <div className="portal-stat highlight">
          <small>Sales this month</small>
          <strong>
            {data ? formatMoney(data.commission.monthSales) : "—"}
          </strong>
          <p>{entries.length} days reported</p>
        </div>
        <div className="portal-stat">
          <small>Month’s commission</small>
          <strong>
            {data ? formatMoney(data.commission.monthCommission) : "—"}
          </strong>
          <p>At your current rate</p>
        </div>
        <div className="portal-stat">
          <small>Total sales</small>
          <strong>
            {data ? formatMoney(data.commission.totalSales) : "—"}
          </strong>
          <p>All your work, to date</p>
        </div>
        <div className="portal-stat">
          <small>Commission rate</small>
          <strong>
            {data ? `${data.commission.commissionRatePercent}%` : "—"}
          </strong>
          <p>Set by your administrator</p>
        </div>
      </div>
      <div className="sales-layout">
        <section className="portal-panel">
          <span className="portal-eyebrow">TODAY · {businessDate()}</span>
          <h2 className="text-2xl tracking-tight font-medium mt-3">
            {today ? "You’re up to date." : "A little update goes a long way."}
          </h2>
          <p className="sales-save-note">
            {today
              ? `You’ve recorded ${formatMoney(today.amount)} in sales today. You can update your total whenever you need.`
              : "Log today’s sales to keep your manager in the loop and your journal up to date."}
          </p>
          <Link href="/sales" className="portal-button">
            {today ? "Update today’s report" : "Log today’s sales"} →
          </Link>
        </section>
        <section className="portal-panel">
          <h2 className="portal-panel-title">Recent reports</h2>
          {entries.slice(0, 5).map((e) => (
            <div key={e.id} className="sales-row">
              <span>
                {e.date}
                <small>{e.notes || "Daily sales"}</small>
              </span>
              <strong>{formatMoney(e.amount)}</strong>
            </div>
          ))}
          {data && !entries.length && (
            <p className="portal-empty">No reports this month yet.</p>
          )}
          <Link
            href="/sales"
            className="text-xs text-brand-orange-700 inline-block mt-4"
          >
            Open your sales journal →
          </Link>
        </section>
      </div>
    </div>
  );
}
