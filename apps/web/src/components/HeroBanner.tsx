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
    subtitle: 'Pipes, valves and fittings for your next plumbing job.',
    icon: 'pipe',
    image: { src: '/images/catalog/pipes-fittings.png', alt: 'UPVC pipes and fittings' },
  },
  {
    slug: 'sanitary',
    title: 'Sanitary ware & CP fittings',
    subtitle: 'Bathroom essentials, basins and fittings for every project.',
    icon: 'droplet',
  },
  {
    slug: 'paints',
    title: 'Asian Paints & Birla Opus',
    subtitle: 'Paint, primer and waterproofing for a fresh finish.',
    icon: 'paintRoller',
    image: { src: '/images/catalog/paint-supplies.png', alt: 'Paint can and roller' },
  },
  {
    slug: 'cpvc',
    title: 'CPVC pipes & fittings',
    subtitle: 'Hot & cold water plumbing line, ready to ship.',
    icon: 'pipe',
    image: { src: '/images/catalog/pipes-fittings.png', alt: 'CPVC pipes and fittings' },
  },
  {
    slug: 'paint-materials-tools',
    title: 'Paint materials & tools',
    subtitle: 'Putty, sealants, abrasives and prep essentials.',
    icon: 'box',
    image: { src: '/images/catalog/paint-materials.png', alt: 'Putty, sealant and sanding materials' },
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
    <div className="relative rounded-card overflow-hidden border border-line bg-accent-subtle">
      <Link href={`/category/${slide.slug}`} className="block relative h-40 sm:h-48">
        {slide.image ? (
          <Image
            src={slide.image.src}
            alt={slide.image.alt}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 1024px"
            className="object-contain object-right p-3 pl-[42%]"
          />
        ) : (
          <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-center">
            <Icon name={slide.icon} className="h-20 w-20 text-accent" />
          </div>
        )}
        <div className="absolute inset-y-0 left-0 w-3/5 p-5 sm:p-6 flex flex-col justify-center">
          <div className="text-[11px] font-medium uppercase tracking-wide text-accent">Fast delivery</div>
          <div className="mt-1 text-stone-900 font-medium text-lg sm:text-xl">{slide.title}</div>
          <div className="text-stone-600 text-sm mt-1 max-w-xs">{slide.subtitle}</div>
        </div>
      </Link>
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-5 sm:left-6 flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.slug}
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.title}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-accent' : 'w-1.5 bg-accent/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
