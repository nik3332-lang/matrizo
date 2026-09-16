"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@matrizo/shared";
import { api, setRefreshToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    role: "customer";
    phone: string | null;
    email: string | null;
    name: string | null;
  };
};
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.post<LoginResponse>(
        signup ? "/auth/customer-register" : "/auth/customer-login",
        { email, name, phone, password },
      );
      setRefreshToken(result.refreshToken);
      login(result.accessToken, result.user);
      const next = params.get("next");
      router.push(
        next &&
          next.startsWith("/") &&
          !next.startsWith("//") &&
          !next.includes("\\")
          ? next
          : "/",
      );
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "We couldn’t sign you in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <span className="eyebrow text-sky-200">MAKE YOURSELF AT HOME</span>
        <h1>
          Your next great
          <br />
          space starts here.
        </h1>
        <p>
          Save your address, build your basket and follow every order. A little
          less effort. A little more Matrizo.
        </p>
        <div className="hero-note">
          <Icon name="package" className="h-5 w-5" />
          One account. Every project.
        </div>
      </div>
      <div className="auth-form">
        <h2>{signup ? "Welcome to Matrizo." : "Good to see you again."}</h2>
        <p>
          {signup
            ? "Create an account to start your next project."
            : "Sign in to pick up where you left off."}
        </p>
        <form onSubmit={submit}>
          {signup && (
            <label>
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </label>
          )}
          {signup && (
            <label>
              Mobile number for delivery
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel-national"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                placeholder="10-digit mobile number"
                required
              />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={signup ? 10 : 1}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
              placeholder={signup ? "At least 10 characters" : undefined}
              required
            />
          </label>
          {error && (
            <p className="text-sm text-danger mb-3" role="alert">
              {error}
            </p>
          )}
          <button className="button-primary" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create my account" : "Sign in"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <button
          className="auth-toggle"
          onClick={() => {
            setSignup((v) => !v);
            setError("");
            setPassword("");
          }}
        >
          {signup
            ? "Already a member? Sign in"
            : "New to Matrizo? Create an account"}
        </button>
      </div>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={<p className="empty-state">Loading sign-in…</p>}>
      <LoginForm />
    </Suspense>
  );
}
