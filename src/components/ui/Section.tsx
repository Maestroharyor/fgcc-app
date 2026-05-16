import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  contentClassName,
}: Props) {
  return (
    <section
      id={id}
      className={cn("relative px-6 sm:px-10 py-16 sm:py-24", className)}
    >
      <div className={cn("mx-auto max-w-6xl", contentClassName)}>
        {(eyebrow || title || description) && (
          <div className="mb-10 sm:mb-14 max-w-2xl">
            {eyebrow && (
              <span className="inline-block rounded-full border border-gold/60 bg-gold/30 px-3.5 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-navy">
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-navy leading-[1.05]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-navy/70">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
