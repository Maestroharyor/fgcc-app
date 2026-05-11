import { tv } from "tailwind-variants";
import type { TrackCategory } from "@/content/tracks";

const badge = tv({
  base: "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
  variants: {
    variant: {
      digital:
        "bg-[var(--color-primary-blue)]/8 text-[var(--color-primary-blue)] ring-1 ring-inset ring-[var(--color-primary-blue)]/15",
      creative:
        "bg-[var(--color-accent-coral)]/8 text-[var(--color-accent-coral)] ring-1 ring-inset ring-[var(--color-accent-coral)]/15",
      vocational:
        "bg-[var(--color-warm-gold)]/12 text-[var(--color-warm-gold-600)] ring-1 ring-inset ring-[var(--color-warm-gold)]/25",
    },
  },
  defaultVariants: { variant: "digital" },
});

export function CategoryBadge({ category }: { category: TrackCategory }) {
  return (
    <span className={badge({ variant: category })}>
      <span className="inline-block h-1 w-1 rounded-full bg-current" />
      {category}
    </span>
  );
}
