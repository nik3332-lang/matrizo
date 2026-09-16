import Link from "next/link";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Matrizo home"
      className={`brand-lockup ${light ? "brand-light" : ""}`}
    >
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M5 25V8l11 10L27 8v17"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        matrizo<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
