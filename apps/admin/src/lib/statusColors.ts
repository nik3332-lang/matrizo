import type { OrderStatus } from '@matrizo/shared';

// One color per status, reused everywhere a status shows up (queue list,
// filter chips, order detail badge) so the same status always reads the
// same color across the app. Warm tones throughout (white/beige/light
// yellow palette) except the two universal conventions worth keeping —
// green for delivered, red for cancelled.
export const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  confirmed: 'bg-amber-100 text-amber-800 ring-amber-200',
  picked: 'bg-orange-100 text-orange-800 ring-orange-200',
  dispatched: 'bg-stone-200 text-stone-700 ring-stone-300',
  delivered: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export const STATUS_SOLID_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-yellow-500 hover:bg-yellow-600',
  confirmed: 'bg-amber-600 hover:bg-amber-700',
  picked: 'bg-orange-600 hover:bg-orange-700',
  dispatched: 'bg-stone-600 hover:bg-stone-700',
  delivered: 'bg-emerald-600 hover:bg-emerald-700',
  cancelled: 'bg-rose-600 hover:bg-rose-700',
};
