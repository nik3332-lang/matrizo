'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icon, type IconName } from './Icon';

type Slide = {
  slug: string;
  title: string;
  subtitle: string;
  icon: IconName;
  image?: { src: string; alt: string };
};

// Content keyed by category slug, not hardcoded copy per position — a slug
// that doesn't exist in the live catalog (e.g. this list gets ahead of what
// categories/seed data actually has) is filtered out below rather than
// linking somewhere broken. Real photography only where it exists (see the
// category page's CATEGORY_BANNERS), a tinted icon panel otherwise — same
// rule as ProductCard, not a new one.
const SLIDES: Slide[] = [
  {
    slug: 'upvc',
    title: 'UPVC pipes & fittings',
    subtitle: 'ISI-marked pipe, delivered from your nearest dark store.',
    icon: 'pipe',
    image: { src: '/images/upvc-pipes-category.jpg', alt: 'Stacked UPVC pipes' },
  },
  {
    slug: 'sanitary',
    title: 'Sanitary ware & CP fittings',
    subtitle: 'Cera & Hindware commodes, basins and fittings, delivered fast.',
    icon: 'droplet',
  },
  {
    slug: 'paints',
    title: 'Asian Paints & Birla Opus',
    subtitle: 'Interior, exterior and waterproofing — in stock, fast delivery.',
    icon: 'paintRoller',
  },
  {
    slug: 'cpvc',
    title: 'CPVC pipes & fittings',
    subtitle: 'Hot & cold water plumbing line, ready to ship.',
    icon: 'pipe',
  },
];

const INTERVAL_MS = 4500;

// Blinkit's rotating promo strip, scoped to what's actually in the catalog
// (see SLIDES above) rather than generic marketing banners — each slide
// deep-links straight into that category's product grid.
export function HeroBanner({ availableSlugs }: { availableSlugs: string[] }) {
  const slides = SLIDES.filter((s) => availableSlugs.includes(s.slug));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[index % slides.length];

  return (
    <div className="relative rounded-card overflow-hidden border border-line">
      <Link href={`/category/${slide.slug}`} className="block relative h-40 sm:h-56">
        {slide.image ? (
          <Image src={slide.image.src} alt={slide.image.alt} fill priority className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-accent-subtle flex items-center justify-center">
            <Icon name={slide.icon} className="h-16 w-16 text-accent" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="text-white font-medium text-lg sm:text-xl">{slide.title}</div>
          <div className="text-white/85 text-sm mt-0.5 max-w-sm">{slide.subtitle}</div>
        </div>
      </Link>
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.slug}
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.title}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
