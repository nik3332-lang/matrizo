"use client";
import { useEffect, useState } from "react";
import { type Shade, shadeRgb } from "@matrizo/shared";
import { api } from "@/lib/api";
import Image from "next/image";

export function ShadePicker({
  value,
  onChange,
}: {
  value: Shade | null;
  onChange: (shade: Shade) => void;
}) {
  const [shades, setShades] = useState<Shade[]>([]);
  const [family, setFamily] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    setError("");
    api
      .get<{ shades: Shade[] }>("/shades")
      .then((r) => setShades(r.shades))
      .catch(() => setError("Colours could not load."))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    let live = true;
    api
      .get<{ shades: Shade[] }>("/shades")
      .then((r) => {
        if (live) setShades(r.shades);
      })
      .catch(() => {
        if (live) setError("Colours could not load.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  const families = [...new Set(shades.map((s) => s.family))];
  return (
    <section className="my-6 space-y-4" aria-label="Choose colour">
      <h2 className="text-lg font-semibold">Choose Colour</h2>
      {error && (
        <p role="alert">
          {error} <button onClick={load}>Retry</button>
        </p>
      )}
      {loading && <p>Loading colours...</p>}
      <div className="flex flex-wrap gap-3">
        <label>
          Family{" "}
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">All families</option>
            {families.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <input
          aria-label="Search shades"
          placeholder="Search shades"
          className="border rounded p-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {families
        .filter((f) => !family || family === f)
        .map((f) => {
          const visible = shades.filter(
            (s) =>
              s.family === f &&
              `${s.name} ${s.hex}`.toLowerCase().includes(query.toLowerCase()),
          );
          if (!visible.length) return null;
          return (
            <fieldset key={f}>
              <legend className="mb-2 font-medium">{f}</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visible.map((shade) => (
                  <button
                    key={shade.id}
                    type="button"
                    aria-pressed={value?.id === shade.id}
                    onClick={() => onChange(shade)}
                    className="text-left border rounded p-2"
                    style={{
                      outline:
                        value?.id === shade.id
                          ? "2px solid #153747"
                          : undefined,
                    }}
                  >
                    <span
                      className="block h-16 rounded border"
                      style={{ backgroundColor: shade.hex }}
                    />
                    <span className="block text-sm mt-2">{shade.name}</span>
                    <span className="text-xs">{shade.hex}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}
      {!loading &&
        !error &&
        !shades.some(
          (s) =>
            (!family || s.family === family) &&
            `${s.name} ${s.hex}`.toLowerCase().includes(query.toLowerCase()),
        ) && <p>No shades found.</p>}
      {value && (
        <div className="border-t pt-4">
          <div
            aria-label={`${value.name} preview`}
            style={{
              backgroundColor: value.hex,
              height: 150,
              border: "1px solid #aaa",
              borderRadius: 4,
            }}
          />
          {value.imageUrl && (
            <Image
              unoptimized
              width={640}
              height={320}
              src={value.imageUrl}
              alt={value.name}
              className="mt-2 max-h-48 object-contain"
            />
          )}
          <p className="mt-2">
            {value.name} · {value.hex} · RGB {shadeRgb(value.hex)}
          </p>
        </div>
      )}
      <p className="text-xs text-stone-500">
        Screen colours may differ from the final painted finish.
      </p>
    </section>
  );
}
