import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icon";
export function HeroBanner() {
  return (
    <section className="home-hero" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <span className="eyebrow hero-eyebrow">
          <span className="status-dot" /> YOUR HOME. BEAUTIFULLY SORTED.
        </span>
        <h1 id="hero-heading">
          Great spaces.
          <br />
          Small details.
          <br />
          <em>Delivered.</em>
        </h1>
        <p>
          Sanitary ware, bathroom fittings and paints.
          <br className="hidden sm:block" /> Everything your next project needs,
          all in one place.
        </p>
        <Link href="/shop" className="hero-cta">
          Start exploring <span aria-hidden="true">↗</span>
        </Link>
        <div className="hero-note">
          <Icon name="truck" className="h-4 w-4" /> Local delivery. Thoughtfully
          selected.
        </div>
      </div>
      <div className="hero-photograph">
        <Image
          src="/images/brand/bathroom-editorial.webp"
          alt="A calm contemporary bathroom with ceramic basins, chrome fittings and a walnut vanity"
          fill
          priority
          sizes="(max-width: 700px) 100vw, 58vw"
          className="object-cover"
        />
        <div className="hero-caption">
          <span>THE BATHROOM EDIT</span>
          <span>Make room for better living. ↗</span>
        </div>
      </div>
    </section>
  );
}
