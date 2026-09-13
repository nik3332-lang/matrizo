import type { OrderStatus } from '@matrizo/shared';

// One neutral chip for every in-progress status — placed/confirmed/picked/
// dispatched don't need to be told apart by color, just by label. Color is
// reserved for the two states worth flagging at a glance: delivered
// (success) and cancelled (danger). Used to be a different hue per status
// (purple/orange/coral/stone); that was decoration STAGE 2 retired — see
// apps/web/src/app/globals.css for the --color-success/--color-danger
// tokens this now reads from. apps/admin's copy of this file intentionally
// keeps the old per-status palette for now (internal tool, out of scope
// for this pass) — the two have diverged on purpose.
export const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-stone-100 text-stone-700',
  confirmed: 'bg-stone-100 text-stone-700',
  picked: 'bg-stone-100 text-stone-700',
  dispatched: 'bg-stone-100 text-stone-700',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
};
