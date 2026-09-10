import { twMerge } from 'tailwind-merge';

// NativeWind-on-web renders classNames as literal CSS classes (unlike
// native, where it compiles to inline styles) — so when a component's base
// className and a caller-supplied override className both set e.g. `bg-*`,
// which one wins depends on Tailwind's internal stylesheet order, not the
// order they appear in the className string. Confirmed via a real bug: a
// PressableCard base `bg-white/90` was beating a caller's `bg-brand-orange-600`
// on the web build. twMerge makes "last one wins" deterministic and
// platform-independent, same as it would need to be in any web app stacking
// base + override Tailwind classes.
export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(' '));
}
