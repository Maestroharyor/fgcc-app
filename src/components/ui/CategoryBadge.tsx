import { tv } from "tailwind-variants";
import type { TrackCategory } from "@/content/tracks";

const badge = tv({
  base: "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
  variants: {
    variant: {
      digital: "bg-primary/8 text-primary ring-1 ring-inset ring-primary/15",
      creative: "bg-coral/8 text-coral ring-1 ring-inset ring-coral/15",
      vocational: "bg-gold/12 text-gold-600 ring-1 ring-inset ring-gold/25",
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
