import type { OrderStatus } from '@matrizo/shared';

// One color per status, reused everywhere a status shows up (queue list,
// filter chips, order detail badge) so the same status always reads the
// same color across the app.
export const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-sky-100 text-sky-700 ring-sky-200',
  confirmed: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  picked: 'bg-amber-100 text-amber-700 ring-amber-200',
  dispatched: 'bg-violet-100 text-violet-700 ring-violet-200',
  delivered: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export const STATUS_SOLID_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-sky-600 hover:bg-sky-700',
  confirmed: 'bg-indigo-600 hover:bg-indigo-700',
  picked: 'bg-amber-600 hover:bg-amber-700',
  dispatched: 'bg-violet-600 hover:bg-violet-700',
  delivered: 'bg-emerald-600 hover:bg-emerald-700',
  cancelled: 'bg-rose-600 hover:bg-rose-700',
};
