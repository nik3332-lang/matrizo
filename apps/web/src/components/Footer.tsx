export function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200/60 bg-white/40">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-bold text-lg text-stone-900">Matrizo</div>
          <p className="text-sm text-stone-500">Sanitary ware & paints, delivered from your nearest dark store.</p>
        </div>
        <p className="text-xs text-stone-400">© {new Date().getFullYear()} Matrizo. All rights reserved.</p>
      </div>
    </footer>
  );
}
