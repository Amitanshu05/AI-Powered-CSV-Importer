// src/lib/ui.ts
// Shared visual language so every surface/interactive element uses the same
// elevation, radius, and motion — defined once, reused everywhere.
export const cardSurface =
  "rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow duration-200";

export const cardPadding = "p-6 sm:p-8";

// For cards that should visibly lift on hover (interactive surfaces only —
// not applied to static summary cards, which shouldn't feel clickable)
export const cardSurfaceInteractive = `${cardSurface} hover:shadow-md`;