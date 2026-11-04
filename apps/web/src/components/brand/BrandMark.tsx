type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return <img className={className} src="/icon.svg" alt="" width="44" height="44" />;
}
