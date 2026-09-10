import type { OrderStatus } from '@matrizo/shared';

// Mirrors apps/admin/src/lib/statusColors.ts — same status, same color,
// whichever side of the app you're looking at it from. Warm brand tones
// throughout except the two universal conventions worth keeping — green for
// delivered, red for cancelled.
export const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-brand-purple-100 text-brand-purple-800',
  confirmed: 'bg-brand-orange-100 text-brand-orange-800',
  picked: 'bg-brand-coral-100 text-brand-coral-800',
  dispatched: 'bg-stone-200 text-stone-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};
