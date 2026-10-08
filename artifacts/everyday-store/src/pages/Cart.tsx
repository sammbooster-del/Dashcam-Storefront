import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useGetShopCatalog, useQuoteShopCart } from '@workspace/api-client-react';
import type { ShopQuote } from '@workspace/api-client-react';
import { EmptyBlock, ErrorBlock, Skeletons } from '@/components/Layout';
import { errMsg, imgUrl, money, useCart } from '@/lib/shop';

export default function Cart() {
  const { data, isLoading, isError, error, refetch } = useGetShopCatalog();
  const cart = useCart();
  const quote = useQuoteShopCart();
  const quoteRef = useRef(quote.mutate); quoteRef.current = quote.mutate;
  const [q, setQ] = useState<ShopQuote | null>(null);
  const [qErr, setQErr] = useState('');
  const [code, setCode] = useState(cart.coupon);
  const variants = useMemo(() => {
    const m = new Map<number, { p: NonNullable<typeof data>['products'][number]; v: NonNullable<typeof data>['products'][number]['variants'][number] }>();
    data?.products.forEach(p => p.variants.forEach(v => m.set(v.id, { p, v })));
    return m;
  }, [data]);
  // Bound quantities by availableStock and drop lines that no longer exist.
  useEffect(() => {
    if (!data) return;
    cart.lines.forEach(l => {
      const e = variants.get(l.variantId);
      if (!e || !e.p.active || !e.v.active || e.v.availableStock <= 0) cart.remove(l.variantId);
      else if (l.quantity > Math.min(99, e.v.availableStock)) cart.setQty(l.variantId, Math.min(99, e.v.availableStock));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const key = JSON.stringify([cart.lines, cart.coupon]);
  useEffect(() => {
    if (!cart.lines.length) { setQ(null); setQErr(''); return; }
    quoteRef.current({ data: { items: cart.lines, ...(cart.coupon ? { discountCode: cart.coupon } : {}) } }, {
      onSuccess: r => { setQ(r); setQErr(''); }, onError: e => { setQErr(errMsg(e)); },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-10"><Skeletons n={2} /></div>;
  if (isError) return <div className="px-4 py-16"><ErrorBlock message={error instanceof Error ? error.message : 'Could not load.'} onRetry={() => refetch()} /></div>;
  if (!cart.lines.length) return <div className="px-4 py-16"><EmptyBlock title="Your cart is empty" text="Add something practical and it will wait here, saved on this browser."><Link href="/" className="btn btn-brand" data-testid="link-continue">Start browsing</Link></EmptyBlock></div>;
  const s = data?.settings;
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-4xl font-semibold">Cart</h1>
        <ul className="mt-6 divide-y">
          {cart.lines.map(l => { const e = variants.get(l.variantId); if (!e) return null; const max = Math.min(99, e.v.availableStock); return (
            <li key={l.variantId} className="flex gap-4 py-5" data-testid={`row-cart-${l.variantId}`}>
              <Link href={`/product/${e.p.slug}`}><img src={imgUrl(e.p.imageUrls[0])} alt="" className="h-24 w-24 rounded-2xl bg-muted object-cover" /></Link>
              <div className="flex-1">
                <div className="flex justify-between gap-2"><div><Link href={`/product/${e.p.slug}`} className="font-semibold">{e.p.name}</Link><p className="text-sm text-muted-foreground">{e.v.label}</p></div><span className="font-medium">{money(e.v.priceCents * l.quantity)}</span></div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-9 items-center rounded-full border">
                    <button className="grid h-9 w-9 place-items-center" onClick={() => cart.setQty(l.variantId, l.quantity - 1)} aria-label="Decrease" data-testid={`button-dec-${l.variantId}`}><Minus size={14} /></button>
                    <span className="w-7 text-center text-sm font-semibold" data-testid={`text-qty-${l.variantId}`}>{l.quantity}</span>
                    <button className="grid h-9 w-9 place-items-center disabled:opacity-40" disabled={l.quantity >= max} onClick={() => cart.setQty(l.variantId, l.quantity + 1)} aria-label="Increase" data-testid={`button-inc-${l.variantId}`}><Plus size={14} /></button>
                  </div>
                  <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => cart.remove(l.variantId)} data-testid={`button-remove-${l.variantId}`}><Trash2 size={14} />Remove</button>
                  {l.quantity >= max && <span className="text-xs text-muted-foreground">Max available</span>}
                </div>
              </div>
            </li>); })}
        </ul>
      </div>
      <aside className="panel h-fit p-6 md:sticky md:top-24">
        <h2 className="text-xl font-semibold">Summary</h2>
        <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); cart.setCoupon(code.trim()); }}>
          <input className="field" placeholder="Discount code" value={code} onChange={e => setCode(e.target.value)} maxLength={40} data-testid="input-coupon" />
          <button className="btn btn-ghost btn-sm h-12" data-testid="button-apply-coupon">Apply</button>
        </form>
        {qErr ? <p role="alert" className="mt-4 text-sm text-destructive" data-testid="text-quote-error">{qErr}</p> : q ? (
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd data-testid="text-subtotal">{money(q.subtotalCents)}</dd></div>
            {q.discountCents > 0 && <div className="flex justify-between"><dt>Discount{cart.coupon ? ` (${cart.coupon})` : ''}</dt><dd data-testid="text-discount">-{money(q.discountCents)}</dd></div>}
            {cart.coupon && q.discountCents === 0 && <p className="text-xs text-muted-foreground">That code did not change the total.</p>}
            <div className="flex justify-between"><dt>Shipping</dt><dd data-testid="text-shipping">{q.shippingCents === 0 ? 'Free' : money(q.shippingCents)}</dd></div>
            <div className="flex justify-between border-t pt-3 text-lg font-semibold"><dt>Total</dt><dd data-testid="text-total">{money(q.totalCents)}</dd></div>
            {s && s.shippingThresholdCents > 0 && q.shippingCents > 0 && <p className="text-xs text-muted-foreground">Free shipping over {money(s.shippingThresholdCents)}.</p>}
          </dl>
        ) : <div className="mt-5 space-y-2"><div className="h-4 animate-pulse rounded bg-muted" /><div className="h-4 animate-pulse rounded bg-muted" /><div className="h-6 animate-pulse rounded bg-muted" /></div>}
      </aside>
    </div>
  );
}
