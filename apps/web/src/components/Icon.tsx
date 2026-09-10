'use client';

// Small hand-drawn icon set (plain SVG, no external dependency) — replaces
// emoji glyphs across the app. Emoji render inconsistently across platforms
// and read as placeholder/prototype content; these are a single consistent
// stroke-based style tuned to the brand palette.
//
// Deliberately a switch inside the component (not a module-level object of
// JSX literals) — the object-of-JSX form broke specifically on the OpenNext/
// Cloudflare Workers deploy for routes with `export const runtime = 'edge'`
// (TypeError: Cannot read properties of undefined (reading 'default'), only
// in production, only on edge-runtime routes) even though it rendered fine
// on non-edge routes; this form is confirmed to avoid that.
export type IconName =
  | 'truck'
  | 'badgeCheck'
  | 'package'
  | 'cash'
  | 'pipe'
  | 'paintRoller'
  | 'box'
  | 'mapPin'
  | 'chevronLeft'
  | 'cart'
  | 'user'
  | 'receipt'
  | 'logout'
  | 'search';

function iconPath(name: IconName) {
  switch (name) {
    case 'truck':
      return (
        <>
          <rect x="1.5" y="7" width="11" height="9" rx="1" />
          <path d="M12.5 10h4l3 3.2V16h-2" />
          <circle cx="6" cy="18" r="1.8" />
          <circle cx="16" cy="18" r="1.8" />
          <path d="M8 18h6" />
        </>
      );
    case 'badgeCheck':
      return (
        <>
          <path d="M12 2.5l2.2 1.3 2.5-.3 1 2.3 2.3 1-.3 2.5 1.3 2.2-1.3 2.2.3 2.5-2.3 1-1 2.3-2.5-.3L12 21.5l-2.2-1.3-2.5.3-1-2.3-2.3-1 .3-2.5L3 12l1.3-2.2-.3-2.5 2.3-1 1-2.3 2.5.3z" />
          <path d="M8.5 12.2l2.2 2.2 4.3-4.6" />
        </>
      );
    case 'package':
      return (
        <>
          <path d="M3 7.5l9-4.5 9 4.5-9 4.5-9-4.5z" />
          <path d="M3 7.5V16l9 4.5 9-4.5V7.5" />
          <path d="M12 12v8.5" />
        </>
      );
    case 'cash':
      return (
        <>
          <rect x="2" y="6" width="20" height="12" rx="1.5" />
          <circle cx="12" cy="12" r="3" />
          <path d="M6 8v0M18 16v0" />
        </>
      );
    case 'pipe':
      return (
        <>
          <rect x="2" y="9" width="9" height="6" rx="1" />
          <rect x="13" y="4" width="9" height="6" rx="1" />
          <path d="M6.5 9V6a1 1 0 011-1h4M17.5 10v3a1 1 0 01-1 1h-4" />
        </>
      );
    case 'paintRoller':
      return (
        <>
          <rect x="3" y="4" width="14" height="6" rx="1.5" />
          <path d="M8 10v3a1.5 1.5 0 001.5 1.5H10a1.5 1.5 0 011.5 1.5V21" />
          <rect x="9.5" y="14.5" width="4" height="3" rx="0.8" />
        </>
      );
    case 'box':
      return (
        <>
          <path d="M3 7.5l9-4.5 9 4.5-9 4.5-9-4.5z" />
          <path d="M3 7.5V16l9 4.5 9-4.5V7.5" />
          <path d="M12 12v8.5" />
        </>
      );
    case 'mapPin':
      return (
        <>
          <path d="M12 21s7-6.4 7-12a7 7 0 10-14 0c0 5.6 7 12 7 12z" />
          <circle cx="12" cy="9" r="2.4" />
        </>
      );
    case 'chevronLeft':
      return <path d="M14.5 4.5L7 12l7.5 7.5" />;
    case 'cart':
      return (
        <>
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="17" cy="20" r="1.4" />
          <path d="M2.5 3h2l2.3 11.4a1.8 1.8 0 001.8 1.5h7.6a1.8 1.8 0 001.75-1.4L20 7.5H6" />
        </>
      );
    case 'user':
      return (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20.5a7.5 7.5 0 0115 0" />
        </>
      );
    case 'receipt':
      return (
        <>
          <path d="M6 2.5h12v19l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V2.5z" />
          <path d="M9 7h6M9 10.5h6M9 14h4" />
        </>
      );
    case 'logout':
      return (
        <>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </>
      );
    case 'search':
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M20 20l-5-5" />
        </>
      );
  }
}

export function Icon({ name, className = 'h-6 w-6' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {iconPath(name)}
    </svg>
  );
}

// Category slug -> icon, with a generic fallback for any category an admin
// adds later that isn't one of these three yet.
export function categoryIcon(slug: string): IconName {
  if (slug === 'upvc' || slug === 'cpvc') return 'pipe';
  if (slug === 'paints') return 'paintRoller';
  return 'box';
}
