import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import { Minus, Plus } from 'lucide-react';
import { useGetShopCatalog } from '@workspace/api-client-react';
import { EmptyBlock, ErrorBlock, Skeletons } from '@/components/Layout';
import { AcceptedCards } from '@/components/AcceptedCards';
import { activeVariants, imgUrl, money, useCart } from '@/lib/shop';
import { useToast } from '@/hooks/use-toast';

export default function Product() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError, error, refetch } = useGetShopCatalog();
  const cart = useCart();
  const { toast } = useToast();
  const p = data?.products.find(x => x.slug === slug && x.active);
  const variants = p ? activeVariants(p) : [];
  const [vid, setVid] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  useEffect(() => { setVid(null); setQty(1); setImg(0); }, [slug]);
  useEffect(() => { if (p && vid === null && variants.length) setVid((variants.find(v => v.availableStock > 0) ?? variants[0]).id); }, [p, vid, variants]);
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-10"><Skeletons n={2} /></div>;
  if (isError) return <div className="px-4 py-16"><ErrorBlock message={error instanceof Error ? error.message : 'Could not load.'} onRetry={() => refetch()} /></div>;
  if (!p) return <div className="px-4 py-16"><EmptyBlock title="Product not found" text="It may have been removed."><Link href="/" className="btn">Back to the shop</Link></EmptyBlock></div>;
  const v = variants.find(x => x.id === vid);
  const inCart = cart.lines.find(l => l.variantId === v?.id)?.quantity ?? 0;
  const room = v ? Math.max(0, Math.min(99, v.availableStock) - inCart) : 0;
  const cat = data?.categories.find(c => c.id === p.categoryId);
  const imgs = p.imageUrls.length ? p.imageUrls : [''];
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden rounded-3xl bg-muted"><img src={imgUrl(imgs[img])} alt={p.name} className="h-full w-full object-cover" data-testid="img-product-main" /></div>
        {imgs.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{imgs.map((u, i) => <button key={i} onClick={() => setImg(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${i === img ? '' : 'border-transparent opacity-70'}`} style={i === img ? { borderColor: 'var(--brand)' } : undefined} data-testid={`button-thumb-${i}`}><img src={imgUrl(u)} alt="" className="h-full w-full object-cover" /></button>)}</div>}
      </div>
      <div>
        {cat && <Link href={`/category/${cat.slug}`} className="chip">{cat.name}</Link>}
        <h1 className="display mt-3 text-4xl font-semibold md:text-5xl" data-testid="text-product-name">{p.name}</h1>
        <p className="mt-4 text-3xl font-semibold" data-testid="text-product-price">{v ? money(v.priceCents) : 'Unavailable'}</p>
        <p className="mt-5 whitespace-pre-line text-muted-foreground">{p.description}</p>
        {variants.length > 1 && <div className="mt-7"><span className="lbl">Option</span><div className="mt-2 flex flex-wrap gap-2">{variants.map(x => <button key={x.id} disabled={x.availableStock <= 0} onClick={() => { setVid(x.id); setQty(1); }} className={`btn btn-sm ${x.id === vid ? '' : 'btn-ghost'}`} data-testid={`button-variant-${x.id}`}>{x.label}{x.availableStock <= 0 ? ' (sold out)' : ''}</button>)}</div></div>}
        {v && <p className="mt-4 text-sm text-muted-foreground" data-testid="text-stock">{v.availableStock <= 0 ? 'Sold out' : v.availableStock <= 5 ? `Only ${v.availableStock} left` : 'In stock'}{inCart > 0 ? `, ${inCart} in your cart` : ''}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center rounded-full border">
            <button className="grid h-12 w-12 place-items-center disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="Decrease" data-testid="button-qty-minus"><Minus size={16} /></button>
            <span className="w-8 text-center font-semibold" data-testid="text-qty">{Math.min(qty, Math.max(room, 1))}</span>
            <button className="grid h-12 w-12 place-items-center disabled:opacity-40" disabled={qty >= room} onClick={() => setQty(qty + 1)} aria-label="Increase" data-testid="button-qty-plus"><Plus size={16} /></button>
          </div>
          <button className="btn btn-brand" disabled={!v || room <= 0} onClick={() => { if (!v) return; const n = Math.min(qty, room); cart.add(v.id, n, v.availableStock); setQty(1); toast({ title: 'Added to cart', description: `${p.name}${variants.length > 1 ? ` - ${v.label}` : ''} x ${n}` }); }} data-testid="button-add-to-cart">{room <= 0 && v && v.availableStock > 0 ? 'Max quantity in cart' : v && v.availableStock <= 0 ? 'Sold out' : 'Add to cart'}</button>
        </div>
        <div className="mt-6"><AcceptedCards location="product" /></div>
      </div>
    </div>
  );
}
