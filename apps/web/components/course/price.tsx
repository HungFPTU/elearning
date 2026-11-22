import { formatVnd } from '@elearning/shared';

export function Price({ price, salePrice }: { price: number; salePrice: number | null }) {
  if (salePrice === null || salePrice >= price) {
    return <span className="font-semibold">{price === 0 ? 'Miễn phí' : formatVnd(price)}</span>;
  }
  return (
    <span className="flex items-baseline gap-2">
      <span className="font-semibold">{formatVnd(salePrice)}</span>
      <span className="text-sm text-slate-400 line-through">{formatVnd(price)}</span>
    </span>
  );
}
