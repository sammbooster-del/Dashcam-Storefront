import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAccessShopOrder } from '@workspace/api-client-react';
import type { ShopOrder } from '@workspace/api-client-react';
import { errMsg, isTerminal } from '@/lib/shop';

function useCountdown(iso: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return '0:00';
  return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
}

export function VerificationPanel({ orderId, accessToken, initial, onUpdate }: { orderId: number; accessToken: string; initial?: ShopOrder | null; onUpdate?: (o: ShopOrder) => void }) {
  const access = useAccessShopOrder();
  const accessRef = useRef(access.mutateAsync); accessRef.current = access.mutateAsync;
  const onUpdateRef = useRef(onUpdate); onUpdateRef.current = onUpdate;
  const [order, setOrder] = useState<ShopOrder | null>(initial ?? null);
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const orderRef = useRef(order); orderRef.current = order;
  const left = useCountdown(order?.expiresAt);

  const run = async (data: { action: 'check' | 'method' | 'code' | 'cancel'; method?: 'email' | 'phone'; code?: string }) => {
    try {
      const o = await accessRef.current({ id: orderId, data: { accessToken, ...data } });
      setOrder(o); setErr(''); onUpdateRef.current?.(o); return o;
    } catch (e) { setErr(errMsg(e)); return null; }
  };
  useEffect(() => {
    let stop = false;
    const tick = async () => { if (stop || (orderRef.current && isTerminal(orderRef.current))) return; await run({ action: 'check' }); };
    tick();
    const t = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, accessToken]);

  const act = async (d: Parameters<typeof run>[0]) => { setBusy(true); await run(d); setBusy(false); };
  const st = order?.verificationState;
  return (
    <div className="panel p-6" data-testid="panel-verification" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-semibold">Manual verification</h3>
        {order && !isTerminal(order) && left && <span className="chip" data-testid="text-expiry">Expires in {left}</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">This is a test flow. No money is collected and no message is sent automatically.</p>
      {!order && !err && <div className="mt-6 flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={16} />Loading order status</div>}
      {order && (st === 'waiting' || st === 'requested') && order.status === 'pending' && (
        <div className="mt-6 text-sm" data-testid="state-waiting">
          {st === 'waiting' ? <p className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} />Waiting for the store to open verification for order #{order.id}. Keep this page open.</p>
            : <div><p className="mb-3 font-medium">The store has asked for verification. Choose how you want to be contacted for your test code.</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-ghost" disabled={busy} onClick={() => act({ action: 'method', method: 'email' })} data-testid="button-method-email">Email{order.contactEmail ? ` (${order.contactEmail})` : ''}</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => act({ action: 'method', method: 'phone' })} data-testid="button-method-phone">Phone{order.contactPhone ? ` (${order.contactPhone})` : ''}</button>
              </div></div>}
        </div>)}
      {order && st === 'method_selected' && order.status === 'pending' && <p className="mt-6 flex items-center gap-2 text-sm" data-testid="state-method-selected"><Loader2 className="animate-spin" size={16} />You chose {order.verificationMethod}. Waiting for the store to share a 6-digit test code.</p>}
      {order && (st === 'code_ready' || st === 'invalid_code') && order.status === 'pending' && (
        <form className="mt-6" onSubmit={e => { e.preventDefault(); if (/^\d{6}$/.test(code)) act({ action: 'code', code }).then(() => setCode('')); }}>
          {st === 'invalid_code' && <p role="alert" className="mb-3 text-sm text-destructive" data-testid="text-invalid-code">That code was not accepted. Enter the code the store shared with you again.</p>}
          <label className="lbl" htmlFor="otp">6-digit TEST code from the store</label>
          <input id="otp" className="field mt-2 max-w-[220px] text-center font-mono text-xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} data-testid="input-code" />
          <button className="btn btn-brand mt-3" disabled={busy || code.length !== 6} data-testid="button-submit-code">Submit code</button>
        </form>)}
      {order && st === 'code_submitted' && order.status === 'pending' && <p className="mt-6 flex items-center gap-2 text-sm" data-testid="state-code-submitted"><Loader2 className="animate-spin" size={16} />Code received. Waiting for the store to approve or reject.</p>}
      {order && (st === 'approved' || order.status === 'confirmed' || order.status === 'fulfilled') && <p className="mt-6 text-sm font-medium" data-testid="state-approved">Approved. Order #{order.id} is confirmed (simulated, no payment taken).</p>}
      {order && st === 'declined' && <p className="mt-6 text-sm text-destructive" role="alert" data-testid="state-declined">The store declined this verification. Nothing was charged.</p>}
      {order && (st === 'cancelled' || order.status === 'cancelled') && st !== 'declined' && <p className="mt-6 text-sm" data-testid="state-cancelled">This order was cancelled.</p>}
      {order && (st === 'expired' || order.status === 'expired') && <p className="mt-6 text-sm text-destructive" role="alert" data-testid="state-expired">This verification expired. Please start again.</p>}
      {err && <p role="alert" className="mt-4 text-sm text-destructive" data-testid="text-verify-error">{err}</p>}
      {order && !isTerminal(order) && <button className="btn btn-ghost btn-sm mt-6" disabled={busy} onClick={() => act({ action: 'cancel' })} data-testid="button-cancel-order">Cancel and go back</button>}
    </div>
  );
}
