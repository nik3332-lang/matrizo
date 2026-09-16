"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ApiError } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
export default function DeleteAccount() {
  const { user, loading, logout } = useAuth();
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{ message: string }>("/account/deletion", {
        password,
        confirmation,
      });
      setDone(result.message);
      setPassword("");
      setConfirmation("");
      logout();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "We couldn’t complete the request. Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="policy-page">
      <p className="eyebrow">You’re in control</p>
      <h1>{done ? "Your account is closed" : "Delete your Matrizo account"}</h1>
      {done ? (
        <p role="status">{done}</p>
      ) : (
        <>
          <p>
            You can delete your account here without reinstalling the app.
            Deletion closes access on every device and stops order
            notifications.
          </p>
          <p>
            Your name, email, mobile number, password and addresses are removed.
            If you have open orders, details needed to finish them are kept
            until delivery or cancellation, then removed automatically. Deletion
            does not cancel an open order.
          </p>
          <p>
            Order items, amounts and accounting records remain without your
            contact details. You will lose access to order history and any
            wallet balance. Save the records you need and resolve open order or
            balance questions first. This action cannot be undone.
          </p>
          {loading ? (
            <p>Loading your account…</p>
          ) : !user ? (
            <p>
              <Link href="/login?next=%2Fdelete-account">
                Sign in to delete your account
              </Link>
              . If you cannot sign in,{" "}
              <Link href="/forgot-password">reset your password</Link> when
              recovery is available, or visit{" "}
              <Link href="/support">support</Link>.
            </p>
          ) : (
            <form onSubmit={submit} className="policy-form">
              <label>
                Current password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label>
                Type DELETE to confirm
                <input
                  required
                  autoComplete="off"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  maxLength={6}
                />
              </label>
              {error && <p role="alert">{error}</p>}
              <button
                type="submit"
                className="button-primary"
                disabled={busy || confirmation !== "DELETE" || !password}
              >
                {busy ? "Deleting…" : "Permanently delete account"}
              </button>
            </form>
          )}
        </>
      )}
      <p>
        <Link href="/privacy">Read our privacy policy</Link> ·{" "}
        <Link href="/account">Back to my account</Link>
      </p>
    </article>
  );
}
