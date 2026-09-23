import Link from "next/link";
import Image from "next/image";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Matrizo home"
      className={`brand-lockup ${light ? "brand-light" : ""}`}
    >
      <Image
        src="/matrizo-logo.jpeg"
        alt="Matrizo"
        width={100}
        height={75}
        className="brand-logo"
      />
      <span>Matrizo</span>
    </Link>
  );
}
