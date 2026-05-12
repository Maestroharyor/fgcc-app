import Image from "next/image";

// Four-quadrant Foursquare emblem (cross / cup / dove / crown). Source is the
// 216x216 PNG in `/public/foursquare-logo.png`; same source feeds the favicon
// variants so the brand mark stays consistent everywhere.
//
// `unoptimized` is set so Next serves the raw file rather than a cached
// optimization output (which can lag behind when the source PNG is replaced
// in dev). The asset is 13KB, so we lose nothing meaningful.
interface Props {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 36, className }: Props) {
  return (
    <Image
      src="/foursquare-logo.png"
      alt="Foursquare Gospel Church"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className ?? ""}`}
      priority
      unoptimized
    />
  );
}
