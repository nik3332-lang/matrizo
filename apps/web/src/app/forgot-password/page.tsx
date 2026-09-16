"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@matrizo/shared";
import { authApi as api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";

type Challenge = {
  challengeId: string;
  expiresIn: number;
  resendAfter: number;
  message: string;
};

function RecoveryForm() {
  const params = useSearchParams();
  const { logout } = useAuth();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const next = params.get("next");
  const loginHref = `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  useEffect(() => {
    let active = true;
    api
      .get<{ passwordReset: boolean }>("/auth/options")
      .then((result) => {
        if (active) setAvailable(result.passwordReset);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    setBusy(true);
    setError("");
    try {
      const result = await api.post<Challenge>(
        "/auth/password-reset/email/request",
        {
          email,
        },
      );
      setChallenge(result);
      setCooldown(result.resendAfter);
      setCode("");
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : "We couldn’t request a code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge) {
      await requestCode();
      return;
    }
    if (password !== confirm) {
      setError("Your passwords don’t match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/password-reset/email/confirm", {
        challengeId: challenge.challengeId,
        code,
        password,
      });
      logout();
      setDone(true);
      setPassword("");
      setConfirm("");
      setCode("");
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : "We couldn’t reset your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-story">
        <span className="eyebrow text-sky-200">A FRESH START</span>
        <h1>
          Let’s get you
          <br />
          back home.
        </h1>
        <p>
          Your projects, saved addresses and orders are right where you left
          them. Recover your account with your registered email address.
        </p>
        <div className="hero-note">
          <Icon name="package" className="h-5 w-5" />
          One account. Every project.
        </div>
      </div>
      <div className="auth-form">
        <h2>
          {done
            ? "You’re all set."
            : challenge
              ? "Check your inbox."
              : "Forgot your password?"}
        </h2>
        <p>
          {done
            ? "Your password has been updated. Sign in again on each device with your new password."
            : challenge
              ? challenge.message
              : "We’ll help you set a new password using a code sent by email."}
        </p>
        {done ? (
          <Link href={loginHref} className="button-primary">
            Back to sign in <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <>
            {available === null ? (
              <p role="status">Checking recovery availability…</p>
            ) : available === false ? (
              <div className="auth-notice" role="status">
                Email recovery is temporarily unavailable. Please try again
                later.
              </div>
            ) : (
              <form onSubmit={submit}>
                {!challenge ? (
                  <label>
                    Registered email address
                    <input
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      maxLength={254}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </label>
                ) : (
                  <>
                    <p className="auth-notice" role="status">
                      Requested for {email}. Use the latest code within{" "}
                      {Math.round(challenge.expiresIn / 60)} minutes.
                    </p>
                    <label>
                      Six-digit code
                      <input
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        minLength={6}
                        maxLength={6}
                        placeholder="000000"
                        value={code}
                        onChange={(event) =>
                          setCode(event.target.value.replace(/\D/g, ""))
                        }
                        required
                      />
                    </label>
                    <label>
                      New password
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={10}
                        maxLength={128}
                        placeholder="At least 10 characters"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Confirm new password
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={10}
                        maxLength={128}
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                        required
                      />
                    </label>
                  </>
                )}
                {error && (
                  <p className="text-sm text-danger mb-3" role="alert">
                    {error}
                  </p>
                )}
                <button className="button-primary" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : challenge
                      ? "Reset password"
                      : "Send recovery code"}
                  <span aria-hidden="true">→</span>
                </button>
                {challenge && (
                  <div className="auth-recovery-actions">
                    <button
                      type="button"
                      disabled={busy || cooldown > 0}
                      onClick={requestCode}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setChallenge(null);
                        setCode("");
                        setPassword("");
                        setConfirm("");
                        setError("");
                      }}
                    >
                      Change email
                    </button>
                  </div>
                )}
              </form>
            )}
            <Link href={loginHref} className="auth-toggle">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<p className="empty-state">Loading recovery…</p>}>
      <RecoveryForm />
    </Suspense>
  );
}
