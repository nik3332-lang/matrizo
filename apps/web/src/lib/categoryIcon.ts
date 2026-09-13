import type { IconName } from '@/components/Icon';

// Pure mapping logic, split out of components/Icon.tsx on purpose: that
// file is 'use client' (see its comment), which means every export from
// it — including plain functions, not just the component — becomes
// unusable from a server component. STAGE 6's server-rendered product/
// category pages need to call this directly, so it lives here instead.
export function categoryIcon(slug: string): IconName {
  if (slug === 'upvc' || slug === 'cpvc') return 'pipe';
  if (slug === 'paints') return 'paintRoller';
  return 'box';
}
