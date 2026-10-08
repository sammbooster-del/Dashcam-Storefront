import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useAccessShopOrder } from '@workspace/api-client-react';
import type { ShopOrder } from '@workspace/api-client-react';
import { EmptyBlock } from '@/components/Layout';
import { errMsg, forgetOrder, label, loadOrders, money, saveOrder, type SavedOrder } from '@/lib/shop';

type Entry = { saved: SavedOrder; order?: ShopOrder; error?: string };
const safeUrl = (u: string) => /^https?:\/\//i.test(u);

export default function Orders() {
  const access = useAccessShopOrder();
  const accessRef = useRef(access.mutateAsync); accessRef.current = access.mutateAsync;
  const [entries, setEntries] = useState<Entry[]>(() => loadOrders().map(saved => ({ saved })));
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState(''); const [token, setToken] = useState(''); const [formErr, setFormErr] = useState('');

  const fetchOne = async (saved: SavedOrder): Promise<Entry> => {
    try { return { saved, order: await accessRef.current({ id: saved.id, data: { accessToken: saved.accessToken, action: 'check' } }) }; }
    catch (e) { return { saved, error: errMsg(e) }; }
  };
  const loadAll = async () => { setLoading(true); const r = await Promise.all(loadOrders().map(fetchOne)); setEntries(r); setLoading(false); };
  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setFormErr('');
    const n = Number(id); const t = token.trim().toLowerCase();
    if (!Number.isInteger(n) || n <= 0) return setFormErr('Enter the numeric order ID.');
    if (!/^[a-f0-9]{64}$/.test(t)) return setFormErr('The private token is 64 characters, 0-9 and a-f.');
    const entry = await fetchOne({ id: n, accessToken: t });
    if (!entry.order) return setFormErr(entry.error || 'Order not found or token incorrect.');
    saveOrder(entry.saved); setEntries(p => [entry, ...p.filter(x => x.saved.id !== n)]); setId(''); setToken('');
  };
  const copy = (t: string) => navigator.clipboard?.writeText(t).catch(() => undefined);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl font-semibold">My orders</h1>
      <p className="mt-2 text-sm text-muted-foreground">Orders placed here are remembered only on this browser, with a private token. Nobody else can look them up without it.</p>
      {loading && entries.length === 0 ? null : null}
      <div className="mt-8 space-y-4">
        {loading && entries.length > 0 && entries.map(en => <div key={en.saved.id} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        {!loading && entries.length === 0 && <EmptyBlock title="No orders on this browser" text="Place an order or add one from another device below."><Link href="/" className="btn">Browse the shop</Link></EmptyBlock>}
        {!loading && entries.map(({ saved, order, error }) => (
          <article key={saved.id} className="panel p-5" data-testid={`card-order-${saved.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Order #{saved.id}</h2>
              {order && <div className="flex flex-wrap gap-2"><span className="chip" data-testid={`status-order-${saved.id}`}>{label(order.status)}</span><span className="chip">Shipping: {label(order.shippingStatus)}</span></div>}
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
            {order && <>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()} - {order.domain || order.website}</p>
              <ul className="mt-3 text-sm">{order.items.map(i => <li key={i.variantId} className="flex justify-between"><span>{i.name}{i.variantLabel ? ` - ${i.variantLabel}` : ''} x {i.quantity}</span><span>{money(i.unitPriceCents * i.quantity)}</span></li>)}</ul>
              <p className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{money(order.totalCents)}</span></p>
              {(order.carrier || order.trackingNumber) && <p className="mt-2 text-sm" data-testid={`text-tracking-${saved.id}`}>{order.carrier} {order.trackingNumber} {order.trackingUrl && safeUrl(order.trackingUrl) && <a className="underline" href={order.trackingUrl} target="_blank" rel="noopener noreferrer">Track package</a>}</p>}
            </>}
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <button className="underline" onClick={() => copy(saved.accessToken)} data-testid={`button-copy-token-${saved.id}`}>Copy private token (for another device)</button>
              <button className="underline" onClick={() => { forgetOrder(saved.id); setEntries(p => p.filter(x => x.saved.id !== saved.id)); }} data-testid={`button-forget-${saved.id}`}>Remove from this browser</button>
            </div>
          </article>))}
      </div>
      {!loading && entries.length > 0 && <button className="btn btn-ghost btn-sm mt-4" onClick={loadAll} data-testid="button-refresh-orders">Refresh</button>}
      <form onSubmit={add} className="panel mt-10 p-6" data-testid="form-add-order">
        <h2 className="text-xl font-semibold">Track an order from another device</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
          <input className="field" inputMode="numeric" placeholder="Order ID" value={id} onChange={e => setId(e.target.value)} data-testid="input-order-id" />
          <input className="field font-mono text-sm" placeholder="64-character private token" value={token} onChange={e => setToken(e.target.value)} data-testid="input-order-token" />
        </div>
        {formErr && <p role="alert" className="mt-3 text-sm text-destructive" data-testid="text-add-error">{formErr}</p>}
        <button className="btn mt-4" disabled={access.isPending} data-testid="button-add-order">Add order</button>
      </form>
    </div>
  );
}
