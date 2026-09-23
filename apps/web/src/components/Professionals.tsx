"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Professional } from "@matrizo/shared";
import { api } from "@/lib/api";
export function Professionals({
  kind,
  id,
}: {
  kind: Professional["kind"];
  id?: string;
}) {
  const [profiles, setProfiles] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const path = id
    ? `/professionals/${encodeURIComponent(id)}`
    : `/professionals?kind=${kind}`;
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const response = await api.get<{
          profile?: Professional;
          professionals?: Professional[];
        }>(path);
        if (live) {
          setProfiles(
            response.profile
              ? [response.profile]
              : (response.professionals ?? []),
          );
          setError("");
        }
      } catch {
        if (live) setError("Profiles could not load.");
      } finally {
        if (live) setLoading(false);
      }
    }
    void load();
    window.addEventListener("focus", load);
    return () => {
      live = false;
      window.removeEventListener("focus", load);
    };
  }, [path]);
  if (loading) return <p>Loading profiles...</p>;
  if (error)
    return (
      <p role="alert">
        {error} <button onClick={() => window.location.reload()}>Retry</button>
      </p>
    );
  const rows = profiles.filter((p) => p.kind === kind);
  if (id && !rows.length) return <p>Profile not found.</p>;
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {id ? rows[0].name : kind === "painter" ? "Painters" : "Plumbers"}
      </h1>
      {id && <Link href={`/${kind}s`}>All {kind}s</Link>}
      {!rows.length && <p>No {kind}s listed yet.</p>}
      <div
        className={
          id ? "space-y-5" : "grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        }
      >
        {rows.map((p) => (
          <article
            key={p.id}
            className={id ? "space-y-5" : "border rounded p-4 space-y-3"}
          >
            <Link href={`/${kind}s/${p.id}`}>
              <Image
                unoptimized
                width={640}
                height={320}
                src={p.photoUrl}
                alt={p.name}
                style={{
                  width: "100%",
                  height: id ? 320 : 220,
                  objectFit: "cover",
                  borderRadius: 4,
                }}
              />
              <h2 className="text-lg font-semibold mt-3">{p.name}</h2>
            </Link>
            <p>{p.yearsExperience} years of experience</p>
            {id && (
              <>
                <h2 className="text-xl font-semibold">Past work</h2>
                {!p.workPhotos.length && <p>No work photos added yet.</p>}
                <div className="grid sm:grid-cols-2 gap-4">
                  {p.workPhotos.map((url, i) => (
                    <a
                      key={`${url}-${i}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Image
                        unoptimized
                        width={640}
                        height={480}
                        src={url}
                        alt={`${p.name}: completed work ${i + 1}`}
                        style={{
                          width: "100%",
                          height: 260,
                          objectFit: "cover",
                          borderRadius: 4,
                        }}
                      />
                    </a>
                  ))}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
