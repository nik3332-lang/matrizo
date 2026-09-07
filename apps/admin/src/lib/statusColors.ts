import type { OrderStatus } from '@matrizo/shared';

// One color per status, reused everywhere a status shows up (queue list,
// filter chips, order detail badge) so the same status always reads the
// same color across the app. Built from the Matrizo brand scale (purple /
// orange / coral) except the two universal conventions worth keeping —
// green for delivered, red for cancelled.
export const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-brand-purple-100 text-brand-purple-800 ring-brand-purple-200',
  confirmed: 'bg-brand-orange-100 text-brand-orange-800 ring-brand-orange-200',
  picked: 'bg-brand-coral-100 text-brand-coral-800 ring-brand-coral-200',
  dispatched: 'bg-stone-200 text-stone-700 ring-stone-300',
  delivered: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export const STATUS_SOLID_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-brand-purple-600 hover:bg-brand-purple-700',
  confirmed: 'bg-brand-orange-600 hover:bg-brand-orange-700',
  picked: 'bg-brand-coral-600 hover:bg-brand-coral-700',
  dispatched: 'bg-stone-600 hover:bg-stone-700',
  delivered: 'bg-emerald-600 hover:bg-emerald-700',
  cancelled: 'bg-rose-600 hover:bg-rose-700',
};
