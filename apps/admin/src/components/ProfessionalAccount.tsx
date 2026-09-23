"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Professional } from "@matrizo/shared";

export function ProfessionalAccount({
  profile,
  onSaved,
}: {
  profile: Professional & {
    userId: string | null;
    email: string | null;
    active: boolean | null;
  };
  onSaved: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const path = `/team/professionals/${profile.id}/account`;
      if (profile.userId) await api.patch(path, { password });
      else await api.post(path, { email, password });
      setPassword("");
      setMessage(profile.userId ? "Password reset." : "Login created.");
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save login.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="border-t pt-3 space-y-3">
      <h3 className="font-semibold">Employee portal login</h3>
      {profile.userId && (
        <p className="break-all">
          {profile.email} ({profile.active ? "Active" : "Disabled"})
        </p>
      )}
      <form onSubmit={save} className="space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          {!profile.userId && (
            <label className="block">
              Email
              <input
                type="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block border rounded p-2 w-full"
              />
            </label>
          )}
          <label className="block">
            {profile.userId ? "New password" : "Initial password"}
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block border rounded p-2 w-full"
            />
          </label>
          <button className="border rounded px-3 py-2" type="submit">
            {profile.userId ? "Reset password" : "Create login"}
          </button>
        </fieldset>
      </form>
      {profile.userId && (
        <button
          disabled={busy}
          className="underline"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api.patch(`/team/professionals/${profile.id}/account`, {
                active: !profile.active,
              });
              await onSaved();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not update login.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {profile.active ? "Disable login" : "Enable login"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {(profile.projects ?? []).map((project) => (
        <details key={project.id} className="border-t pt-2">
          <summary>{project.name}</summary>
          <p className="whitespace-pre-wrap break-words">
            {project.address || project.locality}
          </p>
          <p>{project.description}</p>
          {project.photos.map((url) => (
            <a
              key={url}
              className="block underline"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              View work photo
            </a>
          ))}
        </details>
      ))}
    </section>
  );
}
