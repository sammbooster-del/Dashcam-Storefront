import { Link } from 'wouter';
import type { ShopProduct } from '@workspace/api-client-react';
import { minPrice, money, productImage, totalStock, activeVariants } from '@/lib/shop';

export function ProductCard({ p, i = 0 }: { p: ShopProduct; i?: number }) {
  const out = totalStock(p) <= 0;
  const multi = activeVariants(p).length > 1;
  return (
    <Link href={`/product/${p.slug}`} className="group rise block" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }} data-testid={`card-product-${p.id}`}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        <img src={productImage(p)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {out && <span className="chip absolute left-3 top-3 bg-background">Sold out</span>}
        {!out && p.featured && <span className="chip absolute left-3 top-3 text-white" style={{ background: 'var(--brand)' }}>Featured</span>}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold leading-tight">{p.name}</h3>
        <span className="whitespace-nowrap text-sm font-medium" data-testid={`text-price-${p.id}`}>{multi ? 'From ' : ''}{money(minPrice(p))}</span>
      </div>
    </Link>
  );
}
